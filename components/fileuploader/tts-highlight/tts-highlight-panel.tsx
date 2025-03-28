"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Download, Mic, Loader2, AlertCircle, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { generateCaptionedSpeech, Timestamp } from "@/actions/kokoroTts/captionedTts";
import { getAvailableVoices } from "@/actions/kokoroTts/tts";
import { convertToKokoroLangCode } from "@/lib/kokoroHelpers";
import { HighlightText } from "./highlight-text";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Voice {
  name: string;
  display_name?: string;
}

interface TtsHighlightPanelProps {
  text?: string;
  label?: string;
  onTextToSpeech?: (text: string, language?: string) => void;
}

export function TtsHighlightPanel({
  text: initialText = "",
  label = "Text-to-Speech with Highlighting",
//   onTextToSpeech
}: TtsHighlightPanelProps) {
  // Text and speech state
  const [text, setText] = useState<string>(initialText);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [timestamps, setTimestamps] = useState<Timestamp[]>([]);
  const [kokoroStatus, setKokoroStatus] = useState<"unknown" | "online" | "offline">("unknown");
  
  // Add debug state
  const [showDebug, setShowDebug] = useState<boolean>(false);
  // Add a special flag to force updates
  const [updateCounter, setUpdateCounter] = useState<number>(0);
  
  // Force update every 100ms during playback to ensure highlighting works
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isPlaying && audioRef.current) {
      intervalId = setInterval(() => {
        setCurrentTime(audioRef.current?.currentTime || 0);
        setUpdateCounter(prev => prev + 1);
      }, 100);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying]);
  
  // Voice settings
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("af_bella");
  const [speed, setSpeed] = useState<number>(1.0);
  const [langCode, setLangCode] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize and check Kokoro server
  useEffect(() => {
    fetchVoices();
  }, []);
  
  // Update text when initialText changes
  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);
  
  const fetchVoices = async () => {
    try {
      const result = await getAvailableVoices();
      
      if (result.success && result.voices) {
        setVoices(result.voices);
        setKokoroStatus("online");
      } else {
        console.error("Failed to fetch voices:", result.error);
        setKokoroStatus("offline");
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
      setKokoroStatus("offline");
    }
  };
  
  const handleGenerateSpeech = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to convert to speech");
      return;
    }
    
    setIsLoading(true);
    setAudioUrl(null);
    setTimestamps([]);
    
    try {
      // Convert to Kokoro language code if needed
      const kokoroLang = text && langCode ? convertToKokoroLangCode(langCode) : null;
      
      const result = await generateCaptionedSpeech(
        text,
        selectedVoice,
        kokoroLang,
        speed
      );
      
      if (result.success && result.audioBlob) {
        // Create URL for audio playback
        const url = URL.createObjectURL(result.audioBlob);
        setAudioUrl(url);
        
        // Save timestamps for word highlighting
        if (result.timestamps) {
          setTimestamps(result.timestamps);
        }
        
        toast.success("Speech generated successfully with word timing!");
      } else {
        toast.error(result.error || "Failed to generate speech");
      }
    } catch (error) {
      console.error("Error generating speech:", error);
      toast.error("Failed to generate speech. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        console.log("Paused at", audioRef.current.currentTime, "seconds");
      } else {
        audioRef.current.play().catch(e => {
          console.error("Error playing audio:", e);
          toast.error("Failed to play audio. Please try again.");
        });
        console.log("Playing from", audioRef.current.currentTime, "seconds");
        // Force an immediate update of currentTime
        setCurrentTime(audioRef.current.currentTime);
      }
    }
  };
  
  const handleWordClick = (word: string, startTime: number) => {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = startTime;
      if (!isPlaying) {
        audioRef.current.play().catch(e => {
          console.error("Error playing audio:", e);
        });
      }
    }
  };
  
  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement("a");
      a.href = audioUrl;
      a.download = `speech-highlight-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  // Make sure audioRef is properly set up when audioUrl changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      // Reset current time
      setCurrentTime(0);
      
      // Setup audio element
      const audio = audioRef.current;
      
      // For debugging - log when audio element is loaded
      audio.addEventListener('loadedmetadata', () => {
        console.log('Audio metadata loaded, duration:', audio.duration);
      });
      
      // For debugging - log when timeupdate fires
      const handleTimeUpdate = () => {
        const time = audio.currentTime;
        console.log(`Audio timeupdate event: ${time.toFixed(3)}s`);
        setCurrentTime(time);
      };
      
      audio.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', () => {});
      };
    }
  }, [audioUrl]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid gap-6 lg:grid-cols-[2fr,1fr]"
    >
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-50/80 to-white dark:from-gray-900/80 dark:to-gray-950 pb-3">
          <CardTitle className="bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent dark:from-gray-200 dark:to-white">
            {label}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Generate speech with synchronized word highlighting
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900/90 pt-4 space-y-6">
          <Textarea
            placeholder="Enter text to convert to speech with word-level highlighting..."
            className="min-h-[150px] resize-none bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          {timestamps.length > 0 && audioUrl ? (
            <div className="pt-4 space-y-4">
              <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                <audio 
                  ref={audioRef} 
                  controls 
                  className="w-full mb-4"
                  onTimeUpdate={() => {
                    if (audioRef.current) {
                      setCurrentTime(audioRef.current.currentTime);
                      console.log("Current time:", audioRef.current.currentTime);
                    }
                  }}
                  onPlay={() => {
                    setIsPlaying(true);
                    console.log("Audio playing");
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    console.log("Audio paused");
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    console.log("Audio ended");
                  }}
                >
                  <source src={audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
                
                <div className="flex justify-center gap-4 mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlayPause}
                    className="flex items-center gap-1"
                  >
                    {isPlaying ? (
                      <><Pause className="h-4 w-4" /> Pause</>
                    ) : (
                      <><Play className="h-4 w-4" /> Play</>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" /> Download MP3
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebug(!showDebug)}
                    className="flex items-center gap-1"
                  >
                    {showDebug ? "Hide Debug" : "Show Debug"}
                  </Button>
                </div>
                
                {showDebug && (
                  <div className="mb-4 p-2 border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 rounded-md text-xs">
                    <p>Current Time: {currentTime.toFixed(2)}s</p>
                    <p>Is Playing: {isPlaying ? "Yes" : "No"}</p>
                    <p>Timestamps: {timestamps.length}</p>
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left">Word</th>
                            <th className="text-left">Start</th>
                            <th className="text-left">End</th>
                            <th className="text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timestamps.map((ts, idx) => (
                            <tr key={idx} className={currentTime >= ts.start_time && currentTime <= ts.end_time ? "bg-green-100 dark:bg-green-900/30" : ""}>
                              <td>{ts.word}</td>
                              <td>{ts.start_time.toFixed(2)}s</td>
                              <td>{ts.end_time.toFixed(2)}s</td>
                              <td>
                                {currentTime >= ts.start_time && currentTime <= ts.end_time 
                                  ? "✅ Current" 
                                  : currentTime < ts.start_time 
                                    ? "⏳ Upcoming" 
                                    : "✓ Passed"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Text with Word Highlighting
                  </h3>
                  <HighlightText
                    text={text}
                    timestamps={timestamps}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    onWordClick={handleWordClick}
                    key={`highlight-${updateCounter}`}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Words are highlighted automatically during playback. You can also click on any word to jump to that position in the audio.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <Button 
                onClick={handleGenerateSpeech}
                disabled={isLoading || !text.trim() || kokoroStatus === "offline"}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating with Highlighting...
                  </>
                ) : kokoroStatus === "offline" ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Kokoro Offline
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Generate Speech with Highlighting
                  </>
                )}
              </Button>
              
              {kokoroStatus === "offline" && (
                <div className="p-2 mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded">
                  <span className="flex items-center gap-1">
                    <VolumeX className="h-4 w-4" />
                    Unable to connect to the Kokoro TTS server. Check that it&apos;s running at localhost:8880.
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">TTS Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Voice</Label>
              <Select 
                value={selectedVoice} 
                onValueChange={setSelectedVoice}
                disabled={kokoroStatus !== "online"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {voices.length > 0 ? (
                    voices.map((voice) => (
                      <SelectItem 
                        key={voice.name} 
                        value={voice.name}
                      >
                        {voice.display_name || voice.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No voices available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Speed</Label>
                <Badge variant="outline">{speed.toFixed(1)}x</Badge>
              </div>
              <Slider
                min={0.5}
                max={2.0}
                step={0.1}
                value={[speed]}
                onValueChange={([value]) => setSpeed(value)}
                disabled={isLoading || kokoroStatus === "offline"}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Language (optional)</Label>
              <Select 
                value={langCode || "auto"}
                onValueChange={(value) => setLangCode(value === "auto" ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Auto detect (recommended)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto detect (recommended)</SelectItem>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="es">Spanish (es)</SelectItem>
                  <SelectItem value="fr">French (fr)</SelectItem>
                  <SelectItem value="it">Italian (it)</SelectItem>
                  <SelectItem value="de">German (de)</SelectItem>
                  <SelectItem value="pt">Portuguese (pt)</SelectItem>
                  <SelectItem value="ja">Japanese (ja)</SelectItem>
                  <SelectItem value="zh">Chinese (zh)</SelectItem>
                  <SelectItem value="ko">Korean (ko)</SelectItem>
                  <SelectItem value="hi">Hindi (hi)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Selecting a language can improve pronunciation accuracy
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Send to TTS button */}
        {/* {onTextToSpeech && (
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-50 to-white hover:from-orange-50 hover:to-amber-50 dark:from-gray-900 dark:to-gray-950 dark:hover:from-orange-950/30 dark:hover:to-amber-950/30 transition-all duration-300 border-gray-200 dark:border-gray-800"
            onClick={() => onTextToSpeech(text, langCode || undefined)}
          >
            Send to Standard TTS
          </Button>
        )} */}
      </div>
    </motion.div>
  );
}