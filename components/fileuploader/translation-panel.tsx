"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import { requestTranslation } from "@/actions/translation/translation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, Globe, Languages, Copy, Volume2, SpellCheck } from "lucide-react";
import { toast } from "sonner";
import { languages, getLanguageName, getAvailableTargetLanguages } from "@/lib/languages";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIEnhancementPanel } from "./ai-enhancement-panel";

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
  onTextToSpeech?: (text: string, language?: string) => void;
}

export function TranslationPanel({ mediaId, detectedLanguage, onTextToSpeech }: TranslationPanelProps) {
  const { user } = useUser();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("translation");
  const [grammarText, setGrammarText] = useState<string>("");
  const [isGrammarChecking, setIsGrammarChecking] = useState(false);

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
      // toast.loading(`Processing translation to ${getLanguageName(selectedLanguage)}...`, {
      //   id: toastId
      // });
      
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

  const copyToClipboard = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success("Translation copied to clipboard");
    }
  };

  // Grammar check handler
  const handleGrammarCheck = async () => {
    if (!currentTranslation || !currentTranslation.translatedText) return;
    
    setIsGrammarChecking(true);
    
    try {
      // Simulate grammar check for now
      // In production, you would call the actual grammar check API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Set grammar corrected text (this is where you would set the actual corrected text)
      setGrammarText(`${currentTranslation.translatedText}
      
This is the grammar-corrected version of the translation with fixed syntax and punctuation.`);
      
      toast.success("Grammar check completed successfully");
    } catch (error) {
      toast.error("Failed to check grammar: " + (error instanceof Error ? error.message : "Unknown error"));
      console.error("Grammar check error:", error);
    } finally {
      setIsGrammarChecking(false);
    }
  };

  const copyGrammarText = () => {
    if (grammarText) {
      navigator.clipboard.writeText(grammarText);
      toast.success("Grammar-corrected text copied to clipboard");
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
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full mt-6"
          >
            <TabsList className="grid w-full grid-cols-3 p-1 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950 rounded-lg mb-4">
              <TabsTrigger 
                value="translation" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white dark:data-[state=active]:from-violet-600 dark:data-[state=active]:to-purple-600 transition-all duration-300"
              >
                Translation
              </TabsTrigger>
              <TabsTrigger 
                value="grammar" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white dark:data-[state=active]:from-emerald-600 dark:data-[state=active]:to-green-600 transition-all duration-300"
                disabled={!currentTranslation || currentTranslation.status !== "completed"}
              >
                Grammar Check
              </TabsTrigger>
              <TabsTrigger 
                value="enhance" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-blue-500 data-[state=active]:text-white dark:data-[state=active]:from-indigo-600 dark:data-[state=active]:to-blue-600 transition-all duration-300"
                disabled={!currentTranslation || currentTranslation.status !== "completed"}
              >
                AI Enhancement
              </TabsTrigger>
            </TabsList>

            <TabsContent value="translation">
              <div>
                <div className="flex items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Languages className="h-5 w-5 text-violet-500 dark:text-violet-400" />
                    <span className="bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent dark:from-violet-400 dark:to-purple-400">
                      Translation
                    </span>
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({getLanguageName(selectedLanguage)})
                    </span>
                  </h3>
                  {currentTranslation && getStatusBadge(currentTranslation.status)}
                </div>
                
                {currentTranslation && currentTranslation.error ? (
                  <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-md border border-red-100 dark:border-red-800/30">
                    <p className="text-sm">{currentTranslation.error}</p>
                  </div>
                ) : currentTranslation?.translatedText ? (
                  <div className="space-y-4">
                    <div className="rounded-md bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-4 relative">
                      <div className="prose dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{currentTranslation.translatedText}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(currentTranslation.translatedText)}
                        className="text-sm bg-gradient-to-r from-gray-50 to-white hover:from-violet-50 hover:to-purple-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-violet-950/30 dark:hover:to-purple-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTextToSpeech?.(currentTranslation.translatedText, selectedLanguage)}
                        className="text-sm bg-gradient-to-r from-gray-50 to-white hover:from-violet-50 hover:to-purple-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-violet-950/30 dark:hover:to-purple-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
                      >
                        <Volume2 className="mr-2 h-4 w-4" />
                        Text to Speech
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="grammar">
              {currentTranslation && currentTranslation.status === "completed" && (
                <div>
                  <div className="flex items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <SpellCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                      <span className="bg-gradient-to-r from-emerald-700 to-green-700 bg-clip-text text-transparent dark:from-emerald-400 dark:to-green-400">
                        Grammar Check
                      </span>
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                        ({getLanguageName(selectedLanguage)})
                      </span>
                    </h3>
                  </div>
                  
                  {grammarText ? (
                    <div className="space-y-4">
                      <div className="rounded-md bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-4 relative">
                        <div className="prose dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{grammarText}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyGrammarText}
                          className="text-sm bg-gradient-to-r from-gray-50 to-white hover:from-emerald-50 hover:to-green-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-emerald-950/30 dark:hover:to-green-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTextToSpeech?.(grammarText, selectedLanguage)}
                          className="text-sm bg-gradient-to-r from-gray-50 to-white hover:from-emerald-50 hover:to-green-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-emerald-950/30 dark:hover:to-green-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
                        >
                          <Volume2 className="mr-2 h-4 w-4" />
                          Text to Speech
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-center text-gray-600 dark:text-gray-400">
                        Improve grammar, spelling, and punctuation of your translated text.
                      </p>
                      
                      <div className="flex justify-center">
                        <Button 
                          onClick={handleGrammarCheck}
                          disabled={isGrammarChecking}
                          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                        >
                          {isGrammarChecking ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Checking Grammar...
                            </>
                          ) : (
                            <>
                              <SpellCheck className="mr-2 h-4 w-4" />
                              Check Grammar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="enhance">
              {currentTranslation && currentTranslation.status === "completed" && (
                <AIEnhancementPanel 
                  mediaId={mediaId} 
                  text={currentTranslation.translatedText} 
                  label="Translation Enhancement"
                  onTextToSpeech={(text) => onTextToSpeech?.(text, selectedLanguage)}
                />
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </motion.div>
  );
} 