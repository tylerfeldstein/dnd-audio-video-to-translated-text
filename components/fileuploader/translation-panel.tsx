"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Id } from "@/convex/_generated/dataModel";
import { requestTranslation } from "@/app/actions/translation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { languages, getLanguageName, getAvailableTargetLanguages } from "@/lib/languages";
import { Badge } from "@/components/ui/badge";

interface Translation {
  targetLanguage: string;
  translatedText: string;
  translatedAt: number;
  status?: "pending" | "processing" | "completed" | "error";
  error?: string;
}

interface TranslationPanelProps {
  mediaId: Id<"media">;
  detectedLanguage?: string;
  translations?: Translation[];
}

export function TranslationPanel({ mediaId, detectedLanguage }: TranslationPanelProps) {
  const { user } = useUser();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  // Subscribe to media updates to get real-time translation updates
  const media = useQuery(api.media.getMediaById, { mediaId });
  const translations = media?.translations || [];

  // Get available target languages based on detected language
  const availableLanguages = detectedLanguage 
    ? getAvailableTargetLanguages(detectedLanguage)
    : languages;

  // Find existing translation for selected language
  const currentTranslation = translations.find(t => t.targetLanguage === selectedLanguage);

  const handleTranslate = async () => {
    if (!selectedLanguage || !user) return;

    const toastId = toast.loading(
      `Starting translation to ${getLanguageName(selectedLanguage)}...`,
      { duration: Infinity }
    );

    try {
      await requestTranslation({
        mediaId,
        targetLanguage: selectedLanguage,
        userId: user.id
      });
      
      // Note: We don't dismiss the toast here since the translation is async
      // The success toast will be shown when the translation is completed
      // via the real-time updates from Convex
    } catch (err) {
      toast.error("Failed to start translation. Please try again.", {
        id: toastId
      });
      console.error("Translation error:", err);
    }
  };

  // Show status updates via toast
  React.useEffect(() => {
    if (!currentTranslation) return;

    const { status, error } = currentTranslation;
    const language = getLanguageName(selectedLanguage);

    if (status === "completed") {
      toast.success(`Successfully translated to ${language}`);
    } else if (status === "error" && error) {
      toast.error(`Translation to ${language} failed: ${error}`);
    }
  }, [currentTranslation, selectedLanguage]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target language" />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang) => (
                <SelectItem
                  key={lang.code}
                  value={lang.code}
                  disabled={lang.code === detectedLanguage}
                >
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleTranslate}
          disabled={
            !selectedLanguage || 
            selectedLanguage === detectedLanguage || 
            !user ||
            (currentTranslation?.status === "pending" || currentTranslation?.status === "processing")
          }
        >
          {currentTranslation?.status === "pending" || currentTranslation?.status === "processing" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            "Translate"
          )}
        </Button>
      </div>

      {currentTranslation && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                Translation ({getLanguageName(selectedLanguage)})
              </h4>
              {getStatusBadge(currentTranslation.status)}
            </div>
            <span className="text-xs text-gray-500">
              {currentTranslation.status === "completed" ? "Translated" : "Last updated"} at: {formatDate(currentTranslation.translatedAt)}
            </span>
          </div>
          {currentTranslation.error ? (
            <p className="text-sm text-red-500">{currentTranslation.error}</p>
          ) : (
            <p className="whitespace-pre-wrap text-sm">
              {currentTranslation.translatedText || "Translation in progress..."}
            </p>
          )}
        </Card>
      )}
    </div>
  );
} 