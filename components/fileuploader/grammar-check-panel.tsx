"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requestGrammarCorrection } from "@/actions/grammerChecker/grammar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Correction {
  message: string;
  offset: number;
  length: number;
  replacement: string;
}

interface GrammarCheckPanelProps {
  text?: string;
  label?: string;
  language?: string; // Language code (e.g., 'en', 'es', 'fr')
}

export function GrammarCheckPanel({ text = "", label, language }: GrammarCheckPanelProps) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{label || "Grammar Check"}</h3>
          {language && language !== 'auto' && (
            <p className="text-xs text-gray-500 mt-1">
              Using rules for language: {language}
            </p>
          )}
        </div>
        <Button
          onClick={handleGrammarCheck}
          disabled={!text.trim() || !user || isChecking}
        >
          {isChecking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Check Grammar
            </>
          )}
        </Button>
      </div>

      {grammarCheck && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">Grammar Check Results</h4>
              {getStatusBadge(grammarCheck.status)}
            </div>
            <span className="text-xs text-gray-500">
              {grammarCheck.status === "completed" ? "Completed" : "Last updated"} at: {formatDate(grammarCheck.completedAt || grammarCheck.createdAt)}
            </span>
          </div>

          {grammarCheck.error ? (
            <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{grammarCheck.error}</p>
            </div>
          ) : grammarCheck.status === "completed" ? (
            <div className="space-y-4">
              {grammarCheck.corrections && grammarCheck.corrections.length > 0 ? (
                <>
                  <div className="text-sm mb-2 flex flex-wrap items-center gap-x-1">
                    <span>
                      Found {grammarCheck.corrections.length} grammar or style {grammarCheck.corrections.length === 1 ? "issue" : "issues"}
                    </span>
                    {grammarCheck.detectedLanguage && (
                      <span className="text-xs text-gray-500">
                        (detected language: {grammarCheck.detectedLanguage})
                      </span>
                    )}
                  </div>
                  
                  <div className="border rounded p-3 bg-gray-50 dark:bg-gray-900">
                    <h5 className="font-medium mb-2">Corrected Text</h5>
                    <p className="whitespace-pre-wrap text-sm mb-2">{correctedText}</p>
                    <Button size="sm" variant="outline" onClick={copyToClipboard}>
                      Copy corrected text
                    </Button>
                  </div>
                  
                  <div>
                    <h5 className="font-medium mb-2">Detailed corrections:</h5>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {grammarCheck.corrections.map((correction, i) => (
                        <div key={i} className="text-sm border rounded p-2 bg-amber-50 dark:bg-amber-900/20">
                          <div className="font-medium">{correction.message}</div>
                          <div className="text-xs mt-1">
                            <span className="line-through text-red-500">{text.substring(correction.offset, correction.offset + correction.length)}</span>
                            {" → "}
                            <span className="text-green-600">{correction.replacement}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-center py-4">No grammar or style issues found!</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <p className="text-sm">Checking grammar and style...</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
} 