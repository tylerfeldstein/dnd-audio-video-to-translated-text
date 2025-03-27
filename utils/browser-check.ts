"use client";

/**
 * Tests if SharedArrayBuffer is actually usable, not just present
 */
function isSharedArrayBufferUsable(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('SharedArrayBuffer' in window)) return false;
  
  try {
    // Try to create a SharedArrayBuffer - this will throw if it's not enabled
    new SharedArrayBuffer(1);
    return true;
  } catch (e) {
    console.warn("SharedArrayBuffer exists but is not usable:", e);
    return false;
  }
}

/**
 * Checks if the browser supports the features needed for FFmpeg
 * - SharedArrayBuffer support (for newer FFmpeg versions)
 * - WebAssembly support
 * - NextJS compatibility
 */
export function checkFFmpegSupport(): {
  supported: boolean;
  reason?: string;
  sharedArrayBufferSupport: boolean;
  webAssemblySupport: boolean;
} {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined') {
    return { 
      supported: false, 
      reason: "Not in browser environment",
      sharedArrayBufferSupport: false,
      webAssemblySupport: false
    };
  }

  // Check for WebAssembly support
  const hasWebAssembly = 'WebAssembly' in window;
  
  // Check for actual working SharedArrayBuffer support
  const hasWorkingSharedArrayBuffer = isSharedArrayBufferUsable();
  
  // Basic support check
  const isBasicSupported = hasWebAssembly; // WebAssembly is required
  
  // Determine support level and reason
  if (!isBasicSupported) {
    return { 
      supported: false,
      reason: "WebAssembly not supported in this browser",
      sharedArrayBufferSupport: hasWorkingSharedArrayBuffer,
      webAssemblySupport: hasWebAssembly
    };
  }
  
  // If everything is supported, return true
  if (hasWorkingSharedArrayBuffer) {
    return { 
      supported: true,
      sharedArrayBufferSupport: true,
      webAssemblySupport: true
    };
  }
  
  // Limited support (no SharedArrayBuffer)
  return { 
    supported: true,
    reason: "Limited - SharedArrayBuffer not available or disabled",
    sharedArrayBufferSupport: false,
    webAssemblySupport: true
  };
}

/**
 * Performs browser checks and returns a user-friendly message
 */
export function getBrowserCompatibilityMessage(): string | null {
  const support = checkFFmpegSupport();
  
  // Critical issue - no support at all
  if (!support.supported) {
    return `Your browser doesn't support media compression. Files will still be uploaded without compression.`;
  }
  
  // Limited support - missing SharedArrayBuffer
  if (!support.sharedArrayBufferSupport) {
    // Check if we're in a secure context - SharedArrayBuffer requires secure context
    const isSecureContext = window.isSecureContext;
    
    if (!isSecureContext) {
      return `Security settings prevent efficient compression. Files will still be uploaded normally.`;
    }
    
    // More specific error for modern browsers
    if ('SharedArrayBuffer' in window) {
      return `Your browser has limited compression capabilities due to security settings. Files will still be uploaded normally.`;
    }
    
    return `Limited compression available in your browser. Files will still be uploaded normally.`;
  }
  
  // No warning needed - full support
  return null;
}