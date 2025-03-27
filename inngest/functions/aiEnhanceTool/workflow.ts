"use node";

import { inngest } from "@/inngest/client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import fetch from "node-fetch";
import { getSystemPromptForType } from "@/actions/aiEnhanceTool/promptTypes";

// Set up the Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Get Ollama config from environment variables with defaults
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || undefined; // Optional API key
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

interface Enhancement {
  originalText: string;
  enhancedText: string;
  modelName: string;
  promptType: string;
  enhancedAt: number;
  status?: "pending" | "processing" | "completed" | "error";
  error?: string;
}

interface AIEnhanceRequestEvent {
  name: "ai/enhance.requested";
  data: {
    jobId: string;
    mediaId: Id<"media">;
    originalText: string;
    promptType: string;
  };
  user?: {
    id: string;
    clerkUserId: string;
  };
}

// Interface for Ollama chat response
interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export const aiEnhanceWorkflow = inngest.createFunction(
  { 
    id: "ai-enhance-workflow",
    retries: 3,
    concurrency: { limit: 5 },
    onFailure: async ({ error, step, event }) => {
      console.error(`AI enhancement failed:`, error);
      
      // Cast the event data to our expected format
      const typedEvent = event as unknown as AIEnhanceRequestEvent;
      const { mediaId, promptType, originalText } = typedEvent.data;
      
      if (!mediaId) {
        console.error("Missing mediaId in event data for error handling");
        return;
      }
      
      // Update the enhancement status to error
      await step.run("update-status-to-error", async () => {
        try {
          const media = await convex.query(api.media.getMediaById, { mediaId });
          if (!media) return;
          
          const existingEnhancements = media.enhancements || [];
          const updatedEnhancements = [
            ...existingEnhancements.filter(e => e.promptType !== promptType || e.originalText !== originalText),
            {
              originalText,
              enhancedText: "",
              modelName: OLLAMA_MODEL,
              promptType,
              enhancedAt: Date.now(),
              status: "error" as const,
              error: error instanceof Error ? error.message : "Unknown error"
            }
          ];
          
          await convex.mutation(api.media.updateEnhancements, {
            mediaId,
            enhancements: updatedEnhancements,
          });
        } catch (err) {
          console.error("Failed to update enhancement error status:", err);
        }
      });
    }
  },
  { event: "ai/enhance.requested" },
  async ({ event, step }) => {
    // Cast the event to our expected format
    const typedEvent = event as unknown as AIEnhanceRequestEvent;
    const { mediaId, originalText, promptType } = typedEvent.data;
    const userId = typedEvent.user?.id || "anonymous";

    // Verify data
    if (!mediaId || !originalText || !promptType) {
      throw new Error("Missing required event data");
    }

    // Set initial pending status
    await step.run("set-pending-status", async () => {
      const media = await convex.query(api.media.getMediaById, { mediaId });
      if (!media) return;
      
      const existingEnhancements = media.enhancements || [];
      const updatedEnhancements = [
        ...existingEnhancements.filter(e => e.promptType !== promptType || e.originalText !== originalText),
        {
          originalText,
          enhancedText: "",
          modelName: OLLAMA_MODEL,
          promptType,
          enhancedAt: Date.now(),
          status: "pending" as const
        }
      ];
      
      await convex.mutation(api.media.updateEnhancements, {
        mediaId,
        enhancements: updatedEnhancements,
      });
    });

    // Verify user has access to this media
    await step.run("verify-access", async () => {
      const hasAccess = await convex.query(api.media.userHasAccess, { 
        mediaId, 
        userId 
      });
      if (!hasAccess) {
        throw new Error("User does not have access to this media");
      }
    });

    // Update to processing status
    await step.run("set-processing-status", async () => {
      const media = await convex.query(api.media.getMediaById, { mediaId });
      if (!media) return;
      
      const existingEnhancements = media.enhancements || [];
      const updatedEnhancements = existingEnhancements.map((e: Enhancement) =>
        (e.promptType === promptType && e.originalText === originalText)
          ? { ...e, status: "processing" as const }
          : e
      );
      
      await convex.mutation(api.media.updateEnhancements, {
        mediaId,
        enhancements: updatedEnhancements,
      });
    });

    // Get the system prompt for the selected prompt type
    const systemPrompt = await step.run("get-system-prompt", async () => {
      try {
        return getSystemPromptForType(promptType);
      } catch (err) {
        console.error("Failed to get system prompt:", err);
        throw new Error(`Invalid prompt type: ${promptType}`);
      }
    });

    // Perform enhancement with Ollama
    const enhancedText = await step.run("enhance-text", async () => {
      const maxRetries = 3;
      let retryCount = 0;

      while (retryCount < maxRetries) {
        try {
          // Configure the request headers
          const headers: Record<string, string> = {
            "Content-Type": "application/json"
          };
          
          // Add API key if provided
          if (OLLAMA_API_KEY) {
            headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
          }
          
          // Make the request to Ollama API
          const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: OLLAMA_MODEL,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: originalText }
              ],
              stream: false,
              options: {
                temperature: 0.7,
                top_p: 0.9
              }
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error (${response.status}): ${errorText}`);
          }

          const result = await response.json() as OllamaResponse;
          if (!result.message || !result.message.content) {
            throw new Error("Invalid response format from Ollama");
          }
          
          return result.message.content.trim();
        } catch (error) {
          console.error("AI enhancement error:", error);
          retryCount++;
          
          // For the last retry, throw the error
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to enhance text: ${(error as Error).message}`);
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
      
      throw new Error("Failed to enhance text after maximum retries");
    });

    // Save the results
    await step.run("save-results", async () => {
      try {
        const media = await convex.query(api.media.getMediaById, { mediaId });
        if (!media) return;
        
        const existingEnhancements = media.enhancements || [];
        const updatedEnhancements = existingEnhancements.map((e: Enhancement) =>
          (e.promptType === promptType && e.originalText === originalText)
            ? {
                ...e,
                enhancedText,
                enhancedAt: Date.now(),
                status: "completed" as const,
                error: undefined
              }
            : e
        );
        
        await convex.mutation(api.media.updateEnhancements, {
          mediaId,
          enhancements: updatedEnhancements,
        });
      } catch (err) {
        console.error("Failed to save enhancement results:", err);
        throw new Error("Failed to save enhancement results");
      }
    });

    return {
      success: true,
      mediaId,
      promptType,
      modelName: OLLAMA_MODEL
    };
  }
); 