"use server";

import { ConvexHttpClient } from "convex/browser";

import { api } from "@/convex/_generated/api";

/**
 * Server action to upload a file to Convex storage
 */
export async function uploadFileToConvex(formData: FormData) {
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

    // Make sure it's a PDF
    if (!file.type.includes("pdf")) {
      throw new Error("Only PDF files are supported");
    }

    // Create a Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Get a temporary upload URL from Convex
    const uploadUrl = await convex.mutation(api.files.generateUploadUrl, {});

    // Upload the file directly to Convex storage
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!result.ok) {
      throw new Error(`Failed to upload file: ${result.statusText}`);
    }

    // Get the storage ID from the response
    const { storageId } = await result.json();

    // Save the PDF to the pdfs table
    const pdfId = await convex.mutation(api.files.savePdf, {
      name: file.name,
      fileId: storageId,
      size: file.size,
      mimeType: file.type,
      description: getDisplayName(file.name), // Use the display name as a description
      userId, // Add the userId to the PDF record
    });

    return {
      success: true,
      pdfId,
      message: "File uploaded successfully",
    };
  } catch (error) {
    // Silently handle error in production, could use a logger service instead
    console.error("Error uploading file:", error);

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
