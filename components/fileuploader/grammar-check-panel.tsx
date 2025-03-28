"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requestGrammarCorrection } from "@/actions/grammerChecker/grammar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, AlertTriangle, SpellCheck, Copy, CheckCircle2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";

interface Correction {
  message: string;
  offset: number;
  length: number;
  replacement: string;
}

interface GrammarCheckPanelProps {
  mediaId: Id<"media">;
  text?: string;
  label?: string;
  language?: string;
  onTextToSpeech?: (text: string, language?: string) => void;
}

export function GrammarCheckPanel({ text = "", label, language, onTextToSpeech }: GrammarCheckPanelProps) {
  const { user } = useUser();
  const [jobId, setJobId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [correctedText, setCorrectedText] = useState<string>("");
  
  // Query for grammar check result
  const grammarCheck = useQuery(
    api.grammar.getGrammarCheckById, 
    jobId ? { jobId } : "skip"
  );

  // Apply corrections to create the corrected text once we have results
  useEffect(() => {
    if (grammarCheck?.corrections && grammarCheck.corrections.length > 0 && text) {
      let textWithCorrections = text;
      
      // Sort corrections by offset in descending order to avoid offset shifts
      const sortedCorrections = [...grammarCheck.corrections].sort((a, b) => b.offset - a.offset);
      
      // Apply each correction from end to start
      sortedCorrections.forEach((correction: Correction) => {
        const before = textWithCorrections.substring(0, correction.offset);
        const after = textWithCorrections.substring(correction.offset + correction.length);
        textWithCorrections = before + correction.replacement + after;
      });
      
      setCorrectedText(textWithCorrections);
    } else {
      setCorrectedText("");
    }
  }, [grammarCheck, text]);

  const handleGrammarCheck = async () => {
    if (!text.trim() || !user) return;
    
    setIsChecking(true);
    const toastId = toast.loading("Starting grammar check...", { duration: Infinity }) as string;
    
    try {
      // Pass the language parameter if available
      const newJobId = await requestGrammarCorrection(text, language);
      setJobId(newJobId);
      
      // Update toast to processing
      toast.loading("Processing grammar check...", { id: toastId });
      
      // Store the toast ID to dismiss it later when we get a status update
      if (newJobId) {
        localStorage.setItem(`grammarToast_${newJobId}`, toastId);
      }
    } catch (err) {
      toast.error("Failed to start grammar check. Please try again.", { id: toastId });
      console.error("Grammar check error:", err);
      setIsChecking(false);
    }
  };

  // Show status updates via toast
  useEffect(() => {
    if (!grammarCheck) return;

    // Get the stored toast ID for this job
    const toastId = jobId ? localStorage.getItem(`grammarToast_${jobId}`) : null;

    if (grammarCheck.status === "completed") {
      // Dismiss the loading toast if it exists
      if (toastId) {
        toast.dismiss(toastId);
        localStorage.removeItem(`grammarToast_${jobId}`);
      }
      
      toast.success(
        `Grammar check completed with ${grammarCheck.corrections?.length || 0} suggestions`
      );
      setIsChecking(false);
    } else if (grammarCheck.status === "error" && grammarCheck.error) {
      // Dismiss the loading toast if it exists
      if (toastId) {
        toast.dismiss(toastId);
        localStorage.removeItem(`grammarToast_${jobId}`);
      }
      
      toast.error(`Grammar check failed: ${grammarCheck.error}`);
      setIsChecking(false);
    } else if (grammarCheck.status === "processing" && toastId) {
      // Update the processing toast to ensure it's showing the right message
      toast.loading("Processing grammar check...", { id: toastId });
    }
  }, [grammarCheck, jobId]);

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

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const copyToClipboard = () => {
    if (correctedText) {
      navigator.clipboard.writeText(correctedText);
      toast.success("Corrected text copied to clipboard");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <SpellCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            <span className="bg-gradient-to-r from-emerald-700 to-green-700 bg-clip-text text-transparent dark:from-emerald-400 dark:to-green-400">
              {label || "Grammar Check"}
            </span>
          </h3>
          {language && language !== 'auto' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
              Using rules for language: <span className="font-medium text-emerald-600 dark:text-emerald-400">{language}</span>
            </p>
          )}
        </div>
        <Button
          onClick={handleGrammarCheck}
          disabled={!text.trim() || !user || isChecking}
          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-md dark:shadow-emerald-900/30 transition-all hover:shadow-lg hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-md"
        >
          {isChecking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Check Grammar
            </>
          )}
        </Button>
      </div>

      {grammarCheck && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="p-4 overflow-hidden border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 shadow-md">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-800/70">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Grammar Check Results</h4>
                {getStatusBadge(grammarCheck.status)}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {grammarCheck.status === "completed" ? "Completed" : "Last updated"} at: {formatDate(grammarCheck.completedAt || grammarCheck.createdAt)}
              </span>
            </div>

            {grammarCheck.error ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-md flex items-start border border-red-100 dark:border-red-900/30"
              >
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{grammarCheck.error}</p>
              </motion.div>
            ) : grammarCheck.status === "completed" ? (
              <div className="space-y-4">
                {grammarCheck.corrections && grammarCheck.corrections.length > 0 ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-sm mb-2 flex flex-wrap items-center gap-x-1 bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-md"
                    >
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        Found {grammarCheck.corrections.length} grammar or style {grammarCheck.corrections.length === 1 ? "issue" : "issues"}
                      </span>
                      {grammarCheck.detectedLanguage && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          (detected language: <span className="font-medium">{grammarCheck.detectedLanguage}</span>)
                        </span>
                      )}
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border border-gray-100 dark:border-gray-800 shadow-sm"
                    >
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 px-4 py-2 border-b border-emerald-100 dark:border-emerald-900/30">
                        <h5 className="font-medium text-emerald-800 dark:text-emerald-300">Corrected Text</h5>
                      </div>
                      <div className="p-4">
                        <p className="whitespace-pre-wrap text-sm mb-3 text-gray-800 dark:text-gray-200 leading-relaxed">{correctedText}</p>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyToClipboard}
                            className="flex items-center gap-1 text-xs bg-gradient-to-r from-gray-50 to-white hover:from-emerald-50 hover:to-green-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-emerald-950/30 dark:hover:to-green-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy corrected text
                          </Button>
                          {onTextToSpeech && correctedText && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs rounded-md"
                              onClick={() => onTextToSpeech?.(correctedText || text || '', language)}
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
                      transition={{ delay: 0.3 }}
                    >
                      <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Detailed corrections:</h5>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto rounded-md border border-gray-200 dark:border-gray-800 p-2 shadow-inner bg-gray-50 dark:bg-gray-900/50">
                        {grammarCheck.corrections.map((correction, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + (i * 0.05) }}
                            className="text-sm border rounded-md p-3 bg-gradient-to-r from-amber-50 to-amber-100/70 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800/40"
                          >
                            <div className="font-medium text-amber-800 dark:text-amber-300">{correction.message}</div>
                            <div className="text-xs mt-2 flex flex-wrap items-center gap-2">
                              <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded line-through">
                                {text.substring(correction.offset, correction.offset + correction.length)}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">→</span>
                              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                {correction.replacement}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-md border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 flex items-center justify-center"
                  >
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="text-sm font-medium">No grammar or style issues found!</p>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 mb-4">
                  <Loader2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400 animate-spin" />
                </div>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Checking grammar and style...
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
} 