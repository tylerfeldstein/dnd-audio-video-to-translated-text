"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { triggerMediaTranscription } from "@/inngest/functions/transcribe";

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

interface UploadChunkResult {
  success: boolean;
  storageId?: Id<"_storage">;
  error?: string;
}

interface UploadConfig {
  useChunking?: boolean;
  chunkSize?: number;
}

/**
 * Helper function to upload a file in chunks
 */
async function uploadFileInChunks(
  file: File,
  convex: ConvexHttpClient,
  config: UploadConfig = {}
): Promise<UploadChunkResult> {
  // Set default config values
  const useChunking = config.useChunking !== undefined ? config.useChunking : true;
  const chunkSize = config.chunkSize || DEFAULT_CHUNK_SIZE;
  
  try {
    // For small files or if chunking is disabled, use the regular upload method
    if (!useChunking || file.size <= chunkSize) {
      console.log(`Uploading file (${file.size} bytes) directly, chunking ${useChunking ? 'enabled' : 'disabled'}`);
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
    
    // For larger files with chunking enabled, implement chunked uploads
    console.log(`Uploading large file (${file.size} bytes) in chunks of ${chunkSize} bytes`);
    
    // 1. Initialize the chunked upload
    const initResult = await convex.mutation(api.files.initMultipartUpload, { 
      numChunks: Math.ceil(file.size / chunkSize) 
    });
    
    if (!initResult.success || !initResult.uploadId) {
      throw new Error(`Failed to initialize multipart upload: ${initResult.error || "Unknown error"}`);
    }
    
    const { uploadId } = initResult;
    console.log(`Multipart upload initialized with ID: ${uploadId}`);
    
    // 2. Upload each chunk
    const totalChunks = Math.ceil(file.size / chunkSize);
    let finalStorageId: Id<"_storage"> | undefined;
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      // Retry mechanism for chunk uploads
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;
      
      while (attempts < maxAttempts && !success) {
        try {
          attempts++;
          
          // Get a URL for this specific chunk
          const chunkResult = await convex.mutation(api.files.getMultipartUploadUrl, {
            uploadId,
            chunkIndex,
          });
          
          // Upload the chunk to the URL
          const uploadResult = await fetch(chunkResult.uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: chunk,
          });
          
          if (!uploadResult.ok) {
            const errorText = await uploadResult.text().catch(() => uploadResult.statusText);
            throw new Error(`Chunk ${chunkIndex} upload failed: ${errorText || uploadResult.statusText}`);
          }
          
          // Get the storageId from the response
          const response = await uploadResult.json();
          const storageId = response.storageId as Id<"_storage">;
          
          // Save the storageId for this chunk
          await convex.mutation(api.files.saveChunkStorageId, {
            chunkId: chunkResult.chunkId,
            storageId: storageId
          });
          
          console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
          
          // If this is the first chunk, store its ID for later use
          if (chunkIndex === 0) {
            finalStorageId = storageId;
          }
          
          success = true;
        } catch (error) {
          console.error(`Error uploading chunk ${chunkIndex} (attempt ${attempts}/${maxAttempts}):`, error);
          if (attempts >= maxAttempts) {
            throw error;
          }
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (!finalStorageId) {
      throw new Error("Failed to capture any chunk storage IDs");
    }
    
    // 3. Complete the multipart upload with the first chunk's storageId
    console.log(`All chunks uploaded, completing multipart upload...`);
    const completeResult = await convex.mutation(api.files.completeMultipartUpload, {
      uploadId,
      contentType: file.type,
      storageId: finalStorageId
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
    
    // Get chunking options from the formData
    const useChunking = formData.get("useChunking") === "true";
    const chunkSizeStr = formData.get("chunkSize") as string;
    const chunkSize = chunkSizeStr ? parseInt(chunkSizeStr, 10) : undefined;

    // Create the upload config
    const uploadConfig: UploadConfig = {
      useChunking,
      chunkSize
    };

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
    console.log(`Upload config: useChunking=${useChunking}, chunkSize=${chunkSize || DEFAULT_CHUNK_SIZE} bytes`);
    
    // Upload the file using the chunked upload method with the provided config
    const uploadResult = await uploadFileInChunks(file, convex, uploadConfig);
    
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