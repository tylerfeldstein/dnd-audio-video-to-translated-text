/**
 * Helper functions for working with the Kokoro TTS API
 */

/**
 * Convert standard language codes to Kokoro's internal format
 */
export function convertToKokoroLangCode(langCode: string): string | null {
  if (!langCode) return null;
  
  // Map standard language codes to Kokoro's internal language codes
  const langCodeMap: Record<string, string> = {
    // English variants
    "en": "a",
    "en-us": "a",
    "en-US": "a",
    "en_us": "a",
    "en_US": "a",
    "en-gb": "b",
    "en-GB": "b",
    "en_gb": "b",
    "en_GB": "b",
    // Spanish
    "es": "e",
    "es-ES": "e",
    "es_ES": "e",
    // French
    "fr": "f",
    "fr-FR": "f",
    "fr-fr": "f",
    "fr_FR": "f",
    "fr_fr": "f",
    // Hindi
    "hi": "h",
    "hi-IN": "h",
    "hi_IN": "h",
    // Italian
    "it": "i",
    "it-IT": "i",
    "it_IT": "i",
    // Portuguese
    "pt": "p",
    "pt-BR": "p",
    "pt-br": "p",
    "pt-PT": "p",
    "pt_BR": "p",
    "pt_br": "p",
    "pt_PT": "p",
    // Japanese
    "ja": "j",
    "ja-JP": "j",
    "ja_JP": "j",
    // Chinese
    "zh": "z",
    "zh-CN": "z",
    "zh-TW": "z",
    "cmn": "z",
    // Korean (direct pass-through)
    "ko": "ko",
    "ko-KR": "ko",
    "ko_KR": "ko",
    // Original Kokoro internal codes (pass-through)
    "a": "a", // American English
    "b": "b", // British English
    "e": "e", // Spanish
    "f": "f", // French
    "h": "h", // Hindi
    "i": "i", // Italian
    "p": "p", // Portuguese
    "j": "j", // Japanese
    "z": "z"  // Chinese
  };
  
  // Normalize the language code by converting to lowercase
  const normalizedCode = langCode.toLowerCase();
  
  // Check if we have a direct mapping for this code
  if (langCodeMap[normalizedCode]) {
    return langCodeMap[normalizedCode];
  }
  
  // Convert language code to base code (e.g., en-US -> en)
  const baseCode = normalizedCode.split(/[-_]/)[0].toLowerCase();
  
  // Check if we have a mapping for the base code
  if (langCodeMap[baseCode]) {
    return langCodeMap[baseCode];
  }
  
  // If language is not supported, return null for auto-detection
  console.log(`Language code "${langCode}" not recognized, using auto-detection`);
  return null;
} 