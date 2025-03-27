import { openai } from "@inngest/agent-kit";

// Custom function to create a model based on environment variables
export const createModel = () => {
  const modelProvider = process.env.LLM_PROVIDER || "openai";

  if (modelProvider === "openai") {
    return openai({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      apiKey: process.env.OPENAI_API_KEY,
      defaultParameters: {
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"),
      },
    });
  } else if (modelProvider === "ollama" || modelProvider === "lmstudio") {
    // For local LLMs like Ollama or LM Studio that support OpenAI-compatible API
    return openai({
      model: process.env.LOCAL_MODEL || "llama3",
      apiKey: process.env.LOCAL_API_KEY || "ollama", // 'ollama' is default for Ollama
      baseUrl: process.env.LOCAL_API_URL || "http://localhost:11434/v1",
      defaultParameters: {
        temperature: parseFloat(process.env.LOCAL_TEMPERATURE || "0.7"),
        max_completion_tokens: 1000,
      },
    });
  } else {
    throw new Error(`Unsupported model provider: ${modelProvider}`);
  }
};
