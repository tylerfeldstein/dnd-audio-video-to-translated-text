"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, AlertTriangle, Sparkles, Copy, BrainCircuit, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PROMPT_TYPES } from "@/actions/aiEnhanceTool/promptTypes";
import { requestAIEnhancement } from "@/actions/aiEnhanceTool/enhance";
import { motion } from "framer-motion";

// Default model name for Ollama
const OLLAMA_MODEL = "mistral";

interface AIEnhancementPanelProps {
  mediaId: Id<"media">;
  text: string; // Text to enhance (original transcription or translation)
  label?: string;
  onTextToSpeech?: (text: string, language?: string) => void;
}

export function AIEnhancementPanel({ mediaId, text, label = "AI Enhancement", onTextToSpeech }: AIEnhancementPanelProps) {
  const { user } = useUser();
  const [selectedPromptType, setSelectedPromptType] = useState<string>("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Subscribe to media updates to get real-time enhancement updates
  const media = useQuery(api.media.getMediaById, { mediaId });
  const enhancements = media?.enhancements || [];
  
  // Find existing enhancement for selected prompt type and text
  const currentEnhancement = enhancements.find(
    e => e.promptType === selectedPromptType && e.originalText === text
  );

  // Handle enhancement request
  const handleEnhance = async () => {
    if (!selectedPromptType || !text.trim() || !user) return;

    const promptType = PROMPT_TYPES.find(p => p.id === selectedPromptType);
    if (!promptType) {
      toast.error("Invalid prompt type selected");
      return;
    }

    setIsEnhancing(true);
    const toastId = toast.loading(
      `Starting AI enhancement: ${promptType.name}...`,
      { duration: Infinity }
    ) as string;  // Cast to string since toast.loading returns string | number

    try {
      const result = await requestAIEnhancement({
        mediaId,
        originalText: text,
        promptType: selectedPromptType,
        userId: user.id
      });
      
      if (!result.success) {
        toast.error(`Failed to start enhancement: ${result.error}`, {
          id: toastId
        });
        setIsEnhancing(false);
        return;
      }
      
      // Update the toast to show processing status
      toast.loading(`Processing AI enhancement with ${OLLAMA_MODEL}...`, {
        id: toastId
      });

      // Store the toast ID to dismiss it later when we get a status update
      localStorage.setItem(`enhanceToast_${mediaId.toString()}_${selectedPromptType}`, toastId);
    } catch (err) {
      toast.error("Failed to start enhancement. Please try again.", {
        id: toastId
      });
      console.error("Enhancement error:", err);
      setIsEnhancing(false);
    }
  };

  // Show status updates via toast
  useEffect(() => {
    if (!currentEnhancement) return;

    const { status, error, promptType } = currentEnhancement;
    const promptTypeObj = PROMPT_TYPES.find(p => p.id === promptType);
    const promptTypeName = promptTypeObj?.name || promptType;
    
    // Get the stored toast ID
    const toastId = localStorage.getItem(`enhanceToast_${mediaId.toString()}_${promptType}`);

    if (status === "completed") {
      // Dismiss the loading toast if it exists
      if (toastId) {
        toast.dismiss(toastId);
        localStorage.removeItem(`enhanceToast_${mediaId.toString()}_${promptType}`);
      }
      toast.success(`Successfully enhanced text: ${promptTypeName}`);
      setIsEnhancing(false);
    } else if (status === "error" && error) {
      // Dismiss the loading toast if it exists
      if (toastId) {
        toast.dismiss(toastId);
        localStorage.removeItem(`enhanceToast_${mediaId.toString()}_${promptType}`);
      }
      toast.error(`Enhancement failed: ${error}`);
      setIsEnhancing(false);
    }
  }, [currentEnhancement, mediaId]);

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400">
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 animate-pulse">
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
        return null;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const copyToClipboard = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success("Enhanced text copied to clipboard");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          <span className="bg-gradient-to-r from-indigo-700 to-blue-700 bg-clip-text text-transparent dark:from-indigo-400 dark:to-blue-400">
            {label}
          </span>
        </h3>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full">
          <Select
            value={selectedPromptType}
            onValueChange={setSelectedPromptType}
          >
            <SelectTrigger className="w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-all hover:border-indigo-300 dark:hover:border-indigo-700">
              <SelectValue placeholder="Select enhancement type" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              {PROMPT_TYPES.map((promptType) => (
                <SelectItem
                  key={promptType.id}
                  value={promptType.id}
                  className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors"
                >
                  {promptType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleEnhance}
          disabled={
            !selectedPromptType || 
            !text.trim() || 
            !user ||
            isEnhancing ||
            (currentEnhancement?.status === "pending" || currentEnhancement?.status === "processing")
          }
          className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-md dark:shadow-indigo-900/30 transition-all hover:shadow-lg hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md"
        >
          {currentEnhancement?.status === "pending" || currentEnhancement?.status === "processing" || isEnhancing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enhancing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Enhance
            </>
          )}
        </Button>
      </div>

      {selectedPromptType && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md border border-gray-100 dark:border-gray-800"
        >
          {PROMPT_TYPES.find(p => p.id === selectedPromptType)?.description}
        </motion.div>
      )}

      {currentEnhancement && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="p-4 overflow-hidden border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 shadow-md">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-800/70">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {PROMPT_TYPES.find(p => p.id === currentEnhancement.promptType)?.name || "AI Enhancement"}
                </h4>
                {getStatusBadge(currentEnhancement.status)}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentEnhancement.status === "completed" ? "Enhanced" : "Last updated"} at: {formatDate(currentEnhancement.enhancedAt)}
              </span>
            </div>

            {currentEnhancement.error ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-md flex items-start border border-red-100 dark:border-red-900/30"
              >
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{currentEnhancement.error}</p>
              </motion.div>
            ) : (
              <>
                {currentEnhancement.status === "completed" ? (
                  <div className="space-y-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border border-gray-100 dark:border-gray-800 shadow-sm"
                    >
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 px-4 py-2 border-b border-indigo-100 dark:border-indigo-900/30">
                        <h5 className="font-medium text-indigo-800 dark:text-indigo-300">Enhanced Text</h5>
                      </div>
                      <div className="p-4">
                        <p className="whitespace-pre-wrap text-sm mb-3 text-gray-800 dark:text-gray-200 leading-relaxed">{currentEnhancement.enhancedText}</p>
                        <div className="mt-3 flex flex-wrap gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(currentEnhancement.enhancedText)}
                            className="flex items-center gap-1 text-xs bg-gradient-to-r from-gray-50 to-white hover:from-indigo-50 hover:to-blue-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-indigo-950/30 dark:hover:to-blue-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </Button>
                          {onTextToSpeech && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs rounded-md"
                              onClick={() => onTextToSpeech?.(currentEnhancement.enhancedText, 'en')}
                            >
                              <Volume2 className="mr-1 h-3 w-3" />
                              Text to Speech
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-xs mt-2 p-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 rounded-md border border-gray-200 dark:border-gray-800"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        Using Model: <span className="font-medium text-indigo-600 dark:text-indigo-400">{currentEnhancement.modelName}</span>
                      </span>
                    </motion.div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/20 dark:to-blue-900/20 mb-4">
                      <Loader2 className="h-8 w-8 text-indigo-500 dark:text-indigo-400 animate-spin" />
                    </div>
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                      Enhancing text with AI using {PROMPT_TYPES.find(p => p.id === currentEnhancement.promptType)?.name}...
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
} 