'use server';

import { toast } from "sonner";

// API URLs
const VOICES_API_URL = "http://localhost:8880/v1/audio/voices";
const MODELS_API_URL = "http://localhost:8880/v1/models";

const kokoroApiUrl = "http://localhost:8880/v1/audio/speech";
const kokoroOpenAIUrl = "http://localhost:8880/v1";

/**
 * Get all available TTS voices
 */
export async function getAvailableVoices() {
  try {
    const response = await fetch(VOICES_API_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (Array.isArray(data.voices)) {
      // Convert voice string names to Voice objects
      const voiceObjects = data.voices.map((voiceName: string) => ({
        name: voiceName,
        display_name: formatVoiceName(voiceName)
      }));
      
      return { success: true, voices: voiceObjects };
    }
    
    return { success: false, error: "Invalid voice data format" };
  } catch (error) {
    console.error("Error fetching available voices:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch voices"
    };
  }
}

/**
 * Format voice name for display
 */
function formatVoiceName(name: string): string {
  if (!name) return '';
  
  // Extract the language code and voice name
  const parts = name.split('_');
  if (parts.length < 2) return name;
  
  const languageCode = parts[0];
  const voiceName = parts[1];
  
  // Convert language codes to readable names
  let language = '';
  switch (languageCode) {
    case 'af': language = 'American Female'; break;
    case 'am': language = 'American Male'; break;
    case 'bf': language = 'British Female'; break; 
    case 'bm': language = 'British Male'; break;
    case 'ef': language = 'European Female'; break;
    case 'em': language = 'European Male'; break;
    case 'ff': language = 'French Female'; break;
    case 'hf': language = 'Hindi Female'; break;
    case 'hm': language = 'Hindi Male'; break;
    case 'if': language = 'Italian Female'; break;
    case 'im': language = 'Italian Male'; break;
    case 'jf': language = 'Japanese Female'; break;
    case 'jm': language = 'Japanese Male'; break;
    case 'pf': language = 'Portuguese Female'; break;
    case 'pm': language = 'Portuguese Male'; break;
    case 'zf': language = 'Chinese Female'; break;
    case 'zm': language = 'Chinese Male'; break;
    default: language = languageCode.toUpperCase(); break;
  }
  
  // Capitalize the voice name
  const formattedVoiceName = voiceName.charAt(0).toUpperCase() + voiceName.slice(1);
  
  return `${language} - ${formattedVoiceName}`;
}

/**
 * Get all available TTS models
 */
export async function getAvailableModels() {
  try {
    const response = await fetch(MODELS_API_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the models from the response
    return { 
      success: true, 
      models: data.data || [],
      object: data.object
    };
  } catch (error) {
    console.error("Error fetching available models:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch models"
    };
  }
}

interface StreamOptions {
  stream?: boolean;
}

export async function generateSpeech(
  text: string, 
  voice: string = "af_bella", 
  lang_code: string | null = null, 
  speed: number = 1.0,
  streamOptions?: StreamOptions
) {
  if (!text || text.trim() === "") {
    throw new Error("Text cannot be empty");
  }

  console.log("Using language code:", lang_code);

  // If streaming is requested, return the API URL for client-side connection
  if (streamOptions?.stream) {
    console.log("Streaming requested, returning OpenAI-compatible streaming URL");
    return {
      url: `${kokoroOpenAIUrl}/audio/speech`,
      requestData: {
        model: "kokoro",
        input: text,
        voice: voice,
        speed: speed,
        response_format: "mp3",
        stream: true,
        lang_code: lang_code === undefined ? null : lang_code,
      }
    };
  }

  try {
    // Standard non-streaming request to Kokoro API
    // Prepare the request body
    const requestBody = {
      model: "kokoro",
      input: text,
      voice: voice,
      speed: speed,
      response_format: "mp3",
      lang_code: lang_code === undefined ? null : lang_code,
      normalization_options: {
        normalize: true
      }
    };

    console.log("Sending request to Kokoro API:", requestBody);

    // Make the API call
    const response = await fetch(kokoroApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Handle API response
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Kokoro API error:", errorText);
      throw new Error(`Kokoro API error: ${response.status} ${errorText}`);
    }

    // Return the audio blob for non-streaming requests
    const audioBlob = await response.blob();
    return {
      audioBlob,
      mimeType: "audio/mp3"
    };
  } catch (error) {
    console.error("Error generating speech:", error);
    toast.error("Failed to generate speech. Please try again.");
    throw error;
  }
} 