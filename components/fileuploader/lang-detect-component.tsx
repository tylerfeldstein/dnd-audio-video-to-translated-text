"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, Languages, Globe2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLanguageName } from "@/lib/languages";
import { motion } from "framer-motion";

interface LangDetectComponentProps {
  mediaId: Id<"media">;
}

export function LangDetectComponent({ mediaId }: LangDetectComponentProps) {
  const { user } = useUser();
  const [isDetecting, setIsDetecting] = useState(false);
  
  // Get the media data to check if language has been detected
  const media = useQuery(api.media.getMediaById, { mediaId });
  
  const handleDetectLanguage = async () => {
    if (!user) return;
    
    setIsDetecting(true);
    const toastId = toast.loading("Detecting language...");
    
    try {
      // In a real implementation, this would call a server action to trigger language detection
      // For now, we'll simulate it with a timeout
      setTimeout(() => {
        toast.success("Language detected successfully", { id: toastId });
        setIsDetecting(false);
      }, 2000);
      
      // The actual implementation would look something like:
      // await detectLanguage({ 
      //   mediaId, 
      //   userId: user.id 
      // });
    } catch (error) {
      console.error("Error detecting language:", error);
      toast.error("Failed to detect language. Please try again.", { id: toastId });
      setIsDetecting(false);
    }
  };
  
  const detectedLanguage = media?.detectedLanguage;
  const hasTranscription = !!media?.transcriptionText;
  const canDetect = hasTranscription && user && !isDetecting;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <div className="flex items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <span className="bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-cyan-400">
            Language Detection
          </span>
        </h3>
      </div>
      
      <Card className="p-4 overflow-hidden border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            {detectedLanguage ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 px-3 py-1">
                  <Check className="h-3.5 w-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">
                    Detected: <span className="bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent dark:from-blue-300 dark:to-cyan-300">{getLanguageName(detectedLanguage) || detectedLanguage}</span>
                  </span>
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Language code: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{detectedLanguage}</span>
                </span>
              </motion.div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {hasTranscription 
                  ? "Detect the language of your transcript to unlock translation features."
                  : "A transcript is required for language detection. Please generate a transcript first."}
              </p>
            )}
          </div>
          
          <Button 
            onClick={handleDetectLanguage} 
            disabled={!canDetect || !!detectedLanguage}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-md dark:shadow-blue-900/30 transition-all hover:shadow-lg hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {isDetecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Detecting...
              </>
            ) : detectedLanguage ? (
              <>
                <Languages className="mr-2 h-4 w-4" />
                Language Detected
              </>
            ) : (
              <>
                <Languages className="mr-2 h-4 w-4" />
                Detect Language
              </>
            )}
          </Button>
        </div>
        
        {!hasTranscription && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 p-3 border border-amber-200 dark:border-amber-900/50 rounded-md bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 text-amber-800 dark:text-amber-300 text-sm"
          >
            📝 You need to generate a transcript before detecting the language.
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
} 