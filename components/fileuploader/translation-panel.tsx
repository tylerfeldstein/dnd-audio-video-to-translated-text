"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Id } from "@/convex/_generated/dataModel";
import { requestTranslation } from "@/actions/translation/translation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, Globe, Languages, Copy } from "lucide-react";
import { toast } from "sonner";
import { languages, getLanguageName, getAvailableTargetLanguages } from "@/lib/languages";
import { Badge } from "@/components/ui/badge";
import { GrammarCheckPanel } from "./grammar-check-panel";
import { AIEnhancementPanel } from "./ai-enhancement-panel";
import { motion } from "framer-motion";

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
    ) as string;

    try {
      await requestTranslation({
        mediaId,
        targetLanguage: selectedLanguage,
        userId: user.id
      });
      
      // Update toast to show processing status
      toast.loading(`Processing translation to ${getLanguageName(selectedLanguage)}...`, {
        id: toastId
      });
      
      // Store the toast ID to dismiss it later when we get a status update
      localStorage.setItem(`translateToast_${mediaId.toString()}_${selectedLanguage}`, toastId);
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
    
    // Get the stored toast ID
    const toastId = localStorage.getItem(`translateToast_${mediaId.toString()}_${selectedLanguage}`);

    if (status === "completed") {
      // Dismiss the loading toast if it exists
      if (toastId) {
        toast.dismiss(toastId);
        localStorage.removeItem(`translateToast_${mediaId.toString()}_${selectedLanguage}`);
      }
      toast.success(`Successfully translated to ${language}`);
    } else if (status === "error" && error) {
      // Dismiss the loading toast if it exists
      if (toastId) {
        toast.dismiss(toastId);
        localStorage.removeItem(`translateToast_${mediaId.toString()}_${selectedLanguage}`);
      }
      toast.error(`Translation to ${language} failed: ${error}`);
    }
  }, [currentTranslation, selectedLanguage, mediaId]);

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
      toast.success("Translation copied to clipboard");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Languages className="h-5 w-5 text-violet-500 dark:text-violet-400" />
          <span className="bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent dark:from-violet-400 dark:to-purple-400">
            Translation
          </span>
        </h3>
        {detectedLanguage && (
          <Badge className="ml-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-100 dark:border-violet-800/50 text-violet-700 dark:text-violet-300">
            Source: {getLanguageName(detectedLanguage) || detectedLanguage}
          </Badge>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full">
          <Select
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
          >
            <SelectTrigger className="w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-all hover:border-violet-300 dark:hover:border-violet-700">
              <SelectValue placeholder="Select target language" />
            </SelectTrigger>
            <SelectContent className="max-h-[400px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              {availableLanguages.map((lang) => (
                <SelectItem
                  key={lang.code}
                  value={lang.code}
                  disabled={lang.code === detectedLanguage}
                  className={`hover:bg-violet-50 dark:hover:bg-violet-900/20 cursor-pointer transition-colors ${lang.code === detectedLanguage ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{lang.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({lang.code})</span>
                  </div>
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
          className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-md dark:shadow-violet-900/30 transition-all hover:shadow-lg hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md"
        >
          {currentTranslation?.status === "pending" || currentTranslation?.status === "processing" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <Globe className="mr-2 h-4 w-4" />
              Translate
            </>
          )}
        </Button>
      </div>

      {currentTranslation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="p-4 overflow-hidden border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 shadow-md">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-800/70">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Translation 
                  <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-purple-400 font-medium">
                    ({getLanguageName(selectedLanguage)})
                  </span>
                </h4>
                {getStatusBadge(currentTranslation.status)}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentTranslation.status === "completed" ? "Translated" : "Last updated"} at: {formatDate(currentTranslation.translatedAt)}
              </span>
            </div>
            
            {currentTranslation.error ? (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-md border border-red-100 dark:border-red-800/30">
                <p className="text-sm">{currentTranslation.error}</p>
              </div>
            ) : (
              <>
                {currentTranslation.status === "completed" && currentTranslation.translatedText ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border border-gray-100 dark:border-gray-800 shadow-sm">
                      <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 px-4 py-2 border-b border-violet-100 dark:border-violet-900/30">
                        <h5 className="font-medium text-violet-800 dark:text-violet-300 flex items-center justify-between">
                          <span>Translated Text</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => copyToClipboard(currentTranslation.translatedText)}
                            className="h-7 px-2 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            <span className="text-xs">Copy</span>
                          </Button>
                        </h5>
                      </div>
                      <div className="p-4">
                        <p className="whitespace-pre-wrap text-sm mb-2 text-gray-800 dark:text-gray-200 leading-relaxed">
                          {currentTranslation.translatedText}
                        </p>
                      </div>
                    </div>
                    
                    {/* Grammar Check for translated text - now wrapped with motion */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800/50"
                    >
                      <GrammarCheckPanel 
                        text={currentTranslation.translatedText} 
                        label={`${getLanguageName(selectedLanguage)} Grammar Check`}
                        language={selectedLanguage}
                      />
                    </motion.div>
                    
                    {/* AI Enhancement for translated text - now wrapped with motion */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800/50"
                    >
                      <AIEnhancementPanel 
                        mediaId={mediaId} 
                        text={currentTranslation.translatedText} 
                        label={`Enhance ${getLanguageName(selectedLanguage)} Translation`}
                      />
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 mb-4">
                      <Loader2 className="h-8 w-8 text-violet-500 dark:text-violet-400 animate-spin" />
                    </div>
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                      Translating to {getLanguageName(selectedLanguage)}...
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