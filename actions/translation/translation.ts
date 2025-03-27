'use server';

import { inngest } from "@/inngest/client";
import { Id } from "@/convex/_generated/dataModel";

export async function requestTranslation(params: {
  mediaId: Id<"media">;
  targetLanguage: string;
  userId: string;
}) {
  try {
    await inngest.send({
      name: "translation.requested",
      data: {
        mediaId: params.mediaId,
        targetLanguage: params.targetLanguage,
        requestingUserId: params.userId
      },
      user: { 
        id: params.userId,
        clerkUserId: params.userId 
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send translation event:", error);
    throw new Error("Failed to start translation");
  }
} 