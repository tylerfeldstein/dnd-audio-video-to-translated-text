"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { CircleCheck, FileType, Loader2 } from "lucide-react";

interface CompressionStatusProps {
  status: "idle" | "compressing" | "complete" | "error";
  originalSize?: number;
  compressedSize?: number;
  fileName?: string;
  fileType?: "audio" | "video";
  progress?: number;
  error?: string;
}

export const CompressionStatus = ({
  status,
  originalSize,
  compressedSize,
  fileName,
  fileType,
  progress = 0,
  error,
}: CompressionStatusProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  // Animate progress
  useEffect(() => {
    if (status === "compressing") {
      setAnimatedProgress(progress);
    } else if (status === "complete") {
      setAnimatedProgress(100);
    }
  }, [status, progress]);
  
  if (status === "idle") return null;
  
  // Format file sizes
  const formatSize = (size?: number) => {
    if (!size) return "Unknown";
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Calculate compression ratio and percentage
  const compressionRatio = originalSize && compressedSize 
    ? ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
    : null;
  
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-800 p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileType className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-sm truncate max-w-[200px]">
            {fileName || (fileType === "audio" ? "Audio file" : "Video file")}
          </span>
        </div>
        
        {status === "compressing" && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
            <span className="text-xs text-blue-500 font-medium">Compressing</span>
          </div>
        )}
        
        {status === "complete" && (
          <div className="flex items-center gap-1.5">
            <CircleCheck className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs text-green-500 font-medium">Compressed</span>
          </div>
        )}
        
        {status === "error" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-500 font-medium">Error</span>
          </div>
        )}
      </div>
      
      {status === "compressing" && (
        <Progress className="h-2 mb-2" value={animatedProgress} />
      )}
      
      {error && status === "error" && (
        <p className="text-xs text-red-500 mt-1 mb-1">{error}</p>
      )}
      
      {(status === "compressing" || status === "complete") && (
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Original: {formatSize(originalSize)}</span>
          {status === "complete" && compressedSize && (
            <>
              <span>Compressed: {formatSize(compressedSize)}</span>
              {compressionRatio && (
                <span>Saved: {compressionRatio}%</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}; 