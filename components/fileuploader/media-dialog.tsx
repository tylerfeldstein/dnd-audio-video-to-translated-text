"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Id } from "@/convex/_generated/dataModel";
import { TranslationPanel } from "./translation-panel";
import { GrammarCheckPanel } from "./grammar-check-panel";
import { AIEnhancementPanel } from "./ai-enhancement-panel";
import { TtsHighlightPanel } from "./tts-highlight/tts-highlight-panel";
import { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Volume2, Download, Play, Pause, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getAvailableVoices, getAvailableModels, generateSpeech } from "@/actions/kokoroTts/tts";
import { Switch } from "@/components/ui/switch";

// Initialize the Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface Media {
  _id: Id<"media">;
  _creationTime: number;
  name: string;
  fileId: Id<"_storage">;
  size: number;
  mimeType: string;
  description?: string;
  fileUrl?: string;
  userId: string;
  transcriptionStatus?: string;
  transcriptionText?: string;
  transcribedAt?: number;
  duration?: number;
  detectedLanguage?: string;
  translations?: Array<{
    targetLanguage: string;
    translatedText: string;
    translatedAt: number;
    status?: "pending" | "processing" | "completed" | "error";
    error?: string;
  }>;
}

interface MediaDialogProps {
  media: Media | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Voice {
  name: string;
  display_name?: string;
}

interface GrammarCheckPanelProps {
  mediaId: Id<"media">;
  text?: string;
  label?: string;
  language?: string; // Language code (e.g., 'en', 'es', 'fr')
  onTextToSpeech?: (text: string, language?: string) => void;
}

interface AIEnhancementPanelProps {
  mediaId: Id<"media">;
  text: string; // Text to enhance (original transcription or translation)
  label?: string;
  onTextToSpeech?: (text: string, language?: string) => void;
}

interface TranslationPanelProps {
  mediaId: Id<"media">;
  detectedLanguage?: string;
  translations?: Translation[];
  onTextToSpeech?: (text: string, language?: string) => void;
}

interface Translation {
  targetLanguage: string;
  translatedText: string;
  translatedAt: number;
  status?: "pending" | "processing" | "completed" | "error";
  error?: string;
}

export function MediaDialog({ media, isOpen, onClose }: MediaDialogProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [refreshedFileUrl, setRefreshedFileUrl] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<Record<string, string[]>>({
    transcription: ["transcription-original"],
    media: [],
    enhancement: [],
    translation: []
  });
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  
  const [ttsVoices, setTtsVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tts_selectedVoice') || "af_heart";
    }
    return "af_heart";
  });
  const [ttsSpeed, setTtsSpeed] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedSpeed = localStorage.getItem('tts_speed');
      return savedSpeed ? parseFloat(savedSpeed) : 1.0;
    }
    return 1.0;
  });
  const [ttsText, setTtsText] = useState("");
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const TTS_API_URL = "http://localhost:8880/v1/audio/speech";

  // Add state to track Kokoro server status
  const [kokoroStatus, setKokoroStatus] = useState<"unknown" | "online" | "offline">("unknown");

  // Add state for models
  const [ttsModels, setTtsModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tts_selectedModel') || "kokoro";
    }
    return "kokoro";
  });

  // Add response format type selection
  const [responseFormat, setResponseFormat] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tts_responseFormat') || "mp3";
    }
    return "mp3";
  });
  const [autoPlay, setAutoPlay] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tts_autoPlay') !== 'false'; // Default to true
    }
    return true;
  });
  const [langCode, setLangCode] = useState<string | null>(null);

  // Add new state for voice combination
  const [voiceCombination, setVoiceCombination] = useState<string>("");
  const [isUsingCombination, setIsUsingCombination] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tts_isUsingCombination') === 'true';
    }
    return false;
  });
  const [voiceWeights, setVoiceWeights] = useState<{ [key: string]: number }>({});
  const [selectedVoices, setSelectedVoices] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tts_selectedVoices');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isStreaming, setIsStreaming] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tts_isStreaming') === 'true';
    }
    return false;
  });

  // Calculate optimal video height based on screen size
  useEffect(() => {
    const calculateVideoHeight = () => {
      if (isOpen) {
        // Get available height (subtract space for dialog chrome, info, and transcription)
        const viewportHeight = window.innerHeight;
        // Use 60% of viewport height as a maximum for the video, but no more than 600px
        const maxHeight = Math.min(Math.floor(viewportHeight * 0.6), 600);
        setVideoHeight(maxHeight);
      }
    };

    calculateVideoHeight();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateVideoHeight);
    
    return () => {
      window.removeEventListener('resize', calculateVideoHeight);
    };
  }, [isOpen]);

  // Reset copied state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  // When opening the dialog, scroll to top
  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure dialog is rendered
      setTimeout(() => {
        const dialogContent = document.querySelector('[data-slot="dialog-content"]');
        if (dialogContent) {
          dialogContent.scrollTop = 0;
        }
      }, 10);
      
      // Reset to media tab when dialog opens
      setActiveTab("media");
    }
  }, [isOpen]);

  // Update the useEffect for media loading to handle large files better
  useEffect(() => {
    if (isOpen && media) {
      // Reset state when opening dialog
      setErrorDetails(null);
      setRefreshedFileUrl(null);
      setIsVideoLoading(true);
      
      const fileUrl = refreshedFileUrl || media.fileUrl;
      if (fileUrl) {
        if (media.mimeType?.includes("video") && videoRef.current) {
          videoRef.current.load();
        } else if (media.mimeType?.includes("audio") && audioRef.current) {
          audioRef.current.load();
        }
      }
    }
  }, [isOpen, media, refreshedFileUrl]);

  // Initialize TTS text from transcription when tab changes only if TTS text is empty
  useEffect(() => {
    if (activeTab === "tts" && media?.transcriptionText && !ttsText) {
      setTtsText(media.transcriptionText);
      
      // Set language if it's available from transcription
      if (media.detectedLanguage) {
        // Convert language code to kokoro-compatible format if needed
        setLangCode(convertToKokoroLangCode(media.detectedLanguage));
      } else {
        // Auto detect
        setLangCode(null);
      }
      
      // Fetch voices when TTS tab is selected
      fetchVoices();
      fetchModels();
    }
  }, [activeTab, media?.transcriptionText, media?.detectedLanguage, ttsText]);

  // Update the fetchVoices function to use server action
  const fetchVoices = async () => {
    if (ttsVoices.length > 0) {
      setKokoroStatus("online");
      return; // Only fetch if not already loaded
    }
    
    try {
      const result = await getAvailableVoices();
      
      if (result.success && result.voices) {
        console.log("Fetched voices:", result.voices);
        setTtsVoices(result.voices);
        setKokoroStatus("online");
      } else {
        console.error("Failed to fetch voices:", result.error);
        toast.error("Failed to load available voices");
        setKokoroStatus("offline");
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast.error("Error connecting to TTS service");
      setKokoroStatus("offline");
    }
  };

  // Add fetchModels function
  const fetchModels = async () => {
    try {
      const result = await getAvailableModels();
      
      if (result.success && result.models) {
        console.log("Fetched models:", result.models);
        setTtsModels(result.models);
      } else {
        console.error("Failed to fetch models:", result.error);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  // Format voice combination string with weights
  const formatVoiceCombination = (): string => {
    return selectedVoices
      .filter(voice => voiceWeights[voice] > 0)
      .map(voice => `${voice}(${voiceWeights[voice].toFixed(1)})`)
      .join('+');
  };

  // Add or remove a voice from the combination
  const toggleVoiceSelection = (voiceName: string) => {
    if (selectedVoices.includes(voiceName)) {
      // Remove voice
      setSelectedVoices(selectedVoices.filter(v => v !== voiceName));
      const { [voiceName]: _, ...rest } = voiceWeights;
      setVoiceWeights(rest);
    } else {
      // Add voice with default weight of 1.0
      setSelectedVoices([...selectedVoices, voiceName]);
      // Check if we have a saved weight for this voice
      const savedWeight = voiceWeights[voiceName];
      setVoiceWeights({ 
        ...voiceWeights, 
        [voiceName]: savedWeight !== undefined ? savedWeight : 1.0 
      });
    }
  };

  // Update weight for a voice
  const updateVoiceWeight = (voiceName: string, weight: number) => {
    // Ensure weight is between 0.1 and 10.0
    const validWeight = Math.max(0.1, Math.min(10.0, weight));
    setVoiceWeights({ ...voiceWeights, [voiceName]: validWeight });
  };

  // Replace the entire handleGenerateSpeech function
  const handleGenerateSpeech = async () => {
    if (!ttsText.trim()) {
      toast.error("Please enter some text to convert to speech");
      return;
    }

    setIsTtsLoading(true);
    setTtsAudioUrl(null);

    try {
      // Determine which voice to use (single or combination)
      const voiceToUse = isUsingCombination 
        ? formatVoiceCombination()
        : selectedVoice;
        
      // Make the request using the OpenAI-compatible endpoint
      const result = await generateSpeech(
        ttsText,
        voiceToUse,
        langCode,
        ttsSpeed,
        { stream: true }
      );
      
      // If we got a streaming URL, use it
      if (result.url && result.requestData) {
        console.log("Got OpenAI-compatible streaming URL:", result.url);
        await handleStreamingRequest(result.url, result.requestData);
      } else if (result.audioBlob) {
        // Fallback for non-streaming responses
        const audioUrl = URL.createObjectURL(result.audioBlob);
        setTtsAudioUrl(audioUrl);
        
        toast.success("Audio generated successfully!");
        
        // Auto-play if enabled
        if (autoPlay && ttsAudioRef.current) {
          ttsAudioRef.current.src = audioUrl;
          ttsAudioRef.current.play()
            .then(() => setIsTtsPlaying(true))
            .catch(e => console.error("Audio play error:", e));
        }
      }
    } catch (error) {
      console.error("Error generating speech:", error);
      toast.error("Failed to generate speech. Please try again.");
    } finally {
      setIsTtsLoading(false);
    }
  };

  // Handle streaming request directly from the browser using OpenAI compatible endpoint
  const handleStreamingRequest = async (url: string, requestData: any) => {
    try {
      setIsTtsLoading(true);
      
      console.log("Starting OpenAI-compatible stream request to:", url);
      console.log("Stream request data:", requestData);
      
      // Make sure streaming is enabled in the request
      const streamingRequestData = {
        ...requestData,
        stream: true
      };
      
      // Use the OpenAI compatible endpoint directly
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(streamingRequestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
      }
      
      toast.info("Audio streaming started...");
      
      // For OpenAI compatible streaming, we can just get the blob directly
      // The OpenAI endpoint directly returns the audio as a streamable resource
      const audioBlob = await response.blob();
      
      // Create a URL from the blob
      const audioUrl = URL.createObjectURL(audioBlob);
      setTtsAudioUrl(audioUrl);
      
      // Auto-play if enabled
      if (autoPlay && ttsAudioRef.current) {
        ttsAudioRef.current.src = audioUrl;
        ttsAudioRef.current.play()
          .then(() => setIsTtsPlaying(true))
          .catch(e => console.error("Audio play error:", e));
      }
      
      toast.success("Audio generated successfully!");
      setIsTtsLoading(false);
    } catch (error) {
      console.error("Error in streaming request:", error);
      toast.error("Failed to stream speech. Please try again.");
      setIsTtsLoading(false);
    }
  };

  // Function to toggle play/pause
  const togglePlayPause = () => {
    if (ttsAudioRef.current) {
      if (isTtsPlaying) {
        ttsAudioRef.current.pause();
      } else {
        ttsAudioRef.current.play()
          .catch(e => console.error("Play error:", e));
      }
      setIsTtsPlaying(!isTtsPlaying);
    }
  };

  // Function to download audio
  const handleDownload = () => {
    if (ttsAudioUrl) {
      const a = document.createElement("a");
      a.href = ttsAudioUrl;
      a.download = `speech-${Date.now()}.${responseFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Function to refresh the file URL
  const refreshFileUrl = async () => {
    if (!media || !media.fileId) return;
    
    setIsRefreshing(true);
    try {
      // Use convex client to get a fresh URL
      const freshUrl = await convex.query(api.media.getFileUrl, { 
        storageId: media.fileId 
      });
      
      if (freshUrl) {
        setRefreshedFileUrl(freshUrl);
        setErrorDetails(null);
      } else {
        setErrorDetails("Could not refresh file URL");
      }
    } catch (err) {
      console.error("Error refreshing file URL:", err);
      setErrorDetails("Error refreshing file URL");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle accordion state change
  const handleAccordionChange = (tab: string, value: string[]) => {
    setOpenAccordion(prev => ({
      ...prev,
      [tab]: value
    }));
  };

  // Prepare for TTS and switch to TTS tab
  const prepareForTTS = (text: string, sourceLang?: string) => {
    // Set the text in the TTS tab
    setTtsText(text);
    
    // If a source language is provided, try to set it
    if (sourceLang) {
      console.log(`Original detected language: ${sourceLang}`);
      const kokoroLang = convertToKokoroLangCode(sourceLang);
      console.log(`Converted to Kokoro language: ${kokoroLang || 'auto (null)'}`);
      setLangCode(kokoroLang);
      
      // If the language isn't supported, show a toast notification
      if (sourceLang && !kokoroLang) {
        toast.info(`Language "${sourceLang}" not directly supported for TTS. Using auto-detection.`);
      } else if (kokoroLang) {
        toast.success(`Using language: ${sourceLang} (${kokoroLang})`);
      }
    } else {
      // If no language provided, use auto-detection
      setLangCode(null);
      toast.info("No language specified, using auto-detection");
    }
    
    // Switch to the TTS tab
    setActiveTab("tts");
    
    // Force a fetch of voices
    fetchVoices();
    
    // Scroll to the TTS textarea and then the generate button
    setTimeout(() => {
      // First scroll to textarea
      const ttsTextarea = document.querySelector('[data-tts-textarea]');
      if (ttsTextarea) {
        ttsTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Then scroll to the generate button and add a subtle animation
      setTimeout(() => {
        const generateButton = document.querySelector('[data-tts-generate-button]');
        if (generateButton) {
          generateButton.scrollIntoView({ behavior: 'smooth', block: 'end' });
          generateButton.classList.add('animate-pulse');
          setTimeout(() => {
            generateButton.classList.remove('animate-pulse');
          }, 2000);
        }
      }, 500);
    }, 100);
  };

  // Update the sendToTextToSpeech function to ONLY set up the UI without auto-generating
  const sendToTextToSpeech = (text: string, sourceLang?: string) => {
    // First prepare the UI
    prepareForTTS(text, sourceLang);
    
    // Note: We intentionally don't auto-generate speech when coming from other tabs
    // The user will need to click the "Generate Speech" button in the TTS tab
    toast.info("Text prepared for TTS. Click 'Generate Speech' to create audio.");
  };

  // Add helper function to convert language codes to Kokoro format
  const convertToKokoroLangCode = (langCode: string): string | null => {
    if (!langCode) return null;
    
    // List of languages supported by Kokoro with their actual internal codes
    const supportedLanguages = [
      "a", "b", "e", "f", "h", "i", "p", "j", "z", "ko"
    ];
    
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
  };

  // Add useEffect hooks to save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_isUsingCombination', isUsingCombination.toString());
    }
  }, [isUsingCombination]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_selectedVoices', JSON.stringify(selectedVoices));
    }
  }, [selectedVoices]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_isStreaming', isStreaming.toString());
    }
  }, [isStreaming]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_selectedModel', selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_responseFormat', responseFormat);
    }
  }, [responseFormat]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_autoPlay', autoPlay.toString());
    }
  }, [autoPlay]);

  // Add useEffect for voice weights to persist them
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(voiceWeights).length > 0) {
      localStorage.setItem('tts_voiceWeights', JSON.stringify(voiceWeights));
    }
  }, [voiceWeights]);

  // Add useEffect for selected voice
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_selectedVoice', selectedVoice);
    }
  }, [selectedVoice]);

  // Add useEffect for speed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_speed', ttsSpeed.toString());
    }
  }, [ttsSpeed]);

  // Load voice weights from storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWeights = localStorage.getItem('tts_voiceWeights');
      if (savedWeights) {
        try {
          setVoiceWeights(JSON.parse(savedWeights));
        } catch (e) {
          console.error('Error parsing saved voice weights:', e);
        }
      }
    }
  }, []);

  if (!media) return null;

  const isAudio = media.mimeType?.includes("audio");
  const isVideo = media.mimeType?.includes("video");

  const formatDate = (date: number) => {
    return new Date(date)
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(",", "");
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "N/A";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return (
      <Badge variant="outline" className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400">
        Pending
      </Badge>
    );
    
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400">
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300">
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300">
            Completed
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300">
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400">
            {status}
          </Badge>
        );
    }
  };

  const copyToClipboard = () => {
    if (media.transcriptionText) {
      navigator.clipboard.writeText(media.transcriptionText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Use the refreshed URL if available, otherwise use the original URL
  const currentFileUrl = refreshedFileUrl || media?.fileUrl;

  // Only show transcription and related tabs if transcription is completed
  const showTranscriptionTabs = media.transcriptionStatus === "completed" && media.transcriptionText;

  // Transcription reference component to reuse across tabs
  const TranscriptionReference = ({ tab }: { tab: string }) => {
    if (!media?.transcriptionText) return null;
    
    return (
      <Accordion
        type="multiple"
        value={openAccordion[tab]}
        onValueChange={(value) => handleAccordionChange(tab, value)}
        className="w-full mb-4"
      >
        <AccordionItem value="transcription-original" className="border rounded-md shadow-sm overflow-hidden bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
          <AccordionTrigger className="px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-200">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 dark:text-gray-200">Original Transcription</span>
              {media.detectedLanguage && (
                <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 dark:from-blue-900/20 dark:to-indigo-900/20 dark:text-blue-300 dark:border-blue-800">
                  {media.detectedLanguage}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950">
            <div className="max-h-[200px] overflow-y-auto prose dark:prose-invert border-l-2 border-l-indigo-200 dark:border-l-indigo-800 pl-3 mt-2 bg-white/50 dark:bg-gray-950/50 rounded-r">
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {media.transcriptionText}
              </p>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyToClipboard}
                className="text-xs bg-gradient-to-r from-gray-50 to-white hover:from-indigo-50 hover:to-blue-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-indigo-950/30 dark:hover:to-blue-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
              >
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => sendToTextToSpeech(media.transcriptionText || '', media.detectedLanguage)}
                className="text-xs bg-gradient-to-r from-gray-50 to-white hover:from-orange-50 hover:to-amber-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-orange-950/30 dark:hover:to-amber-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
              >
                <Volume2 className="h-3.5 w-3.5 mr-1" /> Text to Speech
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-gradient-to-b from-white via-white to-gray-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 border-gray-200 dark:border-gray-800 shadow-lg">
        <DialogHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 pb-4 border-b border-gray-100 dark:border-gray-800 -mx-6 px-6">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-800 bg-clip-text text-transparent dark:from-white dark:to-gray-200">
            {media.name}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Uploaded on <span className="text-indigo-600 dark:text-indigo-400 font-medium">{formatDate(media._creationTime)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 my-4">
          {/* Media Info */}
          <div className="flex flex-wrap gap-4 text-sm mb-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-100 dark:border-gray-800">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>{" "}
              <span className="text-gray-600 dark:text-gray-400">{media.mimeType}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Size:</span>{" "}
              <span className="text-gray-600 dark:text-gray-400">{formatFileSize(media.size)}</span>
            </div>
            {media.duration && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span>{" "}
                <span className="text-gray-600 dark:text-gray-400">{formatDuration(media.duration)}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Transcription:</span>{" "}
              {getStatusBadge(media.transcriptionStatus)}
            </div>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 p-1 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950 rounded-lg">
              <TabsTrigger 
                value="media" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Media
              </TabsTrigger>
              <TabsTrigger 
                value="transcription" 
                disabled={!showTranscriptionTabs}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Transcription
              </TabsTrigger>
              <TabsTrigger 
                value="enhancement" 
                disabled={!showTranscriptionTabs}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Enhancement
              </TabsTrigger>
              <TabsTrigger 
                value="translation" 
                disabled={!showTranscriptionTabs}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Translation
              </TabsTrigger>
              <TabsTrigger 
                value="tts" 
                disabled={!showTranscriptionTabs}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Text to Speech
              </TabsTrigger>
              <TabsTrigger 
                value="tts-highlight" 
                disabled={!showTranscriptionTabs}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Word Highlighting
              </TabsTrigger>
            </TabsList>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-4">
              {/* Original media card content */}
              
              {/* Add transcription reference if completed */}
              {media.transcriptionStatus === "completed" && media.transcriptionText && (
                <TranscriptionReference tab="media" />
              )}
              
              <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-md">
                <CardContent className="p-0">
                  <div className="border-0 rounded-lg overflow-hidden bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col justify-center items-center">
                    {isAudio && currentFileUrl && (
                      <div className="p-6 flex justify-center items-center min-h-[120px] w-full bg-gradient-to-r from-indigo-900/20 via-gray-900 to-indigo-900/20">
                        <audio
                          ref={audioRef}
                          src={currentFileUrl}
                          controls
                          className="w-full max-w-full"
                          controlsList="nodownload"
                          preload="metadata"
                          autoPlay={false}
                        />
                      </div>
                    )}
                    {isVideo && currentFileUrl ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="w-full bg-gradient-to-b from-gray-900/50 to-black p-4 flex justify-center relative">
                          <video
                            ref={videoRef}
                            controls
                            className="max-w-full w-auto rounded-md shadow-lg"
                            style={{ 
                              maxHeight: videoHeight ? `${videoHeight}px` : '60vh', 
                              display: 'block',
                              margin: '0 auto'
                            }}
                            controlsList="nodownload"
                            preload="metadata"
                            playsInline
                            autoPlay={false}
                            crossOrigin="anonymous"
                            onLoadedMetadata={() => {
                              setIsVideoLoading(false);
                            }}
                            onCanPlay={() => {
                              setIsVideoLoading(false);
                              setErrorDetails(null);
                            }}
                            onLoadStart={() => {
                              setIsVideoLoading(true);
                            }}
                            onError={(e) => {
                              setIsVideoLoading(false);
                              
                              if (videoRef.current && videoRef.current.error && videoRef.current.error.code) {
                                const errorCode = videoRef.current.error.code;
                                const errorMessage = videoRef.current.error.message;
                                
                                let userMessage = "Error playing video";
                                
                                switch(errorCode) {
                                  case 1: userMessage = "Media playback was aborted"; break;
                                  case 2: userMessage = "Network error occurred while loading media"; break;
                                  case 3: userMessage = "Media decoding failed - this format may not be supported by your browser"; break;
                                  case 4: userMessage = "Media source not found or access denied"; break;
                                }
                                
                                setErrorDetails(`${userMessage}${errorMessage ? ` (${errorMessage})` : ''}`);
                              }
                            }}
                          >
                            <source src={currentFileUrl} type={media.mimeType} />
                            <source src={currentFileUrl} type="video/mp4" />
                            <source src={currentFileUrl} type="video/webm" />
                            <source src={currentFileUrl} type="video/quicktime" />
                            Your browser does not support the video tag.
                          </video>
                        </div>
                        
                        {/* Add loading indicator while video is loading */}
                        {isVideoLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-8 w-8 animate-spin text-white" />
                              <p className="text-white text-sm">Loading video...</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Only show error message if it's a real error and video isn't loading */}
                        {errorDetails && !isVideoLoading && (
                          <div className="p-3 mt-3 bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-900/20 text-red-800 dark:text-red-200 text-sm rounded-md w-full mx-4 text-center border border-red-200 dark:border-red-800/50 shadow-sm">
                            {errorDetails}
                            <div className="flex justify-center mt-3 space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={refreshFileUrl}
                                disabled={isRefreshing}
                                className="bg-white hover:bg-red-50 dark:bg-gray-950 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300"
                              >
                                {isRefreshing ? "Refreshing..." : "Refresh URL"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="bg-white hover:bg-blue-50 dark:bg-gray-950 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300"
                              >
                                <a href={currentFileUrl} target="_blank" rel="noopener noreferrer">
                                  Open in Browser
                                </a>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                asChild
                                className="bg-white hover:bg-green-50 dark:bg-gray-950 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300"
                              >
                                <a 
                                  href={currentFileUrl} 
                                  download={media.name || "video.mp4"}
                                >
                                  Download
                                </a>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isVideo && !currentFileUrl && (
                      <div className="p-6 flex justify-center items-center min-h-[200px] w-full bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white">
                        <span className="text-gray-300 mr-2">Video URL not available</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={refreshFileUrl}
                          disabled={isRefreshing}
                          className="border-gray-700 hover:border-blue-700 text-gray-300 hover:text-blue-300 bg-transparent hover:bg-blue-900/20"
                        >
                          {isRefreshing ? "Refreshing..." : "Refresh URL"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Transcription Status */}
              {media.transcriptionStatus === "pending" && (
                <Card className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-gray-200 dark:border-gray-800 shadow-sm">
                  <CardContent className="pt-4 text-center">
                    <p className="text-gray-700 dark:text-gray-300">Transcription is pending. Please check back later.</p>
                  </CardContent>
                </Card>
              )}
              
              {media.transcriptionStatus === "processing" && (
                <Card className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-gray-200 dark:border-gray-800 shadow-sm">
                  <CardContent className="pt-4 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500 dark:text-indigo-400" />
                    <p className="text-gray-700 dark:text-gray-300">Transcription is being processed. Please check back later.</p>
                  </CardContent>
                </Card>
              )}
              
              {media.transcriptionStatus === "error" && (
                <Card className="p-4 bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-900/20 dark:to-red-900/10 border-red-200 dark:border-red-900/30 shadow-sm">
                  <CardContent className="pt-4 text-center text-red-800 dark:text-red-300">
                    <p>There was an error processing the transcription.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Transcription Tab */}
            <TabsContent value="transcription" className="space-y-4">
              {media.transcriptionStatus === "completed" && media.transcriptionText && (
                <Card>
                  <CardHeader className="bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-950 pb-3">
                    <CardTitle className="flex justify-between items-center">
                      <span className="bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent dark:from-gray-200 dark:to-white">Original Transcription</span>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={copyToClipboard}
                          className="bg-gradient-to-r from-gray-50 to-white hover:from-indigo-50 hover:to-blue-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-indigo-950/30 dark:hover:to-blue-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
                        >
                          {copied ? "Copied!" : "Copy to Clipboard"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => sendToTextToSpeech(media.transcriptionText || '', media.detectedLanguage)}
                          className="bg-gradient-to-r from-gray-50 to-white hover:from-orange-50 hover:to-amber-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-orange-950/30 dark:hover:to-amber-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
                        >
                          <Volume2 className="h-3.5 w-3.5 mr-1" /> Text to Speech
                        </Button>
                      </div>
                    </CardTitle>
                    {media.detectedLanguage && (
                      <CardDescription className="text-gray-600 dark:text-gray-400">
                        Detected Language: <span className="text-indigo-600 dark:text-indigo-400 font-medium">{media.detectedLanguage}</span>
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90 pt-4">
                    <div className="max-h-[300px] overflow-y-auto prose dark:prose-invert border border-gray-100 dark:border-gray-800 rounded-md p-3 bg-white dark:bg-gray-950 shadow-inner">
                      <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                        {media.transcriptionText}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Enhancement Tab */}
            <TabsContent value="enhancement" className="space-y-4">
              {media.transcriptionStatus === "completed" && media.transcriptionText && (
                <>
                  <TranscriptionReference tab="enhancement" />
                  
                  <Card>
                    <CardContent className="pt-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90">
                      <GrammarCheckPanel 
                        text={media.transcriptionText} 
                        label="Grammar Check"
                        language={media.detectedLanguage}
                        onTextToSpeech={(text) => sendToTextToSpeech(text, media.detectedLanguage)}
                      />
                    </CardContent>
                  </Card>
                  
                  <Card className="mt-6 overflow-hidden">
                    <CardContent className="pt-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90">
                      <AIEnhancementPanel 
                        mediaId={media._id} 
                        text={media.transcriptionText} 
                        label="AI Enhancement"
                        onTextToSpeech={(text) => sendToTextToSpeech(text, media.detectedLanguage)}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Translation Tab */}
            <TabsContent value="translation" className="space-y-4">
              {media.transcriptionStatus === "completed" && media.transcriptionText && (
                <>
                  <TranscriptionReference tab="translation" />
                  
                  <Card>
                    <CardHeader className="bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-950 pb-3">
                      <CardTitle className="bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent dark:from-gray-200 dark:to-white">Translation</CardTitle>
                      <CardDescription className="text-gray-600 dark:text-gray-400">
                        Translate the transcription to another language
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90 pt-4">
                      <TranslationPanel
                        mediaId={media._id}
                        detectedLanguage={media.detectedLanguage}
                        translations={media.translations}
                        onTextToSpeech={(text) => sendToTextToSpeech(text, media.detectedLanguage)}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* TTS Tab */}
            <TabsContent value="tts" className="space-y-4">
              {media.transcriptionStatus === "completed" && (
                <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                  <Card>
                    <CardHeader className="bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-950 pb-3">
                      <CardTitle className="bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent dark:from-gray-200 dark:to-white">
                        Text to Speech
                      </CardTitle>
                      <CardDescription className="text-gray-600 dark:text-gray-400">
                        Convert text to speech with Kokoro
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90 pt-4 space-y-6">
                      <Textarea
                        placeholder="Enter text to convert to speech..."
                        className="min-h-[250px] resize-none bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
                        value={ttsText}
                        onChange={(e) => setTtsText(e.target.value)}
                        data-tts-textarea
                      />
                      
                      {ttsAudioUrl && (
                        <div className="pt-4 space-y-2">
                          <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                            <audio 
                              ref={ttsAudioRef} 
                              controls 
                              className="w-full" 
                              onPlay={() => setIsTtsPlaying(true)}
                              onPause={() => setIsTtsPlaying(false)}
                              onEnded={() => setIsTtsPlaying(false)}
                            >
                              <source src={ttsAudioUrl} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                            
                            <div className="flex justify-center gap-4 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={togglePlayPause}
                                className="flex items-center gap-1"
                              >
                                {isTtsPlaying ? (
                                  <><Pause className="h-4 w-4" /> Pause</>
                                ) : (
                                  <><Play className="h-4 w-4" /> Play</>
                                )}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                className="flex items-center gap-1"
                              >
                                <Download className="h-4 w-4" /> Download {responseFormat.toUpperCase()}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">TTS Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* TTS Settings */}
                        <div className="mb-4 border rounded-md p-3">
                          <h3 className="font-medium mb-2">TTS Settings</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="mb-3">
                                <div className="flex justify-between items-center">
                                  <label className="block text-sm font-medium mb-1">Voice</label>
                                  {isUsingCombination && (
                                    <Badge variant="outline" className="ml-2">
                                      Using Combination
                                    </Badge>
                                  )}
                                </div>
                                {!isUsingCombination ? (
                                  <Select 
                                    value={selectedVoice} 
                                    onValueChange={setSelectedVoice}
                                    disabled={kokoroStatus !== "online"}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select a voice" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto">
                                      {ttsVoices.length > 0 ? (
                                        ttsVoices.map((voice) => (
                                          <SelectItem 
                                            key={voice.name} 
                                            value={voice.name}
                                          >
                                            {voice.display_name}
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="p-2 text-center text-sm text-muted-foreground">
                                          No voices available
                                        </div>
                                      )}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                                    {ttsVoices.length > 0 ? (
                                      <div className="space-y-2">
                                        {ttsVoices.map((voice) => (
                                          <div key={voice.name} className="flex items-center justify-between">
                                            <div className="flex items-center">
                                              <Checkbox 
                                                id={`voice-${voice.name}`}
                                                checked={selectedVoices.includes(voice.name)}
                                                onCheckedChange={() => toggleVoiceSelection(voice.name)}
                                              />
                                              <label 
                                                htmlFor={`voice-${voice.name}`}
                                                className="ml-2 text-sm"
                                              >
                                                {voice.display_name}
                                              </label>
                                            </div>
                                            {selectedVoices.includes(voice.name) && (
                                              <input
                                                type="number"
                                                min="0.1"
                                                max="10.0"
                                                step="0.1"
                                                value={voiceWeights[voice.name]}
                                                onChange={(e) => updateVoiceWeight(voice.name, parseFloat(e.target.value) || 1.0)}
                                                className="w-16 text-sm p-1 border rounded"
                                              />
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground p-2">No voices available</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center space-x-3 mb-3">
                                <Switch
                                  id="use-combination"
                                  checked={isUsingCombination}
                                  onCheckedChange={setIsUsingCombination}
                                />
                                <label htmlFor="use-combination" className="text-sm">
                                  Use voice combination
                                </label>
                              </div>
                              
                              <div className="flex items-center space-x-3 mb-3">
                                <Switch
                                  id="use-streaming"
                                  checked={isStreaming}
                                  onCheckedChange={setIsStreaming}
                                />
                                <label htmlFor="use-streaming" className="text-sm">
                                  Stream audio
                                </label>
                              </div>
                            </div>
                            
                            <div>
                              <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Model</label>
                                <Select 
                                  value={selectedModel} 
                                  onValueChange={setSelectedModel}
                                  disabled={kokoroStatus !== "online" || ttsModels.length === 0}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a model" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ttsModels.length > 0 ? (
                                      ttsModels.map((model) => (
                                        <SelectItem 
                                          key={model.id} 
                                          value={model.id}
                                        >
                                          {model.id}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="p-2 text-center text-sm text-muted-foreground">
                                        No models available
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Format</label>
                                <Select
                                  value={responseFormat}
                                  onValueChange={setResponseFormat}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="mp3">MP3</SelectItem>
                                    <SelectItem value="wav">WAV</SelectItem>
                                    <SelectItem value="ogg">OGG</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="mb-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-sm font-medium">Speed: {ttsSpeed.toFixed(1)}x</label>
                                </div>
                                <Slider 
                                  value={[ttsSpeed]} 
                                  min={0.5} 
                                  max={2.0} 
                                  step={0.1} 
                                  onValueChange={(values) => setTtsSpeed(values[0])} 
                                />
                              </div>

                              <div className="flex items-center space-x-3 mb-3">
                                <Switch
                                  id="auto-play"
                                  checked={autoPlay}
                                  onCheckedChange={setAutoPlay}
                                />
                                <label htmlFor="auto-play" className="text-sm">
                                  Auto-play
                                </label>
                              </div>

                              <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Language</label>
                                <Select
                                  value={langCode || "auto"}
                                  onValueChange={(val) => setLangCode(val === "auto" ? null : val)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Auto detect" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto">Auto detect (recommended)</SelectItem>
                                    <SelectItem value="a">English - American (a)</SelectItem>
                                    <SelectItem value="b">English - British (b)</SelectItem>
                                    <SelectItem value="e">Spanish (e)</SelectItem>
                                    <SelectItem value="f">French (f)</SelectItem>
                                    <SelectItem value="i">Italian (i)</SelectItem>
                                    <SelectItem value="p">Portuguese (p)</SelectItem>
                                    <SelectItem value="j">Japanese (j)</SelectItem>
                                    <SelectItem value="z">Chinese (z)</SelectItem>
                                    <SelectItem value="h">Hindi (h)</SelectItem>
                                    <SelectItem value="ko">Korean (ko)</SelectItem>
                                  </SelectContent>
                                </Select>
                                {langCode && !["a", "b", "e", "f", "h", "i", "p", "j", "z", "ko"].includes(langCode) && (
                                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                                    Warning: Language code may not be supported. Consider using Auto detect.
                                  </p>
                                )}
                                {langCode === null && (
                                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                    Auto detection will choose the best language based on the text.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Generate Button */}
                        <Button 
                          onClick={handleGenerateSpeech}
                          disabled={isTtsLoading || !ttsText.trim() || kokoroStatus === "offline"}
                          className="w-full"
                          data-tts-generate-button
                        >
                          {isTtsLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Generating...
                            </>
                          ) : kokoroStatus === "offline" ? (
                            <>
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Kokoro Offline
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-4 w-4 mr-2" />
                              Generate Speech
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TTS Highlight Tab */}
            <TabsContent value="tts-highlight" className="space-y-4">
              {media.transcriptionStatus === "completed" && (
                <TtsHighlightPanel 
                  text={media.transcriptionText} 
                  label="Word-Level Text Highlighting"
                  onTextToSpeech={(text) => sendToTextToSpeech(text, media.detectedLanguage)}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Add alert message when Kokoro is offline */}
        {kokoroStatus === "offline" && (
          <div className="p-2 mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded">
            Unable to connect to the Kokoro TTS server. Check that it's running at localhost:8880.
          </div>
        )}

        <DialogFooter className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 pt-4 border-t border-gray-100 dark:border-gray-800 -mx-6 px-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-gradient-to-r from-gray-50 to-white hover:from-red-50 hover:to-red-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-red-950/30 dark:hover:to-red-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 