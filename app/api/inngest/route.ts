import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";

import { helloWorld } from "@/inngest/functions/functions";
import { extractAndSavePDF } from "@/inngest/functions/converterBot/supervisor";
import { 
  mediaTranscriptionWorkflow,
  pythonTranscriptionFallback
} from "@/inngest/functions/transcribe";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    extractAndSavePDF,
    mediaTranscriptionWorkflow,
    pythonTranscriptionFallback
  ],
});
