import { inngest } from "@/inngest/client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Set up the Convex client
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Cleans up files in the outputs directory related to a specific media/audio file
 * This helps prevent accumulation of duplicate files
 */
async function cleanupOutputsDirectory(filePaths: string[]) {
  try {
    console.log("Cleaning up files in outputs directory...");
    
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        // Get the file's basename and directory
        const fileDir = path.dirname(filePath);
        const baseName = path.basename(filePath, path.extname(filePath));
        
        // Find all files in the directory with the same basename (different extensions)
        const allFiles = fs.readdirSync(fileDir);
        const relatedFiles = allFiles.filter(file => file.includes(baseName));
        
        // Delete all related files
        for (const file of relatedFiles) {
          const fullPath = path.join(fileDir, file);
          try {
            fs.unlinkSync(fullPath);
            console.log(`Deleted file: ${fullPath}`);
          } catch (error) {
            console.error(`Failed to delete file ${fullPath}:`, error);
          }
        }
      }
    }
    
    console.log("Cleanup completed");
  } catch (error) {
    console.error("Error during file cleanup:", error);
  }
}

/**
 * Extracts audio from a video file using ffmpeg
 * @param videoPath Path to the video file
 * @returns Path to the extracted audio file (.mp3)
 */
async function extractAudioFromVideo(videoPath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const outputDir = path.dirname(videoPath);
    const audioPath = path.join(outputDir, `${path.parse(videoPath).name}.mp3`);
    
    console.log("Extracting audio from video to:", audioPath);
    
    const ffmpegProcess = spawn("ffmpeg", [
      "-i", videoPath,
      "-q:a", "0",
      "-map", "a",
      "-y", // Overwrite existing file
      audioPath
    ]);
    
    let stderrData = "";
    
    ffmpegProcess.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderrData += chunk;
      console.log("FFmpeg stderr:", chunk);
    });
    
    ffmpegProcess.on("close", (code) => {
      console.log("FFmpeg process exited with code:", code);
      
      if (code !== 0) {
        console.error(`FFmpeg process failed with code ${code}: ${stderrData}`);
        reject(new Error(`FFmpeg process exited with code ${code}: ${stderrData}`));
        return;
      }
      
      if (!fs.existsSync(audioPath)) {
        reject(new Error(`Audio extraction successful but file not found at: ${audioPath}`));
        return;
      }
      
      console.log("Audio extracted successfully");
      resolve(audioPath);
    });
  });
}

/**
 * Checks if a file is a video based on its extension
 */
function isVideoFile(filePath: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'];
  const ext = path.extname(filePath).toLowerCase();
  return videoExtensions.includes(ext);
}

