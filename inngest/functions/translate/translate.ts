import { inngest } from "../../client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Add node-fetch for Node.js environment
import fetch from "node-fetch";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const LIBRETRANSLATE_URL = "http://localhost:6000";

interface Translation {
  targetLanguage: string;
  translatedText: string;
  translatedAt: number;
  status?: "pending" | "processing" | "completed" | "error";
  error?: string;
}

interface LibreTranslateResponse {
  translatedText: string;
  detectedLanguage?: {
    confidence: number;
    language: string;
  };
}

interface TranslationRequestEvent {
  name: "translation.requested";
  data: {
    mediaId: Id<"media">;
    targetLanguage: string;
    requestingUserId: string;
  };
}

export const translateTextWorkflow = inngest.createFunction(
  { 
    id: "translate-text-workflow",
    retries: 3,
    concurrency: { limit: 10 },
    onFailure: async ({ error, step, event }) => {
      console.error(`Translation failed:`, error);
      
      // Double type assertion to handle the event data safely
      const eventData = (event as unknown as { data: TranslationRequestEvent["data"] }).data;
      
      if (!eventData?.mediaId || !eventData?.targetLanguage) {
        console.error("Missing required event data for error handling");
        return;
      }
      
      // Update translation status to error
      await step.run("update-error-status", async () => {
        const media = await convex.query(api.media.getMediaById, { mediaId: eventData.mediaId });
        if (!media) return;

        const existingTranslations = media.translations || [];
        const updatedTranslations = existingTranslations.map((t: Translation) =>
          t.targetLanguage === eventData.targetLanguage
            ? { ...t, status: "error" as const, error: error.message }
            : t
        );

        await convex.mutation(api.media.updateTranslations, {
          mediaId: eventData.mediaId,
          translations: updatedTranslations,
        });
      });
    }
  },
  { event: "translation.requested" },
  async ({ event, step }) => {
    const { mediaId, targetLanguage, requestingUserId } = event.data as TranslationRequestEvent["data"];

    // Set initial pending status
    await step.run("set-pending-status", async () => {
      const media = await convex.query(api.media.getMediaById, { mediaId });
      if (!media) return;

      const existingTranslations = media.translations || [];
      const updatedTranslations = [
        ...existingTranslations.filter(t => t.targetLanguage !== targetLanguage),
        {
          targetLanguage,
          translatedText: "",
          translatedAt: Date.now(),
          status: "pending" as const
        }
      ];

      await convex.mutation(api.media.updateTranslations, {
        mediaId,
        translations: updatedTranslations,
      });
    });

    // Get media and verify access
    const media = await step.run("fetch-media", async () => {
      return await convex.query(api.media.getMediaById, { mediaId });
    });

    if (!media) {
      throw new Error("Media not found");
    }

    if (!media.transcriptionText) {
      throw new Error("No transcription text found to translate");
    }

    // Verify user has access to this media
    await step.run("verify-access", async () => {
      const hasAccess = await convex.query(api.media.userHasAccess, { 
        mediaId, 
        userId: requestingUserId 
      });
      if (!hasAccess) {
        throw new Error("User does not have access to this media");
      }
    });

    // Update to processing status
    await step.run("set-processing-status", async () => {
      const currentMedia = await convex.query(api.media.getMediaById, { mediaId });
      if (!currentMedia) return;

      const existingTranslations = currentMedia.translations || [];
      const updatedTranslations = existingTranslations.map((t: Translation) =>
        t.targetLanguage === targetLanguage
          ? { ...t, status: "processing" as const }
          : t
      );

      await convex.mutation(api.media.updateTranslations, {
        mediaId,
        translations: updatedTranslations,
      });
    });

    // Perform translation
    const translatedText = await step.run("translate-text", async () => {
      const maxRetries = 3;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
            method: "POST",
            body: JSON.stringify({
              q: media.transcriptionText,
              source: media.detectedLanguage || "auto",
              target: targetLanguage,
              format: "text"
            }),
            headers: { 
              "Content-Type": "application/json"
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 429 && retryCount < maxRetries - 1) {
              // Rate limit hit - wait and retry
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            }
            throw new Error(`Translation failed with status: ${response.status}. Error: ${errorText}`);
          }

          const result: LibreTranslateResponse = await response.json();
          if (!result.translatedText) {
            throw new Error("Received empty translation from LibreTranslate");
          }
          return result.translatedText;
        } catch (error) {
          console.error("Translation attempt failed:", error);
          if (retryCount === maxRetries - 1) {
            throw new Error("Failed to translate text using LibreTranslate after multiple retries");
          }
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      throw new Error("Failed to translate text after maximum retries");
    });

    if (!translatedText) {
      throw new Error("Translation failed: No translated text received");
    }

    // Save the completed translation
    await step.run("save-translation", async () => {
      const currentMedia = await convex.query(api.media.getMediaById, { mediaId });
      if (!currentMedia) return;

      const existingTranslations = currentMedia.translations || [];
      const updatedTranslations = existingTranslations.map((t: Translation) =>
        t.targetLanguage === targetLanguage
          ? {
              targetLanguage,
              translatedText,
              translatedAt: Date.now(),
              status: "completed" as const
            }
          : t
      );

      await convex.mutation(api.media.updateTranslations, {
        mediaId,
        translations: updatedTranslations,
      });
    });

    return {
      success: true,
      mediaId,
      targetLanguage,
    };
  }
); 