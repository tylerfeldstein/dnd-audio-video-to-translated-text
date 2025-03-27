import { inngest } from "../../client";
import { ConvexHttpClient } from "convex/browser";

// Add node-fetch for Node.js environment
import fetch from "node-fetch";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const LANGUAGETOOL_URL = "http://localhost:8010";

interface GrammarCheckRequestEvent {
  name: "grammar/correct.request";
  data: {
    jobId: string;
    text: string;
    language?: string; // Language code or 'auto' for auto-detection
  };
  user?: {
    id: string;
    clerkUserId: string;
  };
}

interface LanguageToolMatch {
  message: string;
  offset: number;
  length: number;
  replacements: Array<{
    value: string;
  }>;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  rule: {
    id: string;
    description: string;
    issueType: string;
  };
}

interface LanguageToolResponse {
  software: {
    name: string;
    version: string;
  };
  language: {
    name: string;
    code: string;
  };
  matches: Array<LanguageToolMatch>;
}

export const grammarCorrectWorkflow = inngest.createFunction(
  { 
    id: "grammar-correct-workflow",
    retries: 3,
    concurrency: { limit: 10 },
    onFailure: async ({ error, step, event }) => {
      console.error(`Grammar check failed:`, error);
      
      // Cast the event data to our expected format
      const typedEvent = event as unknown as GrammarCheckRequestEvent;
      const { jobId, text } = typedEvent.data;
      const userId = typedEvent.user?.id || "anonymous";
      
      if (!jobId) {
        console.error("Missing required event data for error handling");
        return;
      }
      
      // Create job with error status or update existing job
      await step.run("create-job-with-error", async () => {
        try {
          // Create or update a grammar check job with error status
          // @ts-expect-error - This works but TS doesn't recognize the mutation with string path
          await convex.mutation("grammar:createOrUpdateGrammarJob", {
            text: text || "",
            userId,
            jobId,
            status: "error",
            error: error.message
          });
        } catch (err) {
          console.error("Failed to update error status:", err);
        }
      });
    }
  },
  { event: "grammar/correct.request" },
  async ({ event, step }) => {
    // Cast the event to our expected format
    const typedEvent = event as unknown as GrammarCheckRequestEvent;
    const { jobId, text } = typedEvent.data;
    const userId = typedEvent.user?.id || "anonymous";

    // Create or update the job with processing status
    await step.run("create-grammar-job", async () => {
      try {
        // @ts-expect-error - This works but TS doesn't recognize the mutation with string path
        await convex.mutation("grammar:createOrUpdateGrammarJob", {
          text,
          userId,
          jobId,
          status: "processing"
        });
      } catch (err) {
        console.error("Failed to create/update grammar check job:", err);
        throw new Error("Failed to initialize grammar check job");
      }
    });

    // Send text to LanguageTool for grammar checking
    const result = await step.run("check-grammar", async () => {
      // Get language from event data or default to 'auto'
      const language = typedEvent.data.language || 'auto';
      
      // Create form data for LanguageTool request
      const params = new URLSearchParams();
      params.append("text", text);
      params.append("language", language); // Use specified language or auto-detect
      params.append("enabledOnly", "false"); // Include all rules

      try {
        const response = await fetch(`${LANGUAGETOOL_URL}/v2/check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`LanguageTool API error (${response.status}): ${errorText}`);
        }

        const result = await response.json() as LanguageToolResponse;
        
        // Extract the detected language
        const detectedLanguage = result.language?.code || language;
        
        // Map LanguageTool matches to our correction format
        const corrections = result.matches.map(match => ({
          message: match.message,
          offset: match.offset,
          length: match.length,
          replacement: match.replacements.length > 0 ? match.replacements[0].value : "",
        }));
        
        return { corrections, detectedLanguage };
      } catch (error) {
        console.error("Grammar check error:", error);
        throw new Error(`Failed to check grammar: ${(error as Error).message}`);
      }
    });

    // Save the results
    await step.run("save-results", async () => {
      try {
        // @ts-expect-error - This works but TS doesn't recognize the mutation with string path
        await convex.mutation("grammar:updateGrammarCheckResults", {
          jobId,
          status: "completed",
          corrections: result.corrections,
          detectedLanguage: result.detectedLanguage
        });
      } catch (err) {
        console.error("Failed to save grammar check results:", err);
        throw new Error("Failed to save grammar check results");
      }
    });

    return {
      success: true,
      jobId,
      correctionCount: result.corrections.length,
    };
  }
); 