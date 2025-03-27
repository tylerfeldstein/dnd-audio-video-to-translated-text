import { auth } from "@clerk/nextjs/server";

import { FileUploader } from "@/components/fileuploader/audio-video-uploader";
import { MediaList } from "@/components/fileuploader/media-list";
// import { CompressionTest } from "@/components/fileuploader/compression-test";
// import { CompressionInfoAlert } from "@/components/fileuploader/compression-info-alert";

export default async function TranscribePage() {
  const { userId } = await auth();
  // Show environment in dev mode for testing purposes
  // const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="space-y-8">
        {/* Header Section with Gradient */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400 pb-2">
            Media Transcription
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Upload your audio and video files to transcribe them automatically
          </p>
        </div>

        {/* Uploader Section with Card */}
        <div className="max-w-xl mx-auto mb-16">
          <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-8 shadow-md dark:from-gray-950 dark:to-gray-900 space-y-6">
            {/* Info Alert */}
            {/* <CompressionInfoAlert isDev={isDev} /> */}
            
            {/* Uploader */}
            <div className="transition-all duration-300 hover:translate-y-[-2px]">
              <FileUploader 
                accept="audio/*,video/*" 
                multiple={true} 
                userId={userId!} 
              />
            </div>
            
            {/* Supportive text */}
            <div className="text-sm text-muted-foreground text-center bg-muted/30 p-3 rounded-lg">
              <p>
                Supports audio and video files (MP3, WAV, MP4, etc.). Files will be stored securely.
              </p>
            </div>
          </div>
        </div>

        {/* Media List Section */}
        <div className="w-full max-w-[95vw] lg:max-w-6xl mx-auto mt-8">
          <MediaList userId={userId!} />
        </div>
      </div>
    </div>
  );
} 