"use client";

import React, { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, XIcon } from "lucide-react";
import { motion } from "framer-motion";

interface CompressionInfoAlertProps {
  isDev: boolean;
}

export const CompressionInfoAlert = ({ isDev }: CompressionInfoAlertProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleScrollToTest = () => {
    document.getElementById('compression-test')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  if (!isVisible) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Alert 
        variant="default" 
        className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50/70 dark:from-blue-900/20 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800/60 rounded-lg shadow-sm overflow-hidden relative"
      >
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 dark:bg-blue-800/30 p-1.5 rounded-full">
            <InfoIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <AlertTitle className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
              About Media Compression
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-400">
              <motion.div
                initial={false}
                animate={{ height: isExpanded ? "auto" : "auto" }}
                transition={{ duration: 0.3 }}
              >
                <p>Files are compressed before uploading to save space and bandwidth. Compression quality depends on your browser and its security settings.</p>
                
                {isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-3 bg-white/60 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-800/40"
                  >
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Technical Details:</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Audio files are converted to high-quality MP3 format</li>
                      <li>Video files are compressed while preserving quality</li>
                      <li>Browser security settings may limit compression capabilities</li>
                      <li>Supported formats: MP3, WAV, MP4, WebM, etc.</li>
                    </ul>
                  </motion.div>
                )}
                
                <div className="mt-3 flex items-center">
                  <button 
                    className="text-blue-600 dark:text-blue-300 text-sm hover:text-blue-800 dark:hover:text-blue-100 transition-colors duration-200 font-medium flex items-center gap-1"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? "Less details" : "More details"}
                  </button>
                  
                  {isDev && (
                    <button 
                      className="text-blue-700 dark:text-blue-300 text-sm ml-4 hover:text-blue-800 dark:hover:text-blue-100 underline transition-colors duration-200"
                      onClick={handleScrollToTest}
                    >
                      View compatibility details
                    </button>
                  )}
                </div>
              </motion.div>
            </AlertDescription>
          </div>
          
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 p-1 rounded-md text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors duration-200"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </Alert>
    </motion.div>
  );
}; 