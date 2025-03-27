"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface CompressionInfoAlertProps {
  isDev: boolean;
}

export const CompressionInfoAlert = ({ isDev }: CompressionInfoAlertProps) => {
  const handleScrollToTest = () => {
    document.getElementById('compression-test')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  return (
    <Alert variant="default" className="mb-6 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
      <InfoIcon className="h-4 w-4 text-blue-500" />
      <AlertTitle className="text-blue-700 dark:text-blue-300">About Media Compression</AlertTitle>
      <AlertDescription className="text-blue-600 dark:text-blue-400">
        <p>Files are compressed before uploading to save space and bandwidth. Compression quality depends on your browser and its security settings.</p>
        {isDev && (
          <p className="mt-2 text-sm">
            In development mode, compression may be limited.{" "}
            <button 
              className="text-blue-700 dark:text-blue-300 underline"
              onClick={handleScrollToTest}
            >
              View compatibility details
            </button>
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}; 