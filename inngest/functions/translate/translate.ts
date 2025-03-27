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
    onFailure: async ({ error, step }) => {
      console.error(`Translation failed:`, error);
      
      // Notify the user of the failure through your preferred method
      // For now, we'll just log it
      await step.run("log-failure", async () => {
        console.error("Translation workflow failed:", {
          error: error.message
        });
      });
    }
  },
  { event: "translation.requested" },
  async ({ event, step }) => {
    const { mediaId, targetLanguage, requestingUserId } = event.data as TranslationRequestEvent["data"];

    // Log the start of translation
    await step.run("log-start", async () => {
      console.log(`Starting translation for media ${mediaId}`);
      console.log(`Requested by user: ${requestingUserId}`);
      console.log(`To: ${targetLanguage}`);
    });

    // Get existing translations
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

    const existingTranslations = media.translations || [];
    const filteredTranslations = existingTranslations.filter(
      (t: Translation) => t.targetLanguage !== targetLanguage
    );

    // Perform translation using LibreTranslate
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
            console.error("Translation error:", error);
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

    // Save the translation result back to Convex
    await step.run("save-translation", async () => {
      const updatedTranslations = [
        ...filteredTranslations,
        {
          targetLanguage,
          translatedText,
          translatedAt: Date.now(),
        },
      ];

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