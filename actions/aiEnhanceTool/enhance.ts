'use server';

import { inngest } from "@/inngest/client";
import { auth } from "@clerk/nextjs/server";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Request AI enhancement for a text
 * @param params Object containing the enhancement parameters
 * @returns Object indicating success or failure
 */
export async function requestAIEnhancement(params: {
  mediaId: Id<"media">; 
  originalText: string;
  promptType: string;
  userId: string;
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    if (!params.originalText.trim()) {
      throw new Error("Text cannot be empty");
    }

    // Get the current user ID from Clerk
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Verify that the requesting user is authorized
    if (userId !== params.userId) {
      throw new Error("Unauthorized enhancement request");
    }

    // Create a unique job ID for this enhancement request
    const jobId = `enhance_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Send the event to Inngest to process asynchronously
    await inngest.send({
      name: "ai/enhance.requested",
      data: {
        jobId,
        mediaId: params.mediaId,
        originalText: params.originalText,
        promptType: params.promptType
      },
      user: {
        id: userId,
        clerkUserId: userId
      }
    });

    return { success: true, jobId };
  } catch (error) {
    console.error("Failed to send AI enhancement request:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to start AI enhancement" 
    };
  }
} 