"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { Loader2, ListFilter, Copy, Sparkles, ListTodo, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Mock data since there's no existing summaries functionality
// In a real implementation, this would come from the database
interface Summary {
  type: string; // "bullet" | "paragraph" | "tldr"
  content: string;
  generatedAt: number;
  status?: "pending" | "processing" | "completed" | "error";
  error?: string;
}

export function SummarizationPanel(): React.ReactNode {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<string>("bullet");
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  
  // Find summaries by type
  const bulletSummary = summaries.find(s => s.type === "bullet");
  const paragraphSummary = summaries.find(s => s.type === "paragraph");
  const tldrSummary = summaries.find(s => s.type === "tldr");
  
  // Only show type tabs that have summaries or are actively selected
  const availableTypes = [...new Set([
    ...summaries.map(s => s.type),
    activeTab
  ])];

  const handleSummarize = async (type: string) => {
    if (!user) return;
    
    setIsSummarizing(true);
    setActiveTab(type);
    
    const toastId = toast.loading(
      `Generating ${getSummaryTypeLabel(type).toLowerCase()} summary...`, 
      { duration: 3000 }
    ) as string;
    
    try {
      // In a real implementation, we would call an API or server action here
      // For now, we'll just simulate it with a timeout
      setTimeout(() => {
        const fakeSummary: Summary = {
          type,
          content: type === "bullet" 
            ? "- This is a bullet point summary\n- It contains multiple points\n- Each highlighting key information\n- The summary is concise and clear"
            : type === "paragraph"
              ? "This is a paragraph summary that provides a concise overview of the content. It covers all the main points while maintaining readability and flow. The summary is designed to give readers a quick understanding of the material without having to read the entire transcript."
              : "TL;DR: This is a very short summary of the content.",
          generatedAt: Date.now(),
          status: "completed"
        };
        
        setSummaries(prev => [...prev.filter(s => s.type !== type), fakeSummary]);
        setIsSummarizing(false);
        toast.success(`${getSummaryTypeLabel(type)} summary ready!`);
      }, 2000);
      
    } catch (err) {
      toast.error(`Failed to generate summary. Please try again.`, {
        id: toastId
      });
      console.error("Summarization error:", err);
      setIsSummarizing(false);
    }
  };
  
  const getSummaryTypeIcon = (type: string) => {
    switch (type) {
      case "bullet":
        return <ListTodo className="h-4 w-4" />;
      case "paragraph":
        return <FileText className="h-4 w-4" />;
      case "tldr":
        return <Sparkles className="h-4 w-4" />;
      default:
        return <ListFilter className="h-4 w-4" />;
    }
  };
  
  const getSummaryTypeLabel = (type: string) => {
    switch (type) {
      case "bullet":
        return "Bullet Points";
      case "paragraph":
        return "Paragraph";
      case "tldr":
        return "TL;DR";
      default:
        return type;
    }
  };
  
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
  
  const copyToClipboard = (content: string) => {
    if (content) {
      navigator.clipboard.writeText(content);
      toast.success("Summary copied to clipboard");
    }
  };
  
  // Helper to render summary content with appropriate formatting
  const renderSummaryContent = (summary: Summary) => {
    if (summary.type === "bullet") {
      // Split by bullet points and render as a list
      const points = summary.content
        .split(/(?:\r?\n|\r)/)
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.trim().replace(/^[-•]\s*/, ''));
      
      if (points.length > 0) {
        return (
          <ul className="space-y-2 mt-2 ml-5 list-disc">
            {points.map((point, index) => (
              <motion.li 
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                className="text-gray-800 dark:text-gray-200"
              >
                {point}
              </motion.li>
            ))}
          </ul>
        );
      }
    }
    
    // Default: render as paragraphs
    return (
      <p className="whitespace-pre-wrap text-sm mt-2 text-gray-800 dark:text-gray-200 leading-relaxed">
        {summary.content}
      </p>
    );
  };
  
  // For any summary type, return if it's in progress
  const isSummaryInProgress = (type: string) => {
    const summary = summaries.find(s => s.type === type);
    return isSummarizing && activeTab === type || 
           summary?.status === "pending" || 
           summary?.status === "processing";
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
          <ListFilter className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          <span className="bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
            Summarization
          </span>
        </h3>
      </div>

      <div className="space-y-4">
        <Card className="p-4 overflow-hidden border-gray-200 dark:border-gray-800 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 shadow-md">
          <div className="flex flex-wrap gap-3 mb-4">
            <Button
              variant="outline"
              size="sm"
              disabled={isSummaryInProgress("bullet")}
              onClick={() => handleSummarize("bullet")}
              className={`bg-gradient-to-r hover:from-amber-50 hover:to-amber-100 dark:hover:from-amber-900/20 dark:hover:to-amber-900/30 transition-all gap-1 ${
                bulletSummary?.status === "completed" 
                ? "border-amber-200 dark:border-amber-800 from-amber-50 to-amber-100/60 dark:from-amber-900/20 dark:to-amber-900/10 text-amber-700 dark:text-amber-300" 
                : "from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-gray-200 dark:border-gray-800"
              }`}
            >
              {isSummaryInProgress("bullet") ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <ListTodo className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">Bullet Points</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              disabled={isSummaryInProgress("paragraph")}
              onClick={() => handleSummarize("paragraph")}
              className={`bg-gradient-to-r hover:from-amber-50 hover:to-amber-100 dark:hover:from-amber-900/20 dark:hover:to-amber-900/30 transition-all gap-1 ${
                paragraphSummary?.status === "completed" 
                ? "border-amber-200 dark:border-amber-800 from-amber-50 to-amber-100/60 dark:from-amber-900/20 dark:to-amber-900/10 text-amber-700 dark:text-amber-300" 
                : "from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-gray-200 dark:border-gray-800"
              }`}
            >
              {isSummaryInProgress("paragraph") ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">Paragraph</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              disabled={isSummaryInProgress("tldr")}
              onClick={() => handleSummarize("tldr")}
              className={`bg-gradient-to-r hover:from-amber-50 hover:to-amber-100 dark:hover:from-amber-900/20 dark:hover:to-amber-900/30 transition-all gap-1 ${
                tldrSummary?.status === "completed" 
                ? "border-amber-200 dark:border-amber-800 from-amber-50 to-amber-100/60 dark:from-amber-900/20 dark:to-amber-900/10 text-amber-700 dark:text-amber-300" 
                : "from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-gray-200 dark:border-gray-800"
              }`}
            >
              {isSummaryInProgress("tldr") ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">TL;DR</span>
            </Button>
          </div>
          
          {availableTypes.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950 rounded-lg mb-4">
                {availableTypes.map(type => (
                  <TabsTrigger 
                    key={type} 
                    value={type}
                    disabled={!summaries.find(s => s.type === type)?.content}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white dark:data-[state=active]:from-amber-600 dark:data-[state=active]:to-orange-600"
                  >
                    <div className="flex items-center gap-1.5">
                      {getSummaryTypeIcon(type)}
                      <span>{getSummaryTypeLabel(type)}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {availableTypes.map(type => {
                const summary = summaries.find(s => s.type === type);
                return (
                  <TabsContent key={type} value={type} className="mt-0">
                    {summary ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex justify-between items-center pb-2 mb-3 border-b border-gray-100 dark:border-gray-800/70">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                              {getSummaryTypeIcon(type)}
                              <span>{getSummaryTypeLabel(type)}</span>
                            </h4>
                            {getStatusBadge(summary.status)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Generated: {formatDate(summary.generatedAt)}
                            </span>
                            {summary.status === "completed" && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => copyToClipboard(summary.content)}
                                className="h-7 px-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              >
                                <Copy className="h-3.5 w-3.5 mr-1.5" />
                                <span className="text-xs">Copy</span>
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {summary.status === "completed" && summary.content ? (
                          <div className="rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                            {renderSummaryContent(summary)}
                          </div>
                        ) : summary.status === "error" ? (
                          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-md border border-red-100 dark:border-red-800/30">
                            <p className="text-sm">{summary.error || "An error occurred while generating the summary."}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 px-4">
                            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 mb-4">
                              <Loader2 className="h-8 w-8 text-amber-500 dark:text-amber-400 animate-spin" />
                            </div>
                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                              Generating {getSummaryTypeLabel(type).toLowerCase()} summary...
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        <p>Select a summary type to get started.</p>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : (
            <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 p-6 rounded-lg border border-gray-100 dark:border-gray-800 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Click one of the buttons above to generate a summary.
              </p>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
} 