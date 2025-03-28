'use server';

export interface Timestamp {
  word: string;
  start_time: number;
  end_time: number;
}

interface CaptionedSpeechResponse {
  audioBlob?: Blob;
  audioBase64?: string;
  timestamps?: Timestamp[];
  mimeType?: string;
  success: boolean;
  error?: string;
}

/**
 * Generate speech with word-level timestamps for highlighting
 */
export async function generateCaptionedSpeech(
  text: string, 
  voice: string = "af_bella", 
  lang_code: string | null = null, 
  speed: number = 1.0
): Promise<CaptionedSpeechResponse> {
  if (!text || text.trim() === "") {
    return {
      success: false,
      error: "Text cannot be empty"
    };
  }

  console.log("Generating captioned speech with language code:", lang_code);

  try {
    // Prepare the request body for the captioned_speech endpoint
    const requestBody = {
      model: "kokoro",
      input: text,
      voice: voice,
      speed: speed,
      response_format: "mp3",
      stream: false,
      lang_code: lang_code === undefined ? null : lang_code,
      normalization_options: {
        normalize: true
      }
    };

    console.log("Sending request to Kokoro captioned_speech API:", requestBody);

    // Make the API call to the captioned_speech endpoint
    const response = await fetch("http://localhost:8880/dev/captioned_speech", {
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
      return {
        success: false,
        error: `Kokoro API error: ${response.status} ${errorText}`
      };
    }

    // Parse the JSON response
    const jsonResponse = await response.json();
    
    // Extract the audio base64 and timestamps
    const { audio, timestamps, audio_format } = jsonResponse;
    
    // Create an audio blob from the base64 data
    const audioBytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: `audio/${audio_format}` });
    
    return {
      success: true,
      audioBlob,
      audioBase64: audio,
      timestamps,
      mimeType: `audio/${audio_format}`
    };
  } catch (error) {
    console.error("Error generating captioned speech:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate captioned speech"
    };
  }
} 