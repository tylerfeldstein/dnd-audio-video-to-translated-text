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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Id } from "@/convex/_generated/dataModel";
import { TranslationPanel } from "./translation-panel";
import { GrammarCheckPanel } from "./grammar-check-panel";
import { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getVideoSupportInfo } from "@/utils/compression";

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
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [refreshedFileUrl, setRefreshedFileUrl] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [videoSupport, setVideoSupport] = useState<Record<string, boolean>>({});

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
    }
  }, [isOpen]);

  // Check video format support
  useEffect(() => {
    if (isOpen && media?.mimeType?.includes("video")) {
      setVideoSupport(getVideoSupportInfo());
    }
  }, [isOpen, media]);

  // Ensure media loads properly when dialog opens
  useEffect(() => {
    if (isOpen && media) {
      // Reset state when opening dialog
      setErrorDetails(null);
      setRefreshedFileUrl(null);
      
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
    if (!status) return <Badge variant="outline">Pending</Badge>;
    
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
        return <Badge variant="outline">{status}</Badge>;
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{media.name}</DialogTitle>
          <DialogDescription>
            Uploaded on {formatDate(media._creationTime)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 my-4">
          {/* Media Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="font-medium">Type:</span>{" "}
              {media.mimeType}
            </div>
            <div>
              <span className="font-medium">Size:</span>{" "}
              {formatFileSize(media.size)}
            </div>
            {media.duration && (
              <div>
                <span className="font-medium">Duration:</span>{" "}
                {formatDuration(media.duration)}
              </div>
            )}
            <div>
              <span className="font-medium">Transcription:</span>{" "}
              {getStatusBadge(media.transcriptionStatus)}
            </div>
          </div>

          {/* Media Player */}
          <div className="border rounded-lg overflow-hidden bg-black flex flex-col justify-center items-center">
            {isAudio && currentFileUrl && (
              <div className="p-4 flex justify-center items-center min-h-[100px] w-full bg-gray-900">
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
                <video
                  ref={videoRef}
                  controls
                  className="max-w-full w-auto"
                  style={{ 
                    maxHeight: videoHeight ? `${videoHeight}px` : '60vh', 
                    display: 'block',
                    margin: '0 auto'
                  }}
                  controlsList="nodownload"
                  preload="auto"
                  playsInline
                  autoPlay={false}
                  crossOrigin="anonymous"
                  onLoadedMetadata={() => console.log("Video metadata loaded successfully")}
                  onCanPlay={() => console.log("Video can play")}
                  onLoadStart={() => console.log("Video load started")}
                  onError={(e) => {
                    // Log detailed error information
                    console.error("Video error:", e);
                    if (videoRef.current) {
                      const errorCode = videoRef.current.error?.code;
                      const errorMessage = videoRef.current.error?.message;
                      console.error("Video error code:", errorCode);
                      console.error("Video error message:", errorMessage);
                      setErrorDetails(`Error playing video (${errorCode}): ${errorMessage || 'Unknown error'}`);
                    }
                  }}
                >
                  <source src={currentFileUrl} type={media.mimeType} />
                  <source src={currentFileUrl} type="video/mp4" />
                  <source src={currentFileUrl} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
                
                {errorDetails && (
                  <div className="p-2 mt-2 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 text-sm rounded-md w-full text-center">
                    {errorDetails}
                    <div className="flex justify-center mt-2 space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={refreshFileUrl}
                        disabled={isRefreshing}
                      >
                        {isRefreshing ? "Refreshing..." : "Refresh URL"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDebug(!showDebug)}
                      >
                        {showDebug ? "Hide Debug Info" : "Show Debug Info"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={currentFileUrl} target="_blank" rel="noopener noreferrer">
                          Open in New Tab
                        </a>
                      </Button>
                    </div>
                    
                    {showDebug && (
                      <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 text-left rounded overflow-auto max-h-[200px]">
                        <h4 className="font-semibold">Debug Information</h4>
                        <p><strong>Media Type:</strong> {media.mimeType}</p>
                        <p><strong>File URL:</strong> {currentFileUrl ? "Available" : "Not available"}</p>
                        <p><strong>File Size:</strong> {formatFileSize(media.size)}</p>
                        
                        <h4 className="font-semibold mt-2">Browser Video Support:</h4>
                        <ul className="list-disc pl-5">
                          {Object.entries(videoSupport).map(([format, supported]) => (
                            <li key={format} className={supported ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {format}: {supported ? "Supported" : "Not supported"}
                            </li>
                          ))}
                        </ul>
                        
                        <p className="mt-2"><strong>Note:</strong> The video may have been compressed during upload, which could affect compatibility.</p>
                        
                        <div className="mt-4">
                          <h4 className="font-semibold">Alternative Player:</h4>
                          <div className="bg-black p-2 mt-2 rounded">
                            <iframe 
                              src={currentFileUrl}
                              width="100%" 
                              height="200" 
                              allow="autoplay; fullscreen"
                              title="Video Player"
                              className="border-0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Add direct video controls even if no error */}
                <div className="mt-2 flex justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={currentFileUrl} target="_blank" rel="noopener noreferrer">
                      Open Video in New Tab
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a 
                      href={currentFileUrl} 
                      download={media.name || "video.mp4"}
                    >
                      Download Video
                    </a>
                  </Button>
                </div>
              </div>
            ) : isVideo && !currentFileUrl && (
              <div className="p-4 flex justify-center items-center min-h-[200px] w-full bg-gray-900 text-white">
                Video URL not available
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2" 
                  onClick={refreshFileUrl}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh URL"}
                </Button>
              </div>
            )}
          </div>

          {/* Transcription */}
          {media.transcriptionStatus === "completed" && media.transcriptionText && (
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Transcription</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyToClipboard}
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto prose dark:prose-invert">
                <p className="whitespace-pre-wrap text-sm">
                  {media.transcriptionText}
                </p>
              </div>

              {/* Add Grammar Check Panel for original transcription */}
              <div className="mt-6 pt-6 border-t">
                <GrammarCheckPanel 
                  text={media.transcriptionText} 
                  label="Original Transcription Grammar Check"
                  language={media.detectedLanguage}
                />
              </div>

              {/* Add Translation Panel */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-medium mb-4">Translation</h3>
                <TranslationPanel
                  mediaId={media._id}
                  detectedLanguage={media.detectedLanguage}
                  translations={media.translations}
                />
              </div>
            </div>
          )}
          
          {media.transcriptionStatus === "pending" && (
            <div className="text-center p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <p>Transcription is pending. Please check back later.</p>
            </div>
          )}
          
          {media.transcriptionStatus === "processing" && (
            <div className="text-center p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <p>Transcription is being processed. Please check back later.</p>
            </div>
          )}
          
          {media.transcriptionStatus === "error" && (
            <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300">
              <p>There was an error processing the transcription.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 