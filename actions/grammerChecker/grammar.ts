'use server';

import { inngest } from "@/inngest/client";
import { auth } from "@clerk/nextjs/server";

/**
 * Request grammar correction for a text
 * @param text The text to be checked for grammar issues
 * @param language Optional language code to use for checking (e.g., 'en', 'es', 'fr')
 * @returns The job ID that can be used to track the status of the correction
 */
export async function requestGrammarCorrection(text: string, language?: string): Promise<string> {
  try {
    if (!text.trim()) {
      throw new Error("Text cannot be empty");
    }

    // Get the current user ID from Clerk
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Create a unique job ID for this correction request
    const jobId = `grammar_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Send the event to Inngest to process asynchronously
    await inngest.send({
      name: "grammar/correct.request",
      data: {
        jobId,
        text,
        language: language || 'auto' // Use 'auto' as fallback for language detection
      },
      user: {
        id: userId,
        clerkUserId: userId
      }
    });

    return jobId;
  } catch (error) {
    console.error("Failed to send grammar correction request:", error);
    throw new Error("Failed to start grammar correction");
  }
} 