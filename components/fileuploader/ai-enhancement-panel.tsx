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
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PROMPT_TYPES } from "@/actions/aiEnhanceTool/promptTypes";
import { requestAIEnhancement } from "@/actions/aiEnhanceTool/enhance";

// Default model name for Ollama
const OLLAMA_MODEL = "mistral";

interface AIEnhancementPanelProps {
  mediaId: Id<"media">;
  text: string; // Text to enhance (original transcription or translation)
  label?: string;
}

export function AIEnhancementPanel({ mediaId, text, label = "AI Enhancement" }: AIEnhancementPanelProps) {
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
        return <Badge variant="outline">Pending</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Completed</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
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
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">{label}</h3>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select
            value={selectedPromptType}
            onValueChange={setSelectedPromptType}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select enhancement type" />
            </SelectTrigger>
            <SelectContent>
              {PROMPT_TYPES.map((promptType) => (
                <SelectItem
                  key={promptType.id}
                  value={promptType.id}
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
        >
          {currentEnhancement?.status === "pending" || currentEnhancement?.status === "processing" || isEnhancing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enhancing...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Enhance
            </>
          )}
        </Button>
      </div>

      {selectedPromptType && (
        <div className="text-sm text-gray-500">
          {PROMPT_TYPES.find(p => p.id === selectedPromptType)?.description}
        </div>
      )}

      {currentEnhancement && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                {PROMPT_TYPES.find(p => p.id === currentEnhancement.promptType)?.name || "AI Enhancement"}
              </h4>
              {getStatusBadge(currentEnhancement.status)}
            </div>
            <span className="text-xs text-gray-500">
              {currentEnhancement.status === "completed" ? "Enhanced" : "Last updated"} at: {formatDate(currentEnhancement.enhancedAt)}
            </span>
          </div>

          {currentEnhancement.error ? (
            <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{currentEnhancement.error}</p>
            </div>
          ) : (
            <>
              {currentEnhancement.status === "completed" ? (
                <div className="space-y-4">
                  <div className="border rounded p-3 bg-gray-50 dark:bg-gray-900">
                    <h5 className="font-medium mb-2">Enhanced Text</h5>
                    <p className="whitespace-pre-wrap text-sm mb-2">{currentEnhancement.enhancedText}</p>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(currentEnhancement.enhancedText)}>
                      Copy enhanced text
                    </Button>
                  </div>
                  
                  <div>
                    <h5 className="font-medium mb-2">Using Model: {currentEnhancement.modelName}</h5>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <p className="text-sm">Enhancing text with AI...</p>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
} 