// Event triggered when a new media file is uploaded
export const mediaTranscriptionWorkflow = inngest.createFunction(
  { 
    id: "media-transcription-workflow",
    retries: 2, // Limit retries to 2 attempts
    onFailure: async ({ error, step, event }) => {
      console.error(`Transcription workflow failed:`, error);
      
      // Cast the event data to our expected type
      const typedEvent = event as unknown as { data: { mediaId: Id<"media">; storageId: Id<"_storage"> } };
      const { mediaId } = typedEvent.data;
      
      if (!mediaId) {
        console.error("Missing mediaId in event data for error handling");
        return;
      }
      
      // Update the status to error in the database
      await step.run("update-status-to-error", async () => {
        return await convexClient.mutation(api.media.updateTranscription, {
          mediaId: mediaId as Id<"media">,
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        });
      });
      
      // Clean up any files in the outputs directory
      await step.run("cleanup-files", async () => {
        const outputDir = path.join(process.cwd(), "outputs");
        if (fs.existsSync(outputDir)) {
          // Get all files in the outputs directory
          const files = fs.readdirSync(outputDir).map(file => path.join(outputDir, file));
          await cleanupOutputsDirectory(files);
        }
      });
    }
  },
  // This function triggers when a new media file is uploaded
  { event: "media/file.uploaded" },
  async ({ event, step }) => {
    // Extract data from the event
    const { mediaId, storageId } = event.data;
    // Track files that need to be cleaned up
    const filesToCleanup: string[] = [];

    if (!mediaId || !storageId) {
      return { 
        success: false, 
        error: "Missing mediaId or storageId in event data" 
      };
    }

    try {
      // Update the transcription status to processing
      await step.run("update-status-to-processing", async () => {
        return await convexClient.mutation(api.media.updateTranscription, {
          mediaId: mediaId as Id<"media">,
          status: "processing"
        });
      });

      // Get the media file URL
      const fileUrl = await step.run("get-file-url", async () => {
        return await convexClient.query(api.media.getFileUrl, {
          storageId: storageId as Id<"_storage">
        });
      });

      if (!fileUrl) {
        throw new Error("Failed to get file URL");
      }

      // Get the media file details
      const mediaDetails = await step.run("get-media-details", async () => {
        return await convexClient.query(api.media.getMediaById, {
          mediaId: mediaId as Id<"media">
        });
      });

      if (!mediaDetails) {
        throw new Error("Failed to get media details");
      }

      // Download the file to a local outputs directory
      const tempFilePath = await step.run("download-file", async () => {
        // Use a local outputs directory instead of temp directory
        const outputDir = path.join(process.cwd(), "outputs");
        console.log("Using output directory:", outputDir);
        
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const fileExtension = path.extname(mediaDetails.name);
        const tempFilePath = path.join(outputDir, `${randomUUID()}${fileExtension}`);
        console.log("Downloading file to:", tempFilePath);
        
        // Check if we need to handle a multipart uploaded file
        // Get info about the storage ID to see if it's a multipart upload
        const uploads = await convexClient.query(api.files.getMultipartUploadByStorageId, {
          storageId: storageId as Id<"_storage">
        });
        
        if (uploads && uploads.isComplete) {
          console.log(`File is a multipart upload with ${uploads.numChunks} chunks`);
          
          // Get the file stream instead of using fetch for better memory handling
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
          }
          
          // Create a write stream for the output file
          const fileStream = fs.createWriteStream(tempFilePath);
          
          if (response.body) {
            // Use the web streams API to pipe the response to the file
            const reader = response.body.getReader();
            
            console.log("Streaming file download to disk...");
            
            let bytesReceived = 0;
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Write chunk to file
              fileStream.write(Buffer.from(value));
              
              bytesReceived += value.length;
              console.log(`Downloaded ${bytesReceived} bytes so far...`);
            }
            
            // Close the stream
            fileStream.end();
            
            console.log(`File download complete, total size: ${bytesReceived} bytes`);
          } else {
            // Fallback to the buffer method if streaming doesn't work
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(tempFilePath, Buffer.from(buffer));
            console.log(`File downloaded with fallback method, size: ${buffer.byteLength}`);
          }
        } else {
          // Standard download for regular files
          console.log("File is a standard upload, downloading directly");
          const response = await fetch(fileUrl);
          const buffer = await response.arrayBuffer();
          fs.writeFileSync(tempFilePath, Buffer.from(buffer));
          console.log("File downloaded successfully, size:", buffer.byteLength);
        }
        
        // Verify the file was downloaded correctly
        if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
          throw new Error(`File download failed or file is empty: ${tempFilePath}`);
        }
        
        filesToCleanup.push(tempFilePath);
        return tempFilePath;
      });

      // Check if the file is a video and extract audio if needed
      const audioFilePath = await step.run("prepare-audio-file", async () => {
        if (isVideoFile(tempFilePath)) {
          console.log("File is a video, extracting audio...");
          const extractedPath = await extractAudioFromVideo(tempFilePath);
          filesToCleanup.push(extractedPath);
          return extractedPath;
        } else {
          console.log("File is already audio, skipping extraction");
          return tempFilePath;
        }
      });

      let transcriptionResult: string | undefined = undefined;
      let usedFallback = false;

      try {
        // Try the main whisper CLI command first
        transcriptionResult = await step.run("run-whisper-transcription", async () => {
          // Use the same directory for the output
          const outputDir = path.dirname(audioFilePath);
          const fileName = path.basename(audioFilePath);
          const outputPath = path.join(outputDir, `${path.parse(fileName).name}.txt`);
          
          console.log("Will save transcription to:", outputPath);
          
          return new Promise<string>((resolve, reject) => {
            // Check if the input file exists
            if (!fs.existsSync(audioFilePath)) {
              console.error("Input file does not exist:", audioFilePath);
              reject(new Error(`Input file does not exist: ${audioFilePath}`));
              return;
            }
          
            console.log("Spawning whisper process with command:", "whisper", [
              audioFilePath,
              "--output_dir", outputDir,
              "--output_format", "txt",
              "--task", "transcribe",
              "--model", "turbo"
            ]);
            console.log("Using resolved paths:", {
              inputFile: path.resolve(audioFilePath),
              outputDir: path.resolve(outputDir)
            });
            console.log("Actual command to be executed:", 
              `whisper ${path.resolve(audioFilePath)} --output_dir ${path.resolve(outputDir)} --output_format txt --task transcribe --model turbo`
            );
            
            // Using local Whisper implementation
            // Adding full path to ensure whisper can find the file
            const whisperProcess = spawn("whisper", [
              path.resolve(audioFilePath), // Use absolute path to the input file
              "--output_dir", path.resolve(outputDir), // Use absolute path to output directory
              "--output_format", "txt",
              "--task", "transcribe",
              "--model", "turbo" // Use medium model for better accuracy
            ]);
            
            // We don't use stdoutData for CLI whisper as it outputs to file
            let stderrData = "";
            
            whisperProcess.stdout.on("data", (data) => {
              const chunk = data.toString();
              console.log("Whisper stdout:", chunk);
            });
            
            whisperProcess.stderr.on("data", (data) => {
              const chunk = data.toString();
              stderrData += chunk;
              console.log("Whisper stderr:", chunk);
            });
            
            whisperProcess.on("close", (code) => {
              console.log("Whisper process exited with code:", code);
              
              if (code !== 0) {
                console.error(`Whisper process failed with code ${code}: ${stderrData}`);
                reject(new Error(`Whisper process exited with code ${code}: ${stderrData}`));
                return;
              }
              
              try {
                // List files in the output directory for debugging
                console.log("Files in output directory:", fs.readdirSync(outputDir));
                
                // Check if the output file exists
                if (!fs.existsSync(outputPath)) {
                  console.error("Expected output file not found:", outputPath);
                  // Try to find a file with similar name
                  const files = fs.readdirSync(outputDir);
                  const possibleMatch = files.find(f => f.includes(path.parse(fileName).name) && f.endsWith('.txt'));
                  
                  if (possibleMatch) {
                    console.log("Found possible matching output file:", possibleMatch);
                    const actualPath = path.join(outputDir, possibleMatch);
                    filesToCleanup.push(actualPath);
                    const transcription = fs.readFileSync(actualPath, "utf-8");
                    resolve(transcription.trim());
                    return;
                  }
                  
                  reject(new Error(`Output file not found: ${outputPath}`));
                  return;
                }
                
                // Add output file to cleanup list
                filesToCleanup.push(outputPath);
                
                // Read the transcription output
                console.log("Reading transcription from:", outputPath);
                const transcription = fs.readFileSync(outputPath, "utf-8");
                resolve(transcription.trim());
              } catch (e) {
                console.error("Error reading transcription:", e);
                reject(e);
              }
            });
          });
        });
      } catch (error) {
        console.log("CLI Whisper command failed, trying the Python fallback method...", 
          error instanceof Error ? error.message : String(error));
        
        // Use the Python fallback method if the CLI command fails
        usedFallback = true;
        
        transcriptionResult = await step.run("run-python-transcription-fallback", async () => {
          // Create a Python script for transcription in the same directory
          const outputDir = path.dirname(audioFilePath);
          const scriptPath = path.join(outputDir, "transcribe.py");
          
          console.log("Creating Python script at:", scriptPath);
          
          const pythonScript = `
import sys
import whisper
import os

print("Current working directory:", os.getcwd())
print("Processing file:", "${path.resolve(audioFilePath).replace(/\\/g, "\\\\")}")

# Load the model - turbo provides good accuracy with reasonable speed
model = whisper.load_model("turbo")
print("Model loaded successfully")

# Transcribe the audio file - will auto-detect language
result = model.transcribe("${path.resolve(audioFilePath).replace(/\\/g, "\\\\")}")
print("Transcription completed, length:", len(result["text"]))

# Save transcription to a file as well
output_path = "${path.resolve(audioFilePath).replace(/\\/g, "\\\\")}.txt"
with open(output_path, "w") as f:
    f.write(result["text"])
print("Transcription saved to:", output_path)

# Print the transcription
print(result["text"])
          `;
          
          fs.writeFileSync(scriptPath, pythonScript);
          console.log("Python script created");
          
          // Add Python script to cleanup list
          filesToCleanup.push(scriptPath);
          
          return new Promise<string>((resolve, reject) => {
            try {
              console.log("Spawning Python process with command:", "python3", [scriptPath]);
              const pythonProcess = spawn("python3", [scriptPath]);
              
              let stdoutData = "";
              let stderrData = "";
              
              pythonProcess.stdout.on("data", (data) => {
                const chunk = data.toString();
                stdoutData += chunk;
                console.log("Python stdout:", chunk);
              });
              
              pythonProcess.stderr.on("data", (data) => {
                const chunk = data.toString();
                stderrData += chunk;
                console.log("Python stderr:", chunk);
              });
              
              pythonProcess.on("close", (code) => {
                console.log("Python process exited with code:", code);
                
                if (code !== 0) {
                  console.error(`Python process failed with code ${code}: ${stderrData}`);
                  reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
                  return;
                }
                
                // Save stdout to a file for debugging
                const outputDir = path.dirname(scriptPath);
                const stdoutPath = path.join(outputDir, `${path.basename(audioFilePath)}-stdout.txt`);
                fs.writeFileSync(stdoutPath, stdoutData);
                console.log("Python stdout saved to:", stdoutPath);
                
                // Add stdout file to cleanup list
                filesToCleanup.push(stdoutPath);
                
                // Add .txt output file that the Python script creates
                const txtOutputPath = `${audioFilePath}.txt`;
                if (fs.existsSync(txtOutputPath)) {
                  filesToCleanup.push(txtOutputPath);
                }
                
                try {
                  // Extract just the transcription from the output (excluding debug logs)
                  const transcription = stdoutData
                    .split('\n')
                    .filter(line => !line.startsWith('Current working directory:') && 
                                   !line.startsWith('Processing file:') && 
                                   !line.startsWith('Model loaded') && 
                                   !line.startsWith('Transcription completed') && 
                                   !line.startsWith('Transcription saved'))
                    .join('\n')
                    .trim();
                  
                  resolve(transcription);
                } catch (error) {
                  console.error("Error extracting transcription from Python output:", error);
                  reject(error);
                } finally {
                  // Now we're cleaning up files after processing
                  console.log("Files marked for cleanup");
                }
              });
            } catch (error) {
              console.error("Error spawning Python process:", error);
              reject(error);
            }
          });
        });
      } finally {
        // Changed from keeping files to cleaning them up after successful processing
        console.log("Cleaning up files after processing");
      }

      // If we got a transcription result, save it
      if (transcriptionResult) {
        // Check if the transcription result is valid
        if (typeof transcriptionResult !== 'string' || transcriptionResult.trim() === '') {
          console.warn("Transcription result is empty or invalid:", transcriptionResult);
          transcriptionResult = "Transcription failed to produce text.";
        }
        
        // Save the transcription result to Convex
        try {
          await step.run("save-transcription", async () => {
            return await convexClient.mutation(api.media.updateTranscription, {
              mediaId: mediaId as Id<"media">,
              status: "completed",
              transcriptionText: transcriptionResult
            });
          });
          
          console.log(`Successfully saved transcription of length ${transcriptionResult.length} to Convex`);
        } catch (saveError) {
          console.error("Error saving transcription to Convex:", saveError);
          // Don't throw here - we at least have the transcription result in memory
        }

        // Clean up files after successful transcription
        await step.run("cleanup-files", async () => {
          await cleanupOutputsDirectory(filesToCleanup);
        });

        return { 
          success: true, 
          mediaId, 
          usedFallback,
          transcriptionLength: transcriptionResult.length
        };
      } else {
        throw new Error("No transcription result obtained from either method");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      
      // Update the status to error
      await convexClient.mutation(api.media.updateTranscription, {
        mediaId: mediaId as Id<"media">,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });
      
      // Clean up files even if there was an error
      try {
        await cleanupOutputsDirectory(filesToCleanup);
      } catch (cleanupError) {
        console.error("Error during cleanup after failure:", cleanupError);
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
);

// Fallback function that uses a Python script if the whisper command is not available
export const pythonTranscriptionFallback = inngest.createFunction(
  { 
    id: "python-transcription-fallback",
    retries: 2, // Limit retries to 2 attempts
    onFailure: async ({ error, step, event }) => {
      console.error(`Python transcription fallback failed:`, error);
      
      // Cast the event data to our expected type
      const typedEvent = event as unknown as { data: { mediaId: Id<"media">; storageId: Id<"_storage">; tempFilePath: string } };
      const { mediaId } = typedEvent.data;
      
      if (!mediaId) {
        console.error("Missing mediaId in event data for error handling");
        return;
      }
      
      // Update the status to error in the database
      await step.run("update-status-to-error", async () => {
        return await convexClient.mutation(api.media.updateTranscription, {
          mediaId: mediaId as Id<"media">,
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        });
      });
      
      // Clean up any files in the outputs directory
      await step.run("cleanup-files", async () => {
        const outputDir = path.join(process.cwd(), "outputs");
        if (fs.existsSync(outputDir)) {
          // Get all files in the outputs directory
          const files = fs.readdirSync(outputDir).map(file => path.join(outputDir, file));
          await cleanupOutputsDirectory(files);
        }
      });
    }
  },
  { event: "media/transcription.fallback" },
  async ({ event, step }) => {
    // Extract data from the event
    const { mediaId, storageId, tempFilePath } = event.data;
    // Track files that need to be cleaned up
    const filesToCleanup: string[] = [];

    if (!mediaId || !storageId || !tempFilePath) {
      return { 
        success: false, 
        error: "Missing required data in event" 
      };
    }

    try {
      // If for some reason tempFilePath doesn't exist or isn't in the outputs dir,
      // download the file again to the outputs directory
      let actualFilePath = tempFilePath;
      
      if (!fs.existsSync(tempFilePath) || !tempFilePath.includes("outputs")) {
        console.log("File not found at specified path or not in outputs directory. Downloading again.");
        
        // Get the file URL
        const fileUrl = await step.run("get-file-url", async () => {
          return await convexClient.query(api.media.getFileUrl, {
            storageId: storageId as Id<"_storage">
          });
        });
        
        if (!fileUrl) {
          throw new Error("Failed to get file URL");
        }
        
        // Get file details for the name
        const mediaDetails = await step.run("get-media-details", async () => {
          return await convexClient.query(api.media.getMediaById, {
            mediaId: mediaId as Id<"media">
          });
        });
        
        if (!mediaDetails) {
          throw new Error("Failed to get media details");
        }
        
        // Download to outputs directory
        actualFilePath = await step.run("redownload-file", async () => {
          const outputDir = path.join(process.cwd(), "outputs");
          console.log("Using output directory:", outputDir);
          
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          const fileExtension = path.extname(mediaDetails.name);
          const newFilePath = path.join(outputDir, `fallback-${randomUUID()}${fileExtension}`);
          console.log("Downloading file to:", newFilePath);
          
          // Check if we need to handle a multipart uploaded file
          const uploads = await convexClient.query(api.files.getMultipartUploadByStorageId, {
            storageId: storageId as Id<"_storage">
          });
          
          if (uploads && uploads.isComplete) {
            console.log(`File is a multipart upload with ${uploads.numChunks} chunks`);
            
            // Get the file stream instead of using fetch for better memory handling
            const response = await fetch(fileUrl);
            if (!response.ok) {
              throw new Error(`Failed to download file: ${response.statusText}`);
            }
            
            // Create a write stream for the output file
            const fileStream = fs.createWriteStream(newFilePath);
            
            if (response.body) {
              // Use the web streams API to pipe the response to the file
              const reader = response.body.getReader();
              
              console.log("Streaming file download to disk...");
              
              let bytesReceived = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Write chunk to file
                fileStream.write(Buffer.from(value));
                
                bytesReceived += value.length;
                console.log(`Downloaded ${bytesReceived} bytes so far...`);
              }
              
              // Close the stream
              fileStream.end();
              
              console.log(`File download complete, total size: ${bytesReceived} bytes`);
            } else {
              // Fallback to the buffer method if streaming doesn't work
              const response = await fetch(fileUrl);
              const buffer = await response.arrayBuffer();
              fs.writeFileSync(newFilePath, Buffer.from(buffer));
              console.log(`File downloaded with fallback method, size: ${buffer.byteLength}`);
            }
          } else {
            // Standard download for regular files
            console.log("File is a standard upload, downloading directly");
            const response = await fetch(fileUrl);
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(newFilePath, Buffer.from(buffer));
            console.log("File downloaded successfully, size:", buffer.byteLength);
          }
          
          // Verify the file was downloaded correctly
          if (!fs.existsSync(newFilePath) || fs.statSync(newFilePath).size === 0) {
            throw new Error(`File download failed or file is empty: ${newFilePath}`);
          }
          
          filesToCleanup.push(newFilePath);
          return newFilePath;
        });
      } else {
        console.log("Using existing file at:", tempFilePath);
        filesToCleanup.push(tempFilePath);
      }
      
      // Check if the file is a video and extract audio if needed
      const audioFilePath = await step.run("prepare-audio-file", async () => {
        if (isVideoFile(actualFilePath)) {
          console.log("File is a video, extracting audio...");
          const extractedPath = await extractAudioFromVideo(actualFilePath);
          filesToCleanup.push(extractedPath);
          return extractedPath;
        } else {
          console.log("File is already audio, skipping extraction");
          return actualFilePath;
        }
      });
      
      // Create a Python script for transcription
      const scriptPath = await step.run("create-python-script", async () => {
        const outputDir = path.dirname(audioFilePath);
        const scriptPath = path.join(outputDir, "transcribe.py");
        
        const pythonScript = `
import sys
import whisper
import os

print("Current working directory:", os.getcwd())
print("Processing file:", "${path.resolve(audioFilePath).replace(/\\/g, "\\\\")}")

# Load the model - turbo provides good accuracy with reasonable speed
model = whisper.load_model("turbo")
print("Model loaded successfully")

# Transcribe the audio file - will auto-detect language
result = model.transcribe("${path.resolve(audioFilePath).replace(/\\/g, "\\\\")}")
print("Transcription completed, length:", len(result["text"]))

# Save transcription to a file as well
output_path = "${path.resolve(audioFilePath).replace(/\\/g, "\\\\")}.txt"
with open(output_path, "w") as f:
    f.write(result["text"])
print("Transcription saved to:", output_path)

# Print the transcription
print(result["text"])
        `;
        
        fs.writeFileSync(scriptPath, pythonScript);
        filesToCleanup.push(scriptPath);
        return scriptPath;
      });

      // Run the Python script
      const transcriptionResult = await step.run("run-python-transcription", async () => {
        return new Promise<string>((resolve, reject) => {
          console.log("Spawning Python process with command:", "python3", [scriptPath]);
          const pythonProcess = spawn("python3", [scriptPath]);
          
          let stdoutData = "";
          let stderrData = "";
          
          pythonProcess.stdout.on("data", (data) => {
            const chunk = data.toString();
            stdoutData += chunk;
            console.log("Python stdout:", chunk);
          });
          
          pythonProcess.stderr.on("data", (data) => {
            const chunk = data.toString();
            stderrData += chunk;
            console.log("Python stderr:", chunk);
          });
          
          pythonProcess.on("close", (code) => {
            console.log("Python process exited with code:", code);
            
            if (code !== 0) {
              console.error(`Python process failed with code ${code}: ${stderrData}`);
              reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
              return;
            }
            
            // Save stdout to a file for debugging
            const outputDir = path.dirname(scriptPath);
            const stdoutPath = path.join(outputDir, `${path.basename(audioFilePath)}-stdout.txt`);
            fs.writeFileSync(stdoutPath, stdoutData);
            console.log("Python stdout saved to:", stdoutPath);
            
            // Add stdout file to cleanup list
            filesToCleanup.push(stdoutPath);
            
            // Add .txt output file that the Python script creates
            const txtOutputPath = `${audioFilePath}.txt`;
            if (fs.existsSync(txtOutputPath)) {
              filesToCleanup.push(txtOutputPath);
            }
            
            try {
              // Extract just the transcription from the output (excluding debug logs)
              const transcription = stdoutData
                .split('\n')
                .filter(line => !line.startsWith('Current working directory:') && 
                               !line.startsWith('Processing file:') && 
                               !line.startsWith('Model loaded') && 
                               !line.startsWith('Transcription completed') && 
                               !line.startsWith('Transcription saved'))
                .join('\n')
                .trim();
              
              resolve(transcription);
            } catch (error) {
              console.error("Error extracting transcription from Python output:", error);
              reject(error);
            } finally {
              // Now we're cleaning up files after processing
              console.log("Files marked for cleanup");
            }
          });
        });
      });

      // Save the transcription result to Convex
      await step.run("save-transcription", async () => {
        return await convexClient.mutation(api.media.updateTranscription, {
          mediaId: mediaId as Id<"media">,
          status: "completed",
          transcriptionText: transcriptionResult
        });
      });

      // Clean up files after successful transcription
      await step.run("cleanup-files", async () => {
        await cleanupOutputsDirectory(filesToCleanup);
      });

      return { 
        success: true, 
        mediaId, 
        transcriptionLength: transcriptionResult.length
      };
    } catch (error) {
      console.error("Python transcription error:", error);
      
      // Update the status to error
      await convexClient.mutation(api.media.updateTranscription, {
        mediaId: mediaId as Id<"media">,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      });
      
      // Clean up files even if there was an error
      try {
        await cleanupOutputsDirectory(filesToCleanup);
      } catch (cleanupError) {
        console.error("Error during cleanup after failure:", cleanupError);
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
); 