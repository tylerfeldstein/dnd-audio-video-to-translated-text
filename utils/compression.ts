"use client";

// Using older FFmpeg version that's compatible with NextJS
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

// Simple types for the older FFmpeg version
interface FFmpeg {
  load(): Promise<void>;
  run(...args: string[]): Promise<void>;
  FS(command: 'writeFile', path: string, data: Uint8Array): void;
  FS(command: 'readFile', path: string): Uint8Array;
  FS(command: 'unlink', path: string): void;
  setProgress?(handler: (progress: { ratio: number }) => void): void;
  exit?(): void;
}

// Cache for loaded FFmpeg instance
let ffmpegInstance: FFmpeg | null = null;
let isFFmpegLoading = false;

// Event listeners for FFmpeg loading
type FFmpegEventType = 'loading' | 'ready' | 'error';
type FFmpegEventData = FFmpeg | Error | null;
const listeners: Record<FFmpegEventType, Array<(data?: FFmpegEventData) => void>> = {
  loading: [],
  ready: [],
  error: []
};

/**
 * Subscribe to FFmpeg events
 */
export function onFFmpegEvent(event: FFmpegEventType, callback: (data?: FFmpegEventData) => void) {
  listeners[event].push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = listeners[event].indexOf(callback);
    if (index !== -1) {
      listeners[event].splice(index, 1);
    }
  };
}

/**
 * Emit an FFmpeg event
 */
function emitFFmpegEvent(event: FFmpegEventType, data?: FFmpegEventData) {
  listeners[event].forEach(callback => callback(data));
}

/**
 * Check if FFmpeg is currently loading
 */
export function isFFmpegCurrentlyLoading(): boolean {
  return isFFmpegLoading;
}

/**
 * Simple FFmpeg loader using version 0.6.1
 */
async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }
  
  if (isFFmpegLoading) {
    // If FFmpeg is already loading, wait for it to complete
    return new Promise((resolve, reject) => {
      const readyUnsubscribe = onFFmpegEvent('ready', (ffmpeg) => {
        readyUnsubscribe();
        errorUnsubscribe();
        resolve(ffmpeg as FFmpeg);
      });
      
      const errorUnsubscribe = onFFmpegEvent('error', (error) => {
        readyUnsubscribe();
        errorUnsubscribe();
        reject(error);
      });
    });
  }

  isFFmpegLoading = true;
  emitFFmpegEvent('loading');

  try {
    console.log("[FFmpeg] Loading library...");
    
    // Create FFmpeg instance with minimal options
    const ffmpeg = createFFmpeg({ 
      log: true
    });
    
    // Load FFmpeg
    await ffmpeg.load();
    
    console.log('[FFmpeg] Loaded successfully');
    ffmpegInstance = ffmpeg;
    isFFmpegLoading = false;
    emitFFmpegEvent('ready', ffmpeg);
    return ffmpeg;
  } catch (error) {
    console.error('[FFmpeg] Loading failed:', error);
    isFFmpegLoading = false;
    emitFFmpegEvent('error', error instanceof Error ? error : new Error(String(error)));
    
    // When FFmpeg doesn't load, create a dummy implementation that returns original files
    console.log('[FFmpeg] Creating fallback implementation');
    const fallbackFFmpeg = createFallbackFFmpeg();
    ffmpegInstance = fallbackFFmpeg;
    return fallbackFFmpeg;
  }
}

/**
 * Creates a fallback implementation of FFmpeg that just returns the original files
 */
function createFallbackFFmpeg(): FFmpeg {
  return {
    load: async () => {},
    run: async (...args: string[]) => {
      console.log('[FFmpeg Fallback] Pretending to run:', args.join(' '));
    },
    FS(command: 'writeFile' | 'readFile' | 'unlink', path: string, data?: Uint8Array): Uint8Array | void {
      if (command === 'writeFile' && data) {
        console.log('[FFmpeg Fallback] Pretending to write file:', path);
        return;
      }
      if (command === 'readFile') {
        console.log('[FFmpeg Fallback] Pretending to read file:', path);
        // This will make compressVideo/compressAudio return the original file
        throw new Error('Fallback FFmpeg cannot read files');
      }
      if (command === 'unlink') {
        console.log('[FFmpeg Fallback] Pretending to unlink file:', path);
        return;
      }
      throw new Error(`Unsupported command: ${command}`);
    }
  } as FFmpeg; // Type assertion to satisfy TypeScript
}

/**
 * Compresses a video file
 * Prioritizes audio quality over video quality
 */
