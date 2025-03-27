import { inngest } from "../client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface Translation {
  targetLanguage: string;
  translatedText: string;
  translatedAt: number;
}

export const translateTextWorkflow = inngest.createFunction(
  { id: "translate-text-workflow" },
  { event: "translation.requested" },
  async ({ event, step }) => {
    const { mediaId, targetLanguage } = event.data;

    // Log the start of translation
    await step.run("log-start", async () => {
      console.log(`Starting translation for media ${mediaId}`);
      console.log(`To: ${targetLanguage}`);
    });

    // Get existing translations
    const media = await step.run("fetch-media", async () => {
      return await convex.query(api.media.getMediaById, { mediaId });
    });

    if (!media) {
      throw new Error("Media not found");
    }

    const existingTranslations = media.translations || [];
    const filteredTranslations = existingTranslations.filter(
      (t: Translation) => t.targetLanguage !== targetLanguage
    );

    // TODO: Replace this with your actual translation service integration
    // This is where you would integrate with your chosen translation service
    // For example: DeepL, Google Cloud Translation, or Azure Translator
    const translatedText = await step.run("translate-text", async () => {
      throw new Error("Translation service not implemented");
    });

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