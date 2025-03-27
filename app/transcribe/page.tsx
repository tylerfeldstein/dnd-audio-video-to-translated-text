import { auth } from "@clerk/nextjs/server";

import { FileUploader } from "@/components/fileuploader/audio-video-uploader";
import { MediaList } from "@/components/fileuploader/media-list";

export default async function TranscribePage() {
  const { userId } = await auth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center">Media Transcription</h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mt-2 mb-8">
        Upload your audio and video files to transcribe them
      </p>

      <div className="max-w-lg mx-auto mb-12">
        <FileUploader 
          accept="audio/*,video/*" 
          multiple={true} 
          userId={userId!} 
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          Supports audio and video files (MP3, WAV, MP4, etc.). Files will be stored securely.
        </p>
      </div>

      <div className="w-full max-w-[95vw] mx-auto mt-16">
        <MediaList userId={userId!} />
      </div>
    </div>
  );
} 