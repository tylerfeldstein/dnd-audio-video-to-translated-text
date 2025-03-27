"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Id } from "@/convex/_generated/dataModel";

interface Translation {
  targetLanguage: string;
  translatedText: string;
  translatedAt: number;
}

interface TranslationPanelProps {
  mediaId: Id<"media">;
  sourceText: string;
  detectedLanguage?: string;
  translations?: Translation[];
}

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "pt", name: "Portuguese" },
];

export function TranslationPanel({ mediaId, sourceText, detectedLanguage, translations = [] }: TranslationPanelProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find existing translation for selected language
  const currentTranslation = translations.find(t => t.targetLanguage === selectedLanguage);

  const handleTranslate = async () => {
    if (!selectedLanguage || !detectedLanguage) return;

    setIsTranslating(true);
    setError(null);

    try {
      // Send translation request to Inngest
      const response = await fetch("/api/inngest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "translation.requested",
          data: {
            mediaId,
            sourceText,
            sourceLanguage: detectedLanguage,
            targetLanguage: selectedLanguage,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start translation");
      }
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
          disabled={!selectedLanguage || isTranslating || selectedLanguage === detectedLanguage}
        >
          {isTranslating ? "Translating..." : "Translate"}
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