import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";

import { helloWorld } from "@/inngest/functions/functions";
import { extractAndSavePDF } from "@/inngest/functions/converterBot/supervisor";
import { 
  mediaTranscriptionWorkflow,
  pythonTranscriptionFallback
} from "@/inngest/functions/transcribe";
import { translateTextWorkflow } from "@/inngest/functions/translate";

// The standard export approach that handles empty bodies automatically
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    extractAndSavePDF,
    mediaTranscriptionWorkflow,
    pythonTranscriptionFallback,
    translateTextWorkflow
  ],
  // Use streaming to allow for longer function execution
  streaming: "allow"
});
