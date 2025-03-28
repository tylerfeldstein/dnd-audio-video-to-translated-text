"use client";

import { useState, useEffect } from "react";
import { ConvexReactClient } from "convex/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { MediaDialog } from "./media-dialog";
import { motion } from "framer-motion";
import { FileAudio, FileVideo, Loader2, ArrowDown01, ArrowUp10, Calendar, Search, LayoutGrid, Table2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'video'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Fetch media files on component mount
  useEffect(() => {
    const fetchMediaFiles = async () => {
      try {
        setIsLoading(true);
        const data = await convex.query(api.media.getAllMedia, { userId });
        // Sort media by creation time
        const sortedMedia = [...data as Media[]].sort((a, b) => 
          sortDirection === 'desc' ? b._creationTime - a._creationTime : a._creationTime - b._creationTime
        );
        setMediaFiles(sortedMedia);
      } catch (err) {
        console.error("Error fetching media files:", err);
        setError("Failed to load media files");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMediaFiles();

    // Set up polling that doesn't cause page refresh
    const pollInterval = setInterval(() => {
      // Only poll if the dialog is not open to prevent playback interruption
      if (!isDialogOpen) {
        convex.query(api.media.getAllMedia, { userId })
          .then(data => {
            // Sort media by creation time
            const sortedMedia = [...data as Media[]].sort((a, b) => 
              sortDirection === 'desc' ? b._creationTime - a._creationTime : a._creationTime - b._creationTime
            );
            setMediaFiles(sortedMedia);
          })
          .catch(err => {
            console.error("Error polling media files:", err);
          });
      }
    }, 10000);

    // Clean up interval on component unmount
    return () => {
      clearInterval(pollInterval);
    };
  }, [userId, isDialogOpen, sortDirection]);

  // Filter and search media files
  const filteredMediaFiles = mediaFiles.filter(media => {
    // Apply type filter
    if (filterType === 'audio' && !media.mimeType.includes('audio')) return false;
    if (filterType === 'video' && !media.mimeType.includes('video')) return false;
    
    // Apply search term
    if (searchTerm && !media.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    return true;
  });

  const handleRowClick = (media: Media) => {
    setSelectedMedia(media);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedMedia(null);
  };

  const toggleSort = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
        >
          <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-lg text-gray-700 dark:text-gray-300"
        >
          Loading your media files...
        </motion.p>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-8"
      >
        <div className="inline-block p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300">
          {error}
        </div>
      </motion.div>
    );
  }

  if (mediaFiles.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="inline-block p-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <FileAudio className="h-8 w-8 text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">No media files yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Upload your first audio or video file to get started with transcription
            </p>
          </div>
        </div>
      </motion.div>
    );
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full mx-auto border-gray-200 dark:border-gray-800 shadow-md bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-800 bg-clip-text text-transparent dark:from-white dark:to-gray-200">
                Your Media Files
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 w-full sm:w-[200px]"
                  />
                </div>
                
                <div className="flex gap-2 self-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`px-3 h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                    onClick={() => setViewMode('table')}
                  >
                    <Table2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`px-3 h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-9 bg-gray-200 dark:bg-gray-800 mx-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    className={`px-3 h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${filterType === 'all' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}
                    onClick={() => setFilterType('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`px-3 h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${filterType === 'audio' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}
                    onClick={() => setFilterType('audio')}
                  >
                    <FileAudio className="h-3.5 w-3.5 mr-1" />
                    Audio
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`px-3 h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 ${filterType === 'video' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400'}`}
                    onClick={() => setFilterType('video')}
                  >
                    <FileVideo className="h-3.5 w-3.5 mr-1" />
                    Video
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        scope="col"
                      >
                        Name
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        scope="col"
                      >
                        Type
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                        scope="col"
                        onClick={toggleSort}
                      >
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Uploaded</span>
                          {sortDirection === 'desc' ? 
                            <ArrowDown01 className="h-3.5 w-3.5 ml-1" /> : 
                            <ArrowUp10 className="h-3.5 w-3.5 ml-1" />
                          }
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        scope="col"
                      >
                        Size
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        scope="col"
                      >
                        Transcription
                      </th>
                    </tr>
                  </thead>
                  
                  <motion.tbody
                    className="bg-white dark:bg-gray-950 divide-y divide-gray-100 dark:divide-gray-800"
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    {filteredMediaFiles.map((media) => (
                      <motion.tr
                        key={media._id.toString()}
                        variants={item}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer group"
                        onClick={() => handleRowClick(media)}
                        whileHover={{ scale: 1.005 }}
                        transition={{ duration: 0.15 }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                              media.mimeType.includes('audio') 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                            }`}>
                              {media.mimeType.includes('audio') ? (
                                <FileAudio className="h-4 w-4" />
                              ) : (
                                <FileVideo className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                {media.name}
                              </span>
                              {media.duration && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDuration(media.duration)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{media.mimeType}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(media._creationTime)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{formatFileSize(media.size)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(media.transcriptionStatus)}
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
                
                {filteredMediaFiles.length === 0 && (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400 italic">
                    No files match your search criteria
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMediaFiles.map((media) => (
                  <motion.div
                    key={media._id.toString()}
                    variants={item}
                    className="group relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-blue-500 dark:hover:border-blue-500/50 transition-colors shadow-sm hover:shadow-md"
                    onClick={() => handleRowClick(media)}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <div className={`w-12 h-12 flex items-center justify-center rounded-full ${
                        media.mimeType.includes('audio') 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                          : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {media.mimeType.includes('audio') ? (
                          <FileAudio className="h-6 w-6" />
                        ) : (
                          <FileVideo className="h-6 w-6" />
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {media.name}
                      </h3>
                      
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          {formatDate(media._creationTime)}
                        </div>
                        {media.duration && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Duration: {formatDuration(media.duration)}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Size: {formatFileSize(media.size)}
                        </p>
                      </div>
                      
                      <div className="mt-3">
                        {getStatusBadge(media.transcriptionStatus)}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {filteredMediaFiles.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 italic">
                    No files match your search criteria
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <MediaDialog
        media={selectedMedia}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </>
  );
};

// Helper function to format duration
const formatDuration = (seconds?: number) => {
  if (!seconds) return "Unknown";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}; 