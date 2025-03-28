"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Id } from "@/convex/_generated/dataModel";
import { TranslationPanel } from "./translation-panel";
import { GrammarCheckPanel } from "./grammar-check-panel";
import { AIEnhancementPanel } from "./ai-enhancement-panel";
import { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Initialize the Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface Media {
  _id: Id<"media">;
  _creationTime: number;
  name: string;
  fileId: Id<"_storage">;
  size: number;
  mimeType: string;
  description?: string;
  fileUrl?: string;
  userId: string;
  transcriptionStatus?: string;
  transcriptionText?: string;
  transcribedAt?: number;
  duration?: number;
  detectedLanguage?: string;
  translations?: Array<{
    targetLanguage: string;
    translatedText: string;
    translatedAt: number;
  }>;
}

interface MediaDialogProps {
  media: Media | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaDialog({ media, isOpen, onClose }: MediaDialogProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [refreshedFileUrl, setRefreshedFileUrl] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<Record<string, string[]>>({
    transcription: ["transcription-original"],
    media: [],
    enhancement: [],
    translation: []
  });
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Calculate optimal video height based on screen size
  useEffect(() => {
    const calculateVideoHeight = () => {
      if (isOpen) {
        // Get available height (subtract space for dialog chrome, info, and transcription)
        const viewportHeight = window.innerHeight;
        // Use 60% of viewport height as a maximum for the video, but no more than 600px
        const maxHeight = Math.min(Math.floor(viewportHeight * 0.6), 600);
        setVideoHeight(maxHeight);
      }
    };

    calculateVideoHeight();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateVideoHeight);
    
    return () => {
      window.removeEventListener('resize', calculateVideoHeight);
    };
  }, [isOpen]);

  // Reset copied state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  // When opening the dialog, scroll to top
  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure dialog is rendered
      setTimeout(() => {
        const dialogContent = document.querySelector('[data-slot="dialog-content"]');
        if (dialogContent) {
          dialogContent.scrollTop = 0;
        }
      }, 10);
      
      // Reset to media tab when dialog opens
      setActiveTab("media");
    }
  }, [isOpen]);

  // Update the useEffect for media loading to handle large files better
  useEffect(() => {
    if (isOpen && media) {
      // Reset state when opening dialog
      setErrorDetails(null);
      setRefreshedFileUrl(null);
      setIsVideoLoading(true);
      
      const fileUrl = refreshedFileUrl || media.fileUrl;
      if (fileUrl) {
        if (media.mimeType?.includes("video") && videoRef.current) {
          videoRef.current.load();
        } else if (media.mimeType?.includes("audio") && audioRef.current) {
          audioRef.current.load();
        }
      }
    }
  }, [isOpen, media, refreshedFileUrl]);

  // Function to refresh the file URL
  const refreshFileUrl = async () => {
    if (!media || !media.fileId) return;
    
    setIsRefreshing(true);
    try {
      // Use convex client to get a fresh URL
      const freshUrl = await convex.query(api.media.getFileUrl, { 
        storageId: media.fileId 
      });
      
      if (freshUrl) {
        setRefreshedFileUrl(freshUrl);
        setErrorDetails(null);
      } else {
        setErrorDetails("Could not refresh file URL");
      }
    } catch (err) {
      console.error("Error refreshing file URL:", err);
      setErrorDetails("Error refreshing file URL");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle accordion state change
  const handleAccordionChange = (tab: string, value: string[]) => {
    setOpenAccordion(prev => ({
      ...prev,
      [tab]: value
    }));
  };

  if (!media) return null;

  const isAudio = media.mimeType?.includes("audio");
  const isVideo = media.mimeType?.includes("video");

  const formatDate = (date: number) => {
    return new Date(date)
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(",", "");
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "N/A";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return (
      <Badge variant="outline" className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400">
        Pending
      </Badge>
    );
    
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400">
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300">
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
        return (
          <Badge variant="outline" className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400">
            {status}
          </Badge>
        );
    }
  };

  const copyToClipboard = () => {
    if (media.transcriptionText) {
      navigator.clipboard.writeText(media.transcriptionText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Use the refreshed URL if available, otherwise use the original URL
  const currentFileUrl = refreshedFileUrl || media?.fileUrl;

  // Only show transcription and related tabs if transcription is completed
  const showTranscriptionTabs = media.transcriptionStatus === "completed" && media.transcriptionText;

  // Transcription reference component to reuse across tabs
  const TranscriptionReference = ({ tab }: { tab: string }) => {
    if (!media?.transcriptionText) return null;
    
    return (
      <Accordion
        type="multiple"
        value={openAccordion[tab]}
        onValueChange={(value) => handleAccordionChange(tab, value)}
        className="w-full mb-4"
      >
        <AccordionItem value="transcription-original" className="border rounded-md shadow-sm overflow-hidden bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
          <AccordionTrigger className="px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-200">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 dark:text-gray-200">Original Transcription</span>
              {media.detectedLanguage && (
                <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 dark:from-blue-900/20 dark:to-indigo-900/20 dark:text-blue-300 dark:border-blue-800">
                  {media.detectedLanguage}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-2 bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950">
            <div className="max-h-[200px] overflow-y-auto prose dark:prose-invert border-l-2 border-l-indigo-200 dark:border-l-indigo-800 pl-3 mt-2 bg-white/50 dark:bg-gray-950/50 rounded-r">
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {media.transcriptionText}
              </p>
            </div>
            <div className="mt-3 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyToClipboard}
                className="text-xs bg-gradient-to-r from-gray-50 to-white hover:from-indigo-50 hover:to-blue-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-indigo-950/30 dark:hover:to-blue-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
              >
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-gradient-to-b from-white via-white to-gray-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 border-gray-200 dark:border-gray-800 shadow-lg">
        <DialogHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 pb-4 border-b border-gray-100 dark:border-gray-800 -mx-6 px-6">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-800 bg-clip-text text-transparent dark:from-white dark:to-gray-200">
            {media.name}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Uploaded on <span className="text-indigo-600 dark:text-indigo-400 font-medium">{formatDate(media._creationTime)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 my-4">
          {/* Media Info */}
          <div className="flex flex-wrap gap-4 text-sm mb-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-100 dark:border-gray-800">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>{" "}
              <span className="text-gray-600 dark:text-gray-400">{media.mimeType}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Size:</span>{" "}
              <span className="text-gray-600 dark:text-gray-400">{formatFileSize(media.size)}</span>
            </div>
            {media.duration && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span>{" "}
                <span className="text-gray-600 dark:text-gray-400">{formatDuration(media.duration)}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Transcription:</span>{" "}
              {getStatusBadge(media.transcriptionStatus)}
            </div>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 p-1 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950 rounded-lg">
              <TabsTrigger 
                value="media" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Media
              </TabsTrigger>
              <TabsTrigger 
                value="transcription" 
                disabled={!showTranscriptionTabs}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Transcription
              </TabsTrigger>
              <TabsTrigger 
                value="enhancement" 
                disabled={!showTranscriptionTabs}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Enhancement
              </TabsTrigger>
              <TabsTrigger 
                value="translation" 
                disabled={!showTranscriptionTabs}
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-indigo-600 transition-all duration-300"
              >
                Translation
              </TabsTrigger>
            </TabsList>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-4">
              {/* Original media card content */}
              
              {/* Add transcription reference if completed */}
              {media.transcriptionStatus === "completed" && media.transcriptionText && (
                <TranscriptionReference tab="media" />
              )}
              
              <Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-md">
                <CardContent className="p-0">
                  <div className="border-0 rounded-lg overflow-hidden bg-gradient-to-b from-gray-900 via-black to-gray-900 flex flex-col justify-center items-center">
                    {isAudio && currentFileUrl && (
                      <div className="p-6 flex justify-center items-center min-h-[120px] w-full bg-gradient-to-r from-indigo-900/20 via-gray-900 to-indigo-900/20">
                        <audio
                          ref={audioRef}
                          src={currentFileUrl}
                          controls
                          className="w-full max-w-full"
                          controlsList="nodownload"
                          preload="metadata"
                          autoPlay={false}
                        />
                      </div>
                    )}
                    {isVideo && currentFileUrl ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="w-full bg-gradient-to-b from-gray-900/50 to-black p-4 flex justify-center relative">
                          <video
                            ref={videoRef}
                            controls
                            className="max-w-full w-auto rounded-md shadow-lg"
                            style={{ 
                              maxHeight: videoHeight ? `${videoHeight}px` : '60vh', 
                              display: 'block',
                              margin: '0 auto'
                            }}
                            controlsList="nodownload"
                            preload="metadata"
                            playsInline
                            autoPlay={false}
                            crossOrigin="anonymous"
                            onLoadedMetadata={() => {
                              setIsVideoLoading(false);
                            }}
                            onCanPlay={() => {
                              setIsVideoLoading(false);
                              setErrorDetails(null);
                            }}
                            onLoadStart={() => {
                              setIsVideoLoading(true);
                            }}
                            onError={(e) => {
                              setIsVideoLoading(false);
                              
                              if (videoRef.current && videoRef.current.error && videoRef.current.error.code) {
                                const errorCode = videoRef.current.error.code;
                                const errorMessage = videoRef.current.error.message;
                                
                                let userMessage = "Error playing video";
                                
                                switch(errorCode) {
                                  case 1: userMessage = "Media playback was aborted"; break;
                                  case 2: userMessage = "Network error occurred while loading media"; break;
                                  case 3: userMessage = "Media decoding failed - this format may not be supported by your browser"; break;
                                  case 4: userMessage = "Media source not found or access denied"; break;
                                }
                                
                                setErrorDetails(`${userMessage}${errorMessage ? ` (${errorMessage})` : ''}`);
                              }
                            }}
                          >
                            <source src={currentFileUrl} type={media.mimeType} />
                            <source src={currentFileUrl} type="video/mp4" />
                            <source src={currentFileUrl} type="video/webm" />
                            <source src={currentFileUrl} type="video/quicktime" />
                            Your browser does not support the video tag.
                          </video>
                        </div>
                        
                        {/* Add loading indicator while video is loading */}
                        {isVideoLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-8 w-8 animate-spin text-white" />
                              <p className="text-white text-sm">Loading video...</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Only show error message if it's a real error and video isn't loading */}
                        {errorDetails && !isVideoLoading && (
                          <div className="p-3 mt-3 bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-900/20 text-red-800 dark:text-red-200 text-sm rounded-md w-full mx-4 text-center border border-red-200 dark:border-red-800/50 shadow-sm">
                            {errorDetails}
                            <div className="flex justify-center mt-3 space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={refreshFileUrl}
                                disabled={isRefreshing}
                                className="bg-white hover:bg-red-50 dark:bg-gray-950 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300"
                              >
                                {isRefreshing ? "Refreshing..." : "Refresh URL"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="bg-white hover:bg-blue-50 dark:bg-gray-950 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300"
                              >
                                <a href={currentFileUrl} target="_blank" rel="noopener noreferrer">
                                  Open in Browser
                                </a>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                asChild
                                className="bg-white hover:bg-green-50 dark:bg-gray-950 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300"
                              >
                                <a 
                                  href={currentFileUrl} 
                                  download={media.name || "video.mp4"}
                                >
                                  Download
                                </a>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : isVideo && !currentFileUrl && (
                      <div className="p-6 flex justify-center items-center min-h-[200px] w-full bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white">
                        <span className="text-gray-300 mr-2">Video URL not available</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={refreshFileUrl}
                          disabled={isRefreshing}
                          className="border-gray-700 hover:border-blue-700 text-gray-300 hover:text-blue-300 bg-transparent hover:bg-blue-900/20"
                        >
                          {isRefreshing ? "Refreshing..." : "Refresh URL"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Transcription Status */}
              {media.transcriptionStatus === "pending" && (
                <Card className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-gray-200 dark:border-gray-800 shadow-sm">
                  <CardContent className="pt-4 text-center">
                    <p className="text-gray-700 dark:text-gray-300">Transcription is pending. Please check back later.</p>
                  </CardContent>
                </Card>
              )}
              
              {media.transcriptionStatus === "processing" && (
                <Card className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-gray-200 dark:border-gray-800 shadow-sm">
                  <CardContent className="pt-4 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500 dark:text-indigo-400" />
                    <p className="text-gray-700 dark:text-gray-300">Transcription is being processed. Please check back later.</p>
                  </CardContent>
                </Card>
              )}
              
              {media.transcriptionStatus === "error" && (
                <Card className="p-4 bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-900/20 dark:to-red-900/10 border-red-200 dark:border-red-900/30 shadow-sm">
                  <CardContent className="pt-4 text-center text-red-800 dark:text-red-300">
                    <p>There was an error processing the transcription.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Transcription Tab */}
            <TabsContent value="transcription" className="space-y-4">
              {media.transcriptionStatus === "completed" && media.transcriptionText && (
                <Card>
                  <CardHeader className="bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-950 pb-3">
                    <CardTitle className="flex justify-between items-center">
                      <span className="bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent dark:from-gray-200 dark:to-white">Original Transcription</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={copyToClipboard}
                        className="bg-gradient-to-r from-gray-50 to-white hover:from-indigo-50 hover:to-blue-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-indigo-950/30 dark:hover:to-blue-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
                      >
                        {copied ? "Copied!" : "Copy to Clipboard"}
                      </Button>
                    </CardTitle>
                    {media.detectedLanguage && (
                      <CardDescription className="text-gray-600 dark:text-gray-400">
                        Detected Language: <span className="text-indigo-600 dark:text-indigo-400 font-medium">{media.detectedLanguage}</span>
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90 pt-4">
                    <div className="max-h-[300px] overflow-y-auto prose dark:prose-invert border border-gray-100 dark:border-gray-800 rounded-md p-3 bg-white dark:bg-gray-950 shadow-inner">
                      <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                        {media.transcriptionText}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Enhancement Tab */}
            <TabsContent value="enhancement" className="space-y-4">
              {media.transcriptionStatus === "completed" && media.transcriptionText && (
                <>
                  <TranscriptionReference tab="enhancement" />
                  
                  <Card>
                    <CardContent className="pt-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90">
                      <GrammarCheckPanel 
                        text={media.transcriptionText} 
                        label="Grammar Check"
                        language={media.detectedLanguage}
                      />
                    </CardContent>
                  </Card>
                  
                  <Card className="mt-6 overflow-hidden">
                    <CardContent className="pt-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90">
                      <AIEnhancementPanel 
                        mediaId={media._id} 
                        text={media.transcriptionText} 
                        label="AI Enhancement"
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Translation Tab */}
            <TabsContent value="translation" className="space-y-4">
              {media.transcriptionStatus === "completed" && media.transcriptionText && (
                <>
                  <TranscriptionReference tab="translation" />
                  
                  <Card>
                    <CardHeader className="bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-950 pb-3">
                      <CardTitle className="bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent dark:from-gray-200 dark:to-white">Translation</CardTitle>
                      <CardDescription className="text-gray-600 dark:text-gray-400">
                        Translate the transcription to another language
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90 pt-4">
                      <TranslationPanel
                        mediaId={media._id}
                        detectedLanguage={media.detectedLanguage}
                        translations={media.translations}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 pt-4 border-t border-gray-100 dark:border-gray-800 -mx-6 px-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-gradient-to-r from-gray-50 to-white hover:from-red-50 hover:to-red-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-red-950/30 dark:hover:to-red-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 