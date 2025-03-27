"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { triggerMediaTranscription } from "@/inngest/functions/transcribe";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

interface UploadChunkResult {
  success: boolean;
  storageId?: Id<"_storage">;
  error?: string;
}

/**
 * Helper function to upload a file in chunks
 */
async function uploadFileInChunks(
  file: File,
  convex: ConvexHttpClient
): Promise<UploadChunkResult> {
  try {
    // For small files (< 5MB), use the regular upload method
    if (file.size <= CHUNK_SIZE) {
      console.log(`Uploading small file (${file.size} bytes) directly`);
      const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {});
      
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!uploadResult.ok) {
        throw new Error(`Upload failed: ${uploadResult.statusText}`);
      }
      
      const response = await uploadResult.json();
      return { 
        success: true,
        storageId: response.storageId
      };
    }
    
    // For larger files, implement chunked uploads
    console.log(`Uploading large file (${file.size} bytes) in chunks of ${CHUNK_SIZE} bytes`);
    
    // 1. Initialize the chunked upload (get a multipart upload ID)
    const initResult = await convex.mutation(api.files.initMultipartUpload, { numChunks: Math.ceil(file.size / CHUNK_SIZE) });
    
    if (!initResult.success || !initResult.uploadId) {
      throw new Error(`Failed to initialize multipart upload: ${initResult.error || "Unknown error"}`);
    }
    
    const { uploadId } = initResult;
    console.log(`Multipart upload initialized with ID: ${uploadId}`);
    
    // 2. Upload each chunk
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      try {
        // Get a URL for this specific chunk
        const chunkUploadUrl = await convex.mutation(api.files.getMultipartUploadUrl, {
          uploadId,
          chunkIndex,
        });
        
        // Upload the chunk to the URL
        const chunkUploadResult = await fetch(chunkUploadUrl, {
          method: "PUT", // Multipart uploads use PUT
          body: chunk,
        });
        
        if (!chunkUploadResult.ok) {
          throw new Error(`Chunk ${chunkIndex} upload failed: ${chunkUploadResult.statusText}`);
        }
        
        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
      } catch (error) {
        console.error(`Error uploading chunk ${chunkIndex}:`, error);
        throw error;
      }
    }
    
    // 3. Complete the multipart upload
    console.log(`All chunks uploaded, completing multipart upload...`);
    const completeResult = await convex.mutation(api.files.completeMultipartUpload, {
      uploadId,
      contentType: file.type,
    });
    
    if (!completeResult.success || !completeResult.storageId) {
      throw new Error(`Failed to complete multipart upload: ${completeResult.error || "Unknown error"}`);
    }
    
    return {
      success: true,
      storageId: completeResult.storageId
    };
  } catch (error) {
    console.error("Error in uploadFileInChunks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Server action to upload a media file to Convex storage and save metadata
 */
export async function uploadMediaToConvex(formData: FormData) {
  // Create a Convex client outside the try block
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  let storageId: Id<"_storage"> | null = null;
  let mediaId: Id<"media"> | null = null;

  try {
    // Get the file and userId from the formData
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      throw new Error("No file provided");
    }
    if (!userId) {
      throw new Error("No user ID provided");
    }
    if (!file.type.includes("audio") && !file.type.includes("video")) {
      throw new Error("Only audio and video files are supported");
    }

    console.log(`Starting upload for file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    
    // Upload the file using the chunked upload method
    const uploadResult = await uploadFileInChunks(file, convex);
    
    if (!uploadResult.success || !uploadResult.storageId) {
      throw new Error(`Failed to upload file: ${uploadResult.error || "Unknown error"}`);
    }
    
    storageId = uploadResult.storageId;
    console.log(`File uploaded successfully, storageId: ${storageId}`);

    // Save the media metadata to the media table
    const result = await convex.mutation(api.media.saveMedia, {
      name: file.name,
      fileId: storageId,
      size: file.size,
      mimeType: file.type,
      description: `Media file of type ${file.type.split('/')[0]}`,
      userId,
    });

    mediaId = result.mediaId;
    console.log(`Media metadata saved, mediaId: ${mediaId}`);

    // Trigger the transcription workflow
    await triggerMediaTranscription(
      mediaId as string,
      storageId as string,
      userId
    );

    return {
      success: true,
      mediaId,
      message: "File uploaded successfully and transcription started.",
    };
  } catch (error) {
    console.error("Error in uploadMediaToConvex:", error);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
} 