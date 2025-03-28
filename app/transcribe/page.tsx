import { auth } from "@clerk/nextjs/server";
import { Metadata } from "next";

import { FileUploader } from "@/components/fileuploader/audio-video-uploader";
import { MediaList } from "@/components/fileuploader/media-list";
import { Headphones, Clock, CheckCircle } from "lucide-react";
// import { CompressionTest } from "@/components/fileuploader/compression-test";
// import { CompressionInfoAlert } from "@/components/fileuploader/compression-info-alert";

export const metadata: Metadata = {
  title: "Audio & Video Transcription",
  description: "Upload your media files to get accurate transcriptions powered by advanced AI. Perfect for content creators, researchers, and professionals.",
};

export default async function TranscribePage() {
  const { userId } = await auth();
  // Show environment in dev mode for testing purposes
  // const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="space-y-12">
        {/* Header Section with Gradient */}
        <div className="text-center space-y-6 animate-fade-in">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-100 dark:bg-blue-900/30 px-4 py-1.5 text-sm font-medium text-blue-800 dark:text-blue-300 mb-4">
            <Headphones className="h-4 w-4" />
            <span>Audio & Video Transcription</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 pb-2">
            Transform Speech to Text with AI
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Upload your media files to get accurate transcriptions powered by advanced AI. Perfect for content creators, researchers, and professionals.
          </p>
        </div>

        {/* Steps Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-background to-muted/30 border border-border rounded-xl p-6 text-center hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg font-semibold text-blue-700 dark:text-blue-400">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload</h3>
            <p className="text-sm text-muted-foreground">
              Upload your audio or video files securely to our platform.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-background to-muted/30 border border-border rounded-xl p-6 text-center hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Process</h3>
            <p className="text-sm text-muted-foreground">
              Our AI analyzes and transcribes your content with high accuracy.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-background to-muted/30 border border-border rounded-xl p-6 text-center hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-lg font-semibold text-sky-700 dark:text-sky-400">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Download</h3>
            <p className="text-sm text-muted-foreground">
              Get your polished transcripts in multiple formats ready to use.
            </p>
          </div>
        </div>

        {/* Uploader Section with Card */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-8 shadow-lg dark:from-gray-950 dark:to-gray-900 space-y-6">
            <h2 className="text-xl font-semibold text-center mb-2">Upload Your Files</h2>
            
            {/* Uploader */}
            <div className="transition-all duration-300 hover:translate-y-[-2px]">
              <FileUploader 
                accept="audio/*,video/*" 
                multiple={true} 
                userId={userId!} 
              />
            </div>
            
            {/* Features list */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Multiple files</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Secure storage</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Speaker detection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-muted-foreground">Fast processing</span>
              </div>
            </div>
            
            {/* Supportive text */}
            <div className="text-sm text-muted-foreground text-center bg-muted/30 p-4 rounded-lg">
              <p>
                Supports audio and video files (MP3, WAV, MP4, etc.). Files will be stored securely and processed quickly.
              </p>
            </div>
          </div>
        </div>

        {/* Media List Section */}
        <div className="w-full max-w-[95vw] lg:max-w-6xl mx-auto mt-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">Your Transcriptions</span>
          </h2>
          <div className="bg-gradient-to-br from-background to-muted/30 rounded-xl border border-border p-1">
            <div className="bg-background rounded-lg overflow-hidden">
              <MediaList userId={userId!} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 