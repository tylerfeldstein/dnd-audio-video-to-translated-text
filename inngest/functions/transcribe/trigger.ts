import { inngest } from "@/inngest/client";

/**
 * This function triggers the transcription workflow when a new media file is uploaded
 * It should be imported and called from the component/action that uploads media files
 */
export async function triggerMediaTranscription(mediaId: string, storageId: string, userId: string) {
  try {
    // Send an event to Inngest to start the transcription workflow
    await inngest.send({
      name: "media/file.uploaded",
      data: {
        mediaId,
        storageId,
        userId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to trigger transcription workflow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * This function triggers the fallback transcription method
 * It should be called when the primary transcription method fails
 */
export async function triggerFallbackTranscription(mediaId: string, storageId: string, tempFilePath: string) {
  try {
    // Send an event to Inngest to start the fallback transcription workflow
    await inngest.send({
      name: "media/transcription.fallback",
      data: {
        mediaId,
        storageId,
        tempFilePath,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to trigger fallback transcription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
} 