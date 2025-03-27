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
          <div className="border rounded-lg overflow-hidden bg-black flex justify-center">
            {isAudio && media.fileUrl && (
              <div className="p-4 flex justify-center items-center min-h-[100px] w-full bg-gray-900">
                <audio
                  ref={audioRef}
                  src={media.fileUrl}
                  controls
                  className="w-full max-w-full"
                  controlsList="nodownload"
                  preload="metadata"
                  autoPlay={false}
                />
              </div>
            )}
            {isVideo && media.fileUrl && (
              <video
                ref={videoRef}
                src={media.fileUrl}
                controls
                className="w-auto max-w-full"
                style={{ maxHeight: videoHeight ? `${videoHeight}px` : '60vh' }}
                controlsList="nodownload"
                preload="metadata"
                autoPlay={false}
              />
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