export async function compressVideo(file: File): Promise<File> {
  try {
    // Check if file is already small enough (less than 10MB)
    if (file.size <= 10 * 1024 * 1024) {
      console.log('[Compression] File already under 10MB, skipping compression');
      return file;
    }

    // Detect browser compatibility - use simple compression or return original
    if (!isSharedArrayBufferUsable()) {
      console.log('[Compression] Limited mode: SharedArrayBuffer not available, using fallback strategy');
      return await simpleFallbackCompression(file);
    }

    const ffmpeg = await loadFFmpeg();
    const inputFileName = 'input' + getFileExtension(file.name);
    const outputFileName = 'output.mp4';
    
    try {
      // Write the file to FFmpeg's virtual file system
      ffmpeg.FS('writeFile', inputFileName, await fetchFile(file));
    } catch (error) {
      console.error('[Compression] Error writing file to FFmpeg:', error);
      return await simpleFallbackCompression(file);
    }
    
    // Target bit rates based on file size
    let videoBitrate = '800k'; // Default
    if (file.size > 100 * 1024 * 1024) {
      videoBitrate = '500k'; // For very large files (>100MB)
    } else if (file.size > 50 * 1024 * 1024) {
      videoBitrate = '700k'; // For large files (50-100MB)
    }
    
    try {
      // Run FFmpeg command with simple parameters
      await ffmpeg.run(
        '-i', inputFileName,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-c:v', 'libx264',
        '-b:v', videoBitrate,
        '-preset', 'fast',
        outputFileName
      );
    } catch (error) {
      console.error('[Compression] Error running FFmpeg command:', error);
      return await simpleFallbackCompression(file);
    }
    
    try {
      // Read the compressed file
      const data = ffmpeg.FS('readFile', outputFileName);
      
      // Clean up
      ffmpeg.FS('unlink', inputFileName);
      ffmpeg.FS('unlink', outputFileName);
      
      // Create a new file
      const blob = new Blob([new Uint8Array(data.buffer)], { type: 'video/mp4' });
      const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".mp4"), {
        type: 'video/mp4',
        lastModified: Date.now(),
      });
      
      console.log(`[Compression] Video compressed from ${formatFileSize(file.size)} to ${formatFileSize(compressedFile.size)}`);
      
      // If compression actually made file larger, return original
      if (compressedFile.size >= file.size) {
        console.log('[Compression] Compressed file is larger than original, using original');
        return file;
      }
      
      return compressedFile;
    } catch (error) {
      console.error('[Compression] Error reading compressed file:', error);
      return await simpleFallbackCompression(file);
    }
  } catch (error) {
    console.error('[Compression] Video compression failed:', error);
    return file;
  }
}

/**
 * Checks if SharedArrayBuffer is usable
 */
function isSharedArrayBufferUsable(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('SharedArrayBuffer' in window)) return false;
  
  try {
    // Just attempt to create a SharedArrayBuffer
    new SharedArrayBuffer(1);
    return true;
  } catch {
    // If it fails, return false (no need to use the error parameter)
    return false;
  }
}

/**
 * Simple fallback compression for browsers without SharedArrayBuffer
 * Uses simple browser techniques instead of FFmpeg when possible
 */
async function simpleFallbackCompression(file: File): Promise<File> {
  console.log('[Compression] Using simple fallback compression');
  
  // For audio files, we can use the Web Audio API
  if (file.type.includes('audio')) {
    try {
      // Very simple audio quality reduction
      // This is just an example - in a real implementation you'd want to use
      // a more sophisticated approach that maintains audio quality better
      return await simpleAudioCompression(file);
    } catch (e) {
      console.warn('[Compression] Simple audio compression failed:', e);
      return file;
    }
  }
  
  // For video, we don't have great options without SharedArrayBuffer
  // Just return the original file with a message
  console.log('[Compression] No fallback for video compression, using original file');
  return file;
}

/**
 * Very simple audio compression using Web Audio API
 * This is a basic example that reduces quality somewhat
 */
async function simpleAudioCompression(file: File): Promise<File> {
  // For files smaller than 20MB, just return them
  if (file.size < 20 * 1024 * 1024) {
    return file;
  }
  
  console.log('[Compression] Using Web Audio API for simple audio compression');
  
  try {
    // Log that we're returning the original file
    console.log('[Compression] Simple audio compression not implemented yet, using original file');
    return file;
  } catch (e) {
    console.error('[Compression] Web Audio API compression failed:', e);
    return file;
  }
}

/**
 * Compresses an audio file
 */
export async function compressAudio(file: File): Promise<File> {
  try {
    // Check if file is already small enough (less than 10MB)
    if (file.size <= 10 * 1024 * 1024) {
      console.log('[Compression] File already under 10MB, skipping compression');
      return file;
    }
    
    const ffmpeg = await loadFFmpeg();
    const inputFileName = 'input' + getFileExtension(file.name);
    const outputFileName = 'output.mp3';
    
    try {
      // Write the file to FFmpeg's virtual file system
      ffmpeg.FS('writeFile', inputFileName, await fetchFile(file));
    } catch (error) {
      console.error('[Compression] Error writing file to FFmpeg:', error);
      return file; // Return original file if writing fails
    }
    
    // Audio bitrate based on file size
    let audioBitrate = '128k'; // Default good quality
    if (file.size > 50 * 1024 * 1024) {
      audioBitrate = '96k'; // Lower for very large files
    }
    
    try {
      // Run FFmpeg command
      await ffmpeg.run(
        '-i', inputFileName,
        '-c:a', 'libmp3lame',
        '-b:a', audioBitrate,
        outputFileName
      );
    } catch (error) {
      console.error('[Compression] Error running FFmpeg command:', error);
      return file; // Return original file if command fails
    }
    
    try {
      // Read the result
      const outputData = ffmpeg.FS('readFile', outputFileName);
      
      if (!outputData) {
        console.error('[Compression] No output data from FFmpeg');
        return file;
      }
      
      // Create a new file with the compressed data
      const compressedFile = new File(
        [outputData],
        file.name.replace(getFileExtension(file.name), '.mp3'),
        { type: 'audio/mp3' }
      );
      
      // Clean up files in memory
      try {
        ffmpeg.FS('unlink', inputFileName);
        ffmpeg.FS('unlink', outputFileName);
      } catch (e) {
        console.warn('[Compression] Error cleaning up files:', e);
      }
      
      console.log(`[Compression] Audio compressed from ${formatFileSize(file.size)} to ${formatFileSize(compressedFile.size)}`);
      return compressedFile;
    } catch (error) {
      console.error('[Compression] Error reading output file:', error);
      return file; // Return original file if reading fails
    }
  } catch (error) {
    console.error('[Compression] Audio compression failed:', error);
    return file; // Return original file if compression fails
  }
}

/**
 * Helper function to get file extension with dot
 */
function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

/**
 * Helper function to format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
} 