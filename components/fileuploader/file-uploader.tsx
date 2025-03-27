"use client";

import { useState, useRef, useCallback } from "react";
import clsx from "clsx";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertCircle, Upload } from "lucide-react";

import { uploadFileToConvex } from "@/actions/upload/uploadFileToConvex";

interface FileUploaderProps {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  className?: string;
  multiple?: boolean;
  userId: string;
}

export const FileUploader = ({
  onFilesSelected,
  accept = "application/pdf",
  className,
  multiple = false,
  userId,
}: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    success?: boolean;
    message?: string;
    uploadedFiles?: string[];
  }>({});
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    // Filter out non-PDF files
    const validFiles = files.filter(file => file.type.includes("pdf"));
    
    // If we rejected some files, show an error
    if (validFiles.length < files.length) {
      setError("Only PDF files are supported. Some files were not uploaded.");
    }
    
    // If we rejected all files, show a different error
    if (validFiles.length === 0 && files.length > 0) {
      setError("Only PDF files are supported. Please select PDF files.");
    }
    
    return validFiles;
  };

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      
      // Validate files first
      const validFiles = validateFiles(files);
      if (validFiles.length === 0) return;

      try {
        setIsUploading(true);
        setUploadStatus({});

        // Call onFilesSelected callback if provided
        onFilesSelected?.(validFiles);

        // Track uploaded file names
        const uploadedFiles: string[] = [];

        // Upload each file to Convex
        for (const file of validFiles) {
          const formData = new FormData();

          formData.append("file", file);
          formData.append("userId", userId);

          try {
            const result = await uploadFileToConvex(formData);

            if (result.success) {
              uploadedFiles.push(file.name);
            }
          } catch (fileError) {
            console.error("Error uploading file:", fileError);
            // Continue with other files even if one fails
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
          });

          // Refresh the receipt list after a short delay
          window.setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setUploadStatus({
            success: false,
            message: "No files were uploaded successfully",
          });
        }
      } catch (error) {
        console.error("Error uploading:", error);
        setUploadStatus({
          success: false,
          message: error instanceof Error ? error.message : "Upload failed",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onFilesSelected, userId]
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
              : "Drag and drop PDF files here, or click to select files"}
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
            Only PDF files are supported
          </p>
        </div>
      </div>

      {uploadStatus.message && (
        <div
          className={clsx(
            "p-4 rounded-md text-center",
            uploadStatus.success
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
          )}
        >
          {uploadStatus.message}

          {uploadStatus.uploadedFiles && uploadStatus.uploadedFiles.length > 0 && (
            <ul className="mt-2 text-sm text-left">
              {uploadStatus.uploadedFiles.map((fileName, index) => (
                <li key={index} className="mt-1">
                  ✓ {fileName}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
