import { auth } from "@clerk/nextjs/server";

import { FileUploader } from "@/components/fileuploader/file-uploader";
import { PdfList } from "@/components/fileuploader/pdf-list";

export default async function AboutPage() {
  const { userId } = await auth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1>PDF Processor</h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mt-2 mb-8">
        Upload your PDF files to view and share them
      </p>

      <div className="max-w-lg mx-auto mb-12">
        <FileUploader accept="application/pdf" multiple={true} userId={userId!} />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          Supports multiple PDF files. Files will be stored securely.
        </p>
      </div>

      <div className="w-full max-w-[95vw] mx-auto mt-16">
        <PdfList userId={userId!} />
      </div>
    </div>
  );
}
