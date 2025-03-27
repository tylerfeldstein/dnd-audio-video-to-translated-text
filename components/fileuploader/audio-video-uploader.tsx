"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import clsx from "clsx";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertCircle, Upload, Settings, Info } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { uploadMediaToConvex } from "@/actions/upload/uploadMediaToConvex";
import { PulseLoader } from "react-spinners";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

interface FileUploaderProps {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  className?: string;
  multiple?: boolean;
  userId?: string;
}

interface UploadStatus {
  success?: boolean;
  message?: string;
  uploadedFiles?: string[];
  isUploading?: boolean;
  progress?: number;
  stage?: "idle" | "preparing" | "uploading" | "processing" | "completed" | "error";
}

export const FileUploader = ({
  onFilesSelected,
  accept = "audio/*,video/*",
  className,
  multiple = false,
  userId,
}: FileUploaderProps) => {
  const { user } = useUser();
  const actualUserId = userId || (user ? user.id : undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add chunking configuration state
  const [useChunking, setUseChunking] = useState<boolean>(false);
  const [chunkSize, setChunkSize] = useState<number>(10 * 1024 * 1024); // Default: 10MB
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
  // Define available chunk size options
  const chunkSizeOptions = [
    { label: "5 MB", value: 5 * 1024 * 1024 },
    { label: "10 MB", value: 10 * 1024 * 1024 },
    { label: "25 MB", value: 25 * 1024 * 1024 },
    { label: "50 MB", value: 50 * 1024 * 1024 },
    { label: "100 MB", value: 100 * 1024 * 1024 },
  ];

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const validateFiles = (files: File[]): File[] => {
    // Clear previous errors
    setError(null);
    
    // Filter out non-audio/video files
    const validFiles = files.filter(file => 
      file.type.includes("audio") || file.type.includes("video")
    );
    
    // If we rejected some files, show an error
    if (validFiles.length < files.length) {
      setError("Only audio and video files are supported. Some files were not uploaded.");
    }
    
    // If we rejected all files, show a different error
    if (validFiles.length === 0 && files.length > 0) {
      setError("Only audio and video files are supported. Please select audio or video files.");
    }
    
    return validFiles;
  };

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      if (!actualUserId) {
        setError("You must be logged in to upload files");
        return;
      }
      
      // Validate files first
      const validFiles = validateFiles(files);
      if (validFiles.length === 0) return;

      try {
        // Set uploading state
        setIsUploading(true);
        setUploadStatus({
          isUploading: true,
          progress: 0,
          stage: "uploading",
          message: "Uploading file..."
        });

        // Call onFilesSelected callback if provided
        onFilesSelected?.(validFiles);

        // Track uploaded file names
        const uploadedFiles: string[] = [];

        // Upload each file to Convex
        for (const file of validFiles) {
          // Use original file directly
          const fileToUpload = file;
          
          const formData = new FormData();
          formData.append("file", fileToUpload);
          formData.append("userId", actualUserId);
          
          // Add chunking configuration to the form data
          formData.append("useChunking", useChunking.toString());
          formData.append("chunkSize", chunkSize.toString());

          try {
            // Update status with file size info and chunking details
            setUploadStatus({
              isUploading: true,
              progress: 0,
              stage: "uploading",
              message: `Uploading ${fileToUpload.name}... (${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB)${
                useChunking ? ` with ${(chunkSize / (1024 * 1024)).toFixed(0)}MB chunks` : ''
              }`
            });

            // Start the upload
            const result = await uploadMediaToConvex(formData);

            if (result.success) {
              uploadedFiles.push(file.name);
              
              // Show complete status
              setUploadStatus({
                isUploading: false,
                progress: 100,
                stage: "completed",
                message: `${file.name} uploaded successfully!`
              });
            }
          } catch (fileError) {
            console.error("Error uploading file:", fileError);
            // Show error status
            setUploadStatus({
              isUploading: false,
              progress: 0,
              stage: "error",
              message: fileError instanceof Error ? fileError.message : "Upload failed"
            });
            
            // Wait a moment to show the error
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        if (uploadedFiles.length > 0) {
          setUploadStatus({
            success: true,
            message:
              uploadedFiles.length > 1
                ? `Successfully uploaded ${uploadedFiles.length} files and started processing`
                : "File uploaded successfully and processing started",
            uploadedFiles,
            stage: "completed",
            progress: 100
          });
        } else {
          setUploadStatus({
            success: false,
            message: "No files were uploaded successfully",
            stage: "error"
          });
        }
      } catch (error) {
        console.error("Error uploading:", error);
        setUploadStatus({
          success: false,
          message: error instanceof Error ? error.message : "Upload failed",
          stage: "error"
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onFilesSelected, actualUserId, validateFiles, useChunking, chunkSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const fileList = multiple ? Array.from(e.dataTransfer.files) : [e.dataTransfer.files[0]];

        handleUpload(fileList);
      }
    },
    [multiple, handleUpload]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const fileList = multiple ? Array.from(e.target.files) : [e.target.files[0]];

        handleUpload(fileList);
      }
    },
    [multiple, handleUpload]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Collapsible
        open={showAdvanced}
        onOpenChange={setShowAdvanced}
        className="mb-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium">Advanced Upload Settings</h3>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-1 h-auto">
              <span className="sr-only">Toggle</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="px-4 pb-4 pt-0">
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="chunking-toggle" className="text-sm font-medium">
                  Use Chunked Uploading
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>When enabled, large files will be split into smaller chunks for upload. This can help with very large files, but may cause issues with transcription if not processed correctly.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="chunking-toggle"
                checked={useChunking}
                onCheckedChange={setUseChunking}
                aria-label="Toggle chunked uploading"
              />
            </div>
            
            {useChunking && (
              <div className="grid gap-1.5">
                <Label htmlFor="chunk-size" className="text-sm font-medium">
                  Chunk Size
                </Label>
                <select
                  id="chunk-size"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  disabled={isUploading}
                >
                  {chunkSizeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Larger chunk sizes may improve upload speed but could be less reliable.
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      
      <div
        aria-label="File upload area"
        className={clsx(
          "border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200",
          isDragging
            ? "border-primary bg-primary/5 dark:bg-primary/10 scale-[1.02] shadow-lg"
            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
          isUploading && "opacity-75 cursor-not-allowed",
          className
        )}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <div className={clsx(
            "w-16 h-16 transition-all duration-200",
            isDragging 
              ? "text-primary animate-pulse" 
              : "text-gray-400"
          )}>
            {isDragging ? (
              <Upload className="w-16 h-16" />
            ) : (
              <svg
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            )}
          </div>
          <p className={clsx(
            "text-lg transition-all duration-200", 
            isDragging 
              ? "text-primary font-medium scale-105" 
              : "text-gray-600 dark:text-gray-300"
          )}>
            {isDragging 
              ? "Release to upload files" 
              : "Drag and drop audio/video files here, or click to select files"}
          </p>
          <input
            ref={fileInputRef}
            accept={accept}
            aria-hidden="true"
            className="hidden"
            disabled={isUploading}
            multiple={multiple}
            type="file"
            onChange={handleFileInputChange}
          />
          <Button
            className={clsx(
              "font-medium transition-all", 
              isDragging && "bg-primary hover:bg-primary/90"
            )}
            variant={isUploading ? "outline" : "default"}
            disabled={isUploading}
            onClick={handleButtonClick}
          >
            {isUploading ? "Uploading..." : multiple ? "Select files" : "Select file"}
          </Button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Audio files (MP3, WAV, etc.) and video files (MP4, MOV, etc.) are supported
          </p>
        </div>
      </div>

      {/* Upload Progress UI */}
      {uploadStatus.message && (
        <div className={clsx(
          "p-4 rounded-md",
          uploadStatus.success
            ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
            : "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
          uploadStatus.stage === "error" && "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
        )}>
          {uploadStatus.stage === "uploading" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PulseLoader size={8} color="#6366F1" />
                  <p className="font-medium">{uploadStatus.message}</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 dark:bg-indigo-500 progress-upload-pulse" 
                  style={{ width: '30%' }}
                ></div>
              </div>
            </div>
          )}

          {(uploadStatus.stage === "completed" || uploadStatus.stage === "error") && (
            <>
              <p className="font-medium">{uploadStatus.message}</p>
              {uploadStatus.uploadedFiles && uploadStatus.uploadedFiles.length > 0 && (
                <ul className="mt-2 text-sm text-left">
                  {uploadStatus.uploadedFiles.map((fileName, index) => (
                    <li key={index} className="mt-1">
                      ✓ {fileName}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Also provide the AudioVideoUploader component as a simple wrapper for compatibility
export const AudioVideoUploader = () => {
  const { user } = useUser();
  
  if (!user) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p className="font-medium">You must be logged in to upload files</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="mb-4 text-lg font-semibold">Upload Audio or Video</h2>
          <FileUploader userId={user?.id} />
        </div>
      </div>
    </>
  );
}; 