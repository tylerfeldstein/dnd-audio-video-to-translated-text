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

interface Translation {
  targetLanguage: string;
  translatedText: string;
  translatedAt: number;
}

interface TranslationPanelProps {
  mediaId: Id<"media">;
  detectedLanguage?: string;
  translations?: Translation[];
}

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
];

export function TranslationPanel({ mediaId, detectedLanguage }: TranslationPanelProps) {
  const { user } = useUser();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to media updates to get real-time translation updates
  const media = useQuery(api.media.getMediaById, { mediaId });
  const translations = media?.translations || [];

  // Find existing translation for selected language
  const currentTranslation = translations.find(t => t.targetLanguage === selectedLanguage);

  const handleTranslate = async () => {
    if (!selectedLanguage || !user) return;

    setIsTranslating(true);
    setError(null);

    try {
      await requestTranslation({
        mediaId,
        targetLanguage: selectedLanguage,
        userId: user.id
      });
    } catch (err) {
      setError("Failed to start translation. Please try again.");
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
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
              {SUPPORTED_LANGUAGES.map((lang) => (
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
          disabled={!selectedLanguage || isTranslating || selectedLanguage === detectedLanguage || !user}
        >
          {isTranslating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            "Translate"
          )}
        </Button>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {currentTranslation && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">
              Translation ({SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name})
            </h4>
            <span className="text-xs text-gray-500">
              Translated at: {formatDate(currentTranslation.translatedAt)}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm">
            {currentTranslation.translatedText}
          </p>
        </Card>
      )}
    </div>
  );
} 