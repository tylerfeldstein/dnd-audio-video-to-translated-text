"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, InfoIcon } from "lucide-react";
import { getBrowserCompatibilityMessage, checkFFmpegSupport } from "@/utils/browser-check";

export const CompressionTest = () => {
  const [browserCompatWarning, setBrowserCompatWarning] = useState<string | null>(null);
  const [hasSharedArrayBuffer, setHasSharedArrayBuffer] = useState<boolean>(false);
  const [sharedArrayBufferUsable, setSharedArrayBufferUsable] = useState<boolean>(false);
  const [isSecureContext, setIsSecureContext] = useState<boolean>(false);
  const [userAgent, setUserAgent] = useState<string>("");
  
  useEffect(() => {
    // Get browser compatibility message using our updated function
    const message = getBrowserCompatibilityMessage();
    setBrowserCompatWarning(message);
    
    // Get complete browser support info
    const supportInfo = checkFFmpegSupport();
    
    // Check if SharedArrayBuffer exists (not necessarily usable)
    const sabExists = typeof window !== 'undefined' && 'SharedArrayBuffer' in window;
    setHasSharedArrayBuffer(sabExists);
    
    // Check if SharedArrayBuffer is actually usable
    setSharedArrayBufferUsable(supportInfo.sharedArrayBufferSupport);
    
    // Check security context
    setIsSecureContext(typeof window !== 'undefined' && window.isSecureContext);
    
    // Get browser info
    setUserAgent(navigator.userAgent);
    
    // Test SharedArrayBuffer if it exists
    if (sabExists) {
      try {
        // Try to create a SharedArrayBuffer
        new SharedArrayBuffer(1);
        console.log("SharedArrayBuffer is usable");
      } catch (e) {
        console.warn("SharedArrayBuffer exists but throws error:", e);
      }
    }
  }, []);
  
  return (
    <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-800 rounded-md">
      <h3 className="text-lg font-semibold">Compression Compatibility Test</h3>
      
      <div className="grid grid-cols-1 gap-2">
        <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
          <span>SharedArrayBuffer Exists:</span>
          <span className={hasSharedArrayBuffer ? "text-green-600" : "text-red-500"}>
            {hasSharedArrayBuffer ? "Yes ✓" : "No ✗"}
          </span>
        </div>
        
        <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
          <span>SharedArrayBuffer Usable:</span>
          <span className={sharedArrayBufferUsable ? "text-green-600" : "text-red-500"}>
            {sharedArrayBufferUsable ? "Yes ✓" : "No ✗"}
          </span>
        </div>
        
        <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
          <span>Secure Context:</span>
          <span className={isSecureContext ? "text-green-600" : "text-yellow-500"}>
            {isSecureContext ? "Yes ✓" : "No ⚠️"}
          </span>
        </div>
        
        <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
          <span>Environment:</span>
          <span>{process.env.NODE_ENV}</span>
        </div>
        
        <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
          <span>Browser Warning:</span>
          <span>{browserCompatWarning ? "Yes" : "No"}</span>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-2 border-t pt-2">
        <p className="font-medium mb-1">Browser Info:</p>
        <p className="break-words">{userAgent}</p>
      </div>
      
      {browserCompatWarning ? (
        <Alert variant="warning" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Browser Compatibility</AlertTitle>
          <AlertDescription>{browserCompatWarning}</AlertDescription>
        </Alert>
      ) : (
        <div className="p-3 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-md mt-4">
          Your browser fully supports compression! No compatibility warnings detected.
        </div>
      )}
      
      <div className="p-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-md mt-2 text-sm">
        <div className="flex items-start gap-2">
          <InfoIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Why does this happen?</p>
            <p className="mt-1">Chrome and other modern browsers require specific HTTP headers to enable SharedArrayBuffer:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Cross-Origin-Opener-Policy: same-origin</li>
              <li>Cross-Origin-Embedder-Policy: require-corp</li>
            </ul>
            <p className="mt-2">In development mode, these headers are typically not set. The app will still work but with limited compression capabilities.</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 