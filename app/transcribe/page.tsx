import { auth } from "@clerk/nextjs/server";

import { FileUploader } from "@/components/fileuploader/audio-video-uploader";
import { MediaList } from "@/components/fileuploader/media-list";
// import { CompressionTest } from "@/components/fileuploader/compression-test";
import { CompressionInfoAlert } from "@/components/fileuploader/compression-info-alert";

export default async function TranscribePage() {
  const { userId } = await auth();
  // Show environment in dev mode for testing purposes
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center">Media Transcription</h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mt-2 mb-8">
        Upload your audio and video files to transcribe them
      </p>

      <div className="max-w-lg mx-auto mb-12">
        {/* Environment indicator for debugging */}
        {/* {isDev && (
          <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mb-4 text-center">
            Environment: {process.env.NODE_ENV}
          </div>
        )} */}
        
        {/* Add info alert about compression - using client component for onClick */}
        <CompressionInfoAlert isDev={isDev} />
        
        <FileUploader 
          accept="audio/*,video/*" 
          multiple={true} 
          userId={userId!} 
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          Supports audio and video files (MP3, WAV, MP4, etc.). Files will be stored securely.
        </p>
        
        {/* Add the compression test component for debugging */}
        {/* {isDev && (
          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800" id="compression-test">
            <h3 className="text-lg font-semibold mb-4">Technical Details</h3>
            <CompressionTest />
          </div>
        )} */}
      </div>

      <div className="w-full max-w-[95vw] mx-auto mt-16">
        <MediaList userId={userId!} />
      </div>
    </div>
  );
} 