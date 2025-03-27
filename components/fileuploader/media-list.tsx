"use client";

import { useState, useEffect } from "react";
import { ConvexReactClient } from "convex/react";
import { Card } from "@/components/ui/card"
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import React from "react";

// Initialize the Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface Media {
  _id: Id<"media">;
  _creationTime: number;
  name: string;
  fileId: Id<"_storage">;
  size: number;
  mimeType: string;
  description?: string;
  fileUrl?: string;
  userId: string;
  transcriptionStatus?: string;
  transcriptionText?: string;
  transcribedAt?: number;
  duration?: number;
}

interface MediaListProps {
  userId: string;
}

export const MediaList = ({ userId }: MediaListProps) => {
  const [mediaFiles, setMediaFiles] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Fetch media files on component mount
  useEffect(() => {
    const fetchMediaFiles = async () => {
      try {
        setIsLoading(true);
        const data = await convex.query(api.media.getAllMedia, { userId });
        setMediaFiles(data as Media[]);
      } catch (err) {
        console.error("Error fetching media files:", err);
        setError("Failed to load media files");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMediaFiles();

    // Set up an interval to refresh the list every 10 seconds
    const intervalId = setInterval(fetchMediaFiles, 10000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [userId]);

  const toggleExpand = (id: string) => {
    const newExpandedIds = new Set(expandedIds);
    if (newExpandedIds.has(id)) {
      newExpandedIds.delete(id);
    } else {
      newExpandedIds.add(id);
    }
    setExpandedIds(newExpandedIds);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading media files...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  if (mediaFiles.length === 0) {
    return <div className="text-center py-8 text-gray-500">No media files uploaded yet</div>;
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "N/A";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: number) => {
    return new Date(date)
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .replace(",", "");
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">Pending</Badge>;
    
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Completed</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="w-full mx-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Media Files</h2>
        </div>
        <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      scope="col"
                    >
                      Name
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      scope="col"
                    >
                      Type
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      scope="col"
                    >
                      Uploaded
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      scope="col"
                    >
                      Size
                    </th>
                    <th
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      scope="col"
                    >
                      Transcription
                    </th>
                    <th
                      className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      scope="col"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {mediaFiles.map((media) => (
                    <React.Fragment key={media._id.toString()}>
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 text-blue-500">
                              {media.mimeType.includes('audio') ? (
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="24" 
                                  height="24" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                >
                                  <path d="m14.5 2-6 6H3v8h5.5l6 6V2Z"/>
                                  <path d="M20 10c0 5-7 5-7 0"/>
                                </svg>
                              ) : (
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="24" 
                                  height="24" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 2c-4.4 0-8 3.6-8 8v10c0 .6.4 1 1 1h5v-5h4v5h5c.6 0 1-.4 1-1V10c0-4.4-3.6-8-8-8z"/>
                                  <path d="M10 18v-5h4v5"/>
                                </svg>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {media.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {media.mimeType.split('/')[0]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(media._creationTime)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatFileSize(media.size)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(media.transcriptionStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            {media.fileUrl && (
                              <button
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                onClick={() => window.open(media.fileUrl, "_blank")}
                                title="Play/Download Media"
                              >
                                <svg
                                  className="w-5 h-5"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                              </button>
                            )}
                            {media.transcriptionStatus === "completed" && (
                              <button
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                onClick={() => toggleExpand(media._id.toString())}
                                title="View Transcription"
                              >
                                <svg
                                  className="w-5 h-5"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedIds.has(media._id.toString()) && media.transcriptionText && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                            <div className="p-4 bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700">
                              <h3 className="text-lg font-semibold mb-2">Transcription</h3>
                              <div className="max-h-60 overflow-y-auto prose dark:prose-invert">
                                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                                  {media.transcriptionText}
                                </p>
                              </div>
                              <div className="flex justify-end mt-4">
                                <button 
                                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                  onClick={() => {
                                    if (media.transcriptionText) {
                                      navigator.clipboard.writeText(media.transcriptionText);
                                    }
                                  }}
                                >
                                  Copy to Clipboard
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}; 