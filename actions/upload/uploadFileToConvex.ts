"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel"; // Import Id type

// Import Inngest client and events
import { inngest } from "@/inngest/client";
import Events from "@/inngest/functions/converterBot/constants";

/**
 * Server action to upload a file to Convex storage, save metadata, and trigger Inngest processing.
 */
export async function uploadFileToConvex(formData: FormData) {
  // Create a Convex client outside the try block to ensure it's always available for cleanup/logging if needed
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  let storageId: Id<"_storage"> | null = null; // Keep track of storageId for potential cleanup
  let receiptId: Id<"receipts"> | null = null; // Keep track of receiptId

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
    if (!file.type.includes("pdf")) {
      throw new Error("Only PDF files are supported");
    }

    // 1. Get a temporary upload URL from Convex
    const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {});

    // 2. Upload the file directly to Convex storage
    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadResult.ok) {
      throw new Error(`Failed to upload file to storage: ${uploadResult.statusText}`);
    }

    // Get the storage ID from the response
    const storageResponse = await uploadResult.json();
    storageId = storageResponse.storageId as Id<"_storage">; // Assign storageId

    // 3. Save the receipt metadata to the receipts table
    const saveResult = await convex.mutation(api.files.saveReceipt, {
      userId,
      fileName: file.name,
      fileDisplayName: getDisplayName(file.name),
      fileId: storageId,
      size: file.size,
      mimeType: file.type,
      status: 'pending', // Start as pending
      items: [], // Empty array for items initially
    });

    receiptId = saveResult.receiptId; // Assign receiptId

    // 4. Get the file URL using the storage ID
    const fileUrl = await convex.query(api.files.getFileUrl, { storageId });

    if (!fileUrl) {
      // This case is unlikely if upload and save succeeded, but handle it
      console.warn(`Could not retrieve URL for storageId: ${storageId}. Skipping Inngest trigger.`);
      // Update status to error using the dedicated status mutation
      if (receiptId) {
        await convex.mutation(api.files.updateReceiptStatus, {
          receiptId,
          status: 'error',
          errorMessage: 'Failed to get file URL'
        });
      }
      return {
        success: true, // Upload succeeded, but processing trigger failed
        receiptId,
        message: "File uploaded, but could not start processing.",
      };
    }

    // 5. Trigger the Inngest function
    try {
      await inngest.send({
        name: Events.EXTRACT_DATA_FROM_PDF_AND_SAVE_TO_DB,
        data: {
          receiptId: receiptId, // Pass the receipt ID
          url: fileUrl,       // Pass the file URL
        },
        user: { id: userId }, // Optionally pass user info
      });
      console.log(`Inngest event sent for receiptId: ${receiptId}`);
    } catch (inngestError) {
      console.error("Error sending event to Inngest:", inngestError);
      // Update status to error using the dedicated status mutation
      if (receiptId) {
        await convex.mutation(api.files.updateReceiptStatus, {
          receiptId,
          status: 'error',
          errorMessage: 'Failed to trigger Inngest'
        });
      }
      return {
        success: true, // Upload succeeded, but processing trigger failed
        receiptId,
        message: "File uploaded, but failed to start processing via Inngest.",
      };
    }

    // Update receipt status to 'processing' using the dedicated status mutation
    await convex.mutation(api.files.updateReceiptStatus, {
      receiptId,
      status: 'processing'
    }); // No more 'as any' cast!

    return {
      success: true,
      receiptId,
      message: "File uploaded and processing started via Inngest.",
    };
  } catch (error) {
    console.error("Error in uploadFileToConvex:", error);

    // Update status to error using the dedicated status mutation if receiptId exists
    if (receiptId) {
      try {
        await convex.mutation(api.files.updateReceiptStatus, {
          receiptId,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : "Upload/Processing failed"
        });
      } catch (updateError) {
        console.error("Failed to update receipt status to error:", updateError);
      }
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

/**
 * Generate a user-friendly display name from the file name
 */
function getDisplayName(fileName: string): string {
  // Remove file extension
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");

  // Replace underscores and hyphens with spaces
  const nameWithSpaces = nameWithoutExtension.replace(/[_-]/g, " ");

  // Capitalize first letter of each word
  return nameWithSpaces
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
