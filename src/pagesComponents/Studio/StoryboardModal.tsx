import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { XCircleIcon, ScissorsIcon, MusicNoteIcon, PencilAltIcon } from '@heroicons/react/solid';
import { PlayIcon, PauseIcon } from '@heroicons/react/outline';
import type { StoryboardClip } from '@src/services/madfi/studio';
import { Button } from '@src/components/Button';
import { Modal } from '@src/components/Modal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AudioUploader } from '@src/components/AudioUploader/AudioUploader';

interface StoryboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: StoryboardClip[];
  setClips: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  audio: File | string | { url?: string; preview?: string; name?: string } | null;
  setAudio: React.Dispatch<React.SetStateAction<File | string | { url?: string; preview?: string; name?: string } | null>>;
  storyboardAudioStartTime: number;
  setStoryboardAudioStartTime: React.Dispatch<React.SetStateAction<number>>;
  isRemixAudio?: boolean;
}

const StoryboardModal: React.FC<StoryboardModalProps> = ({
  isOpen,
  onClose,
  clips,
  setClips,
  audio,
  setAudio,
  storyboardAudioStartTime,
  setStoryboardAudioStartTime,
  isRemixAudio = false
}) => {
  const [selectedClip, setSelectedClip] = useState<StoryboardClip | null>(null);
  const [isEditingAudio, setIsEditingAudio] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wasPlayingBeforeScrubRef = useRef(false);

  useEffect(() => {
    if (!audio) {
      setIsEditingAudio(false);
      setAudioLoaded(false);
    } else {
      setAudioLoaded(false);
    }
  }, [audio, isOpen]);

  // Reset trim controls when clip changes
  useEffect(() => {
    if (selectedClip) {
      setStartTime(selectedClip.startTime);
      setEndTime(selectedClip.endTime);
      setCurrentTime(selectedClip.startTime);
      setIsPlaying(false);
      setShowPlayButton(true);
      
      // Pause audio when switching clips
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [selectedClip]);

  // High-precision time tracking with requestAnimationFrame
  useEffect(() => {
    const updateTime = () => {
      if (videoRef.current && isPlaying && selectedClip) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);

        // Sync audio with video
        if (audioRef.current && audio && audioLoaded) {
          const audioStartTime = getAudioStartTimeForClip(selectedClip.id);
          const audioCurrentTime = audioStartTime + (time - selectedClip.startTime);
          
          // Only sync if there's a significant difference to avoid constant adjustments
          if (Math.abs(audioRef.current.currentTime - audioCurrentTime) > 0.1) {
            try {
              audioRef.current.currentTime = audioCurrentTime;
            } catch (error) {
              console.error('[StoryboardModal] Audio sync error:', error);
            }
          }
        }

        // Auto-pause if we've reached the end time
        if (time >= endTime) {
          videoRef.current.pause();
          if (audioRef.current && audio) {
            audioRef.current.pause();
          }
          return;
        }
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, endTime, selectedClip, audio]);

  // Cleanup animation frame on modal close
  useEffect(() => {
    if (!isOpen && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      setIsPlaying(false);
      // Also pause audio when modal closes
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isOpen]);

  // Cleanup drag state on modal close
  useEffect(() => {
    if (!isOpen) {
      // Reset body styles in case modal was closed during drag
      document.body.style.userSelect = '';
    }
  }, [isOpen]);

  const formatTime = (time: number, showMilliseconds = true) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    if (showMilliseconds) {
      return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
    }
    return `${minutes}:${Math.floor(seconds).toString().padStart(2, '0')}`;
  };

  // Extract coordinates from mouse or touch event
  const getEventCoordinates = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return { clientX: e.touches[0]?.clientX || 0 };
    }
    return { clientX: e.clientX };
  };

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !selectedClip || isDragging) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const time = percentage * selectedClip.duration;

    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      
      // Sync audio to the new position
      if (audioRef.current && audio && audioLoaded) {
        const audioStartTime = getAudioStartTimeForClip(selectedClip.id);
        const audioCurrentTime = audioStartTime + (time - selectedClip.startTime);
        try {
          audioRef.current.currentTime = audioCurrentTime;
        } catch (error) {
          console.error('[StoryboardModal] Audio seek error:', error);
        }
      }
    }
  }, [selectedClip, isDragging, audio]);

  const handleHandleMouseDown = useCallback((handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    wasPlayingBeforeScrubRef.current = isPlaying;
    if (isPlaying) {
      videoRef.current?.pause();
      audioRef.current?.pause();
    }
    setIsDragging(handle);
  }, [isPlaying]);

  const handleHandleTouchStart = useCallback((handle: 'start' | 'end') => (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    wasPlayingBeforeScrubRef.current = isPlaying;
    if (isPlaying) {
      videoRef.current?.pause();
      audioRef.current?.pause();
    }
    setIsDragging(handle);
  }, [isPlaying]);

  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingPlayhead(true);
    wasPlayingBeforeScrubRef.current = isPlaying;
    if (isPlaying) {
      videoRef.current?.pause();
      audioRef.current?.pause();
    }
  }, [isPlaying]);

  const handlePlayheadTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingPlayhead(true);
    wasPlayingBeforeScrubRef.current = isPlaying;
    if (isPlaying) {
      videoRef.current?.pause();
      audioRef.current?.pause();
    }
  }, [isPlaying]);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if ((!isDragging && !isDraggingPlayhead) || !timelineRef.current || !selectedClip) return;

    e.preventDefault();
    const rect = timelineRef.current.getBoundingClientRect();
    const { clientX } = getEventCoordinates(e);
    const mouseX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
    const time = percentage * selectedClip.duration;

    if (isDraggingPlayhead) {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        
        // Sync audio to the new position
        if (audioRef.current && audio && audioLoaded) {
          const audioStartTime = getAudioStartTimeForClip(selectedClip.id);
          const audioCurrentTime = audioStartTime + (time - selectedClip.startTime);
          try {
            audioRef.current.currentTime = audioCurrentTime;
          } catch (error) {
            console.error('[StoryboardModal] Audio seek error:', error);
          }
        }
      }
      setCurrentTime(time);
      return;
    }

    if (isDragging === 'start') {
      const newStartTime = Math.max(0, Math.min(time, endTime - 0.1));
      setStartTime(newStartTime);
      if (videoRef.current) {
        videoRef.current.currentTime = newStartTime;
        setCurrentTime(newStartTime);
        
        // Sync audio to the new position
        if (audioRef.current && audio && audioLoaded) {
          const audioStartTime = getAudioStartTimeForClip(selectedClip.id);
          const audioCurrentTime = audioStartTime + (newStartTime - selectedClip.startTime);
          try {
            audioRef.current.currentTime = audioCurrentTime;
          } catch (error) {
            console.error('[StoryboardModal] Audio seek error:', error);
          }
        }
      }
    } else if (isDragging === 'end') {
      const newEndTime = Math.min(selectedClip.duration, Math.max(time, startTime + 0.1));
      setEndTime(newEndTime);
    }
  }, [isDragging, isDraggingPlayhead, selectedClip, endTime, startTime]);

  const handleEnd = useCallback(() => {
    if (isDragging) {
      if (videoRef.current) {
        videoRef.current.currentTime = startTime;
        videoRef.current.play();
        
        // Also resume background audio if it exists
        if (audioRef.current && audio && selectedClip) {
          const audioStartTime = getAudioStartTimeForClip(selectedClip.id);
          const audioCurrentTime = audioStartTime + (startTime - selectedClip.startTime);
          playAudioSafely(audioRef.current, audioCurrentTime);
        }
      }
    } else if (isDraggingPlayhead && wasPlayingBeforeScrubRef.current && videoRef.current) {
      videoRef.current.play();
      
      // Also resume background audio if it exists
      if (audioRef.current && audio && selectedClip) {
        const audioStartTime = getAudioStartTimeForClip(selectedClip.id);
        const audioCurrentTime = audioStartTime + (videoRef.current.currentTime - selectedClip.startTime);
        playAudioSafely(audioRef.current, audioCurrentTime);
      }
    }
    setIsDragging(null);
    setIsDraggingPlayhead(false);
  }, [isDragging, isDraggingPlayhead, startTime, selectedClip, audio]);

  useEffect(() => {
    if (isDragging || isDraggingPlayhead) {
      document.addEventListener('mousemove', handleMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isDraggingPlayhead, handleMove, handleEnd]);

  const togglePlayPause = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!videoRef.current || !selectedClip) return;

    if (isPlaying) {
      videoRef.current.pause();
      // Also pause audio if it exists
      if (audioRef.current && audio) {
        audioRef.current.pause();
      }
    } else {
      // Always start from the trim start time when playing
      if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }
      
      // Start audio at the correct time for this clip
      if (audioRef.current && audio) {
        const audioStartTime = getAudioStartTimeForClip(selectedClip.id);
        const audioCurrentTime = audioStartTime + (videoRef.current.currentTime - selectedClip.startTime);
        playAudioSafely(audioRef.current, audioCurrentTime);
      }
      
      videoRef.current.play();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || isDraggingPlayhead) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleVideoClick = () => {
    togglePlayPause();
  };

  const removeClip = (clipId: string) => {
    setClips(clips.filter(clip => clip.id !== clipId));
    if (selectedClip?.id === clipId) {
      setSelectedClip(null);
    }
  };

  const handleSaveTrim = () => {
    if (!selectedClip) return;

    setClips(clips.map(clip =>
      clip.id === selectedClip.id ? { ...clip, startTime, endTime } : clip
    ));
    setSelectedClip(null);
  };

  const onDragEnd = (result: DropResult) => {
    // Re-enable body scroll and text selection
    document.body.style.userSelect = '';

    const { destination, source } = result;
    if (!destination) return;

    const reorderedClips = Array.from(clips);
    const [removed] = reorderedClips.splice(source.index, 1);
    reorderedClips.splice(destination.index, 0, removed);

    setClips(reorderedClips);
  };

  const handleClipSelect = (clip: StoryboardClip) => {
    if (selectedClip?.id === clip.id) {
      setSelectedClip(null); // Deselect if clicking the same clip
    } else {
      setSelectedClip(clip);
    }
  };

  const renderTimelineTicks = (duration: number) => {
    if (duration <= 0) return null;
    const tickInterval = duration > 30 ? 5 : duration > 10 ? 2 : 1;
    const numTicks = Math.floor(duration / tickInterval);

    return (
      <>
        {Array.from({ length: numTicks }).map((_, i) => {
          const time = (i + 1) * tickInterval;
          const left = (time / duration) * 100;
          return (
            <div key={`tick-${i}`} style={{ left: `${left}%` }} className="absolute h-full top-0 -translate-x-1/2">
              <div className="w-px h-2 bg-white/40" />
              <span className="absolute text-xs text-white/60 -translate-x-1/2 top-3">{formatTime(time, false)}</span>
            </div>
          );
        })}
      </>
    );
  };

  const startPercentage = selectedClip ? (startTime / selectedClip.duration) * 100 : 0;
  const endPercentage = selectedClip ? (endTime / selectedClip.duration) * 100 : 0;
  const currentPercentage = selectedClip ? (currentTime / selectedClip.duration) * 100 : 0;

  const storyboardDuration = clips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);

  // Memoize audio URL to prevent constant reloading
  const audioSrc = useMemo(() => {
    if (!audio) return null;
    if (typeof audio === 'string') return audio;
    if (audio instanceof File) return URL.createObjectURL(audio);
    // Handle library audio objects that have url property
    if (audio.url) return audio.url;
    if (audio.preview) return audio.preview;
    return null;
  }, [audio]);

  // Cleanup blob URLs when component unmounts or audio changes
  useEffect(() => {
    return () => {
      if (audioSrc && audioSrc.startsWith('blob:')) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, [audioSrc]);

  // Calculate audio start time for the selected clip
  const getAudioStartTimeForClip = (clipId: string) => {
    const clipIndex = clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return 0;
    
    // Sum duration of all clips before this one
    const previousClipsDuration = clips.slice(0, clipIndex).reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);
    
    // Add the storyboard audio start time
    return storyboardAudioStartTime + previousClipsDuration;
  };

  // Helper function to safely play audio
  const playAudioSafely = async (audioElement: HTMLAudioElement, targetTime: number) => {
    if (!audioLoaded) {
      console.log('[StoryboardModal] Audio not loaded yet, skipping playback');
      return;
    }
    
    try {
      // Ensure audio element is ready
      if (audioElement.readyState < 2) {
        console.log('[StoryboardModal] Audio not ready, waiting for canplay event');
        await new Promise((resolve) => {
          const handleCanPlay = () => {
            audioElement.removeEventListener('canplay', handleCanPlay);
            resolve(true);
          };
          audioElement.addEventListener('canplay', handleCanPlay);
          // Timeout after 2 seconds
          setTimeout(() => {
            audioElement.removeEventListener('canplay', handleCanPlay);
            resolve(false);
          }, 2000);
        });
      }
      
      audioElement.currentTime = targetTime;
      const playPromise = audioElement.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        console.log('[StoryboardModal] Background audio playing at', targetTime);
      }
    } catch (error) {
      // Ignore play interruption errors
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('[StoryboardModal] Audio play error:', error);
      }
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      setOpen={(open: boolean) => !open && onClose()}
      panelClassnames="!max-w-6xl !min-w-0 w-full"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Storyboard Editor</h2>
        </div>

        <div className="space-y-6">
          {/* Clip Editor Section */}
          {selectedClip && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Edit Clip {clips.findIndex(c => c.id === selectedClip.id) + 1}
              </h3>

              {/* Video Preview with Play/Pause and Timeline Overlay */}
              <div
                className="relative mb-4 group"
              >
                <video
                  ref={videoRef}
                  src={selectedClip.preview.video?.url}
                  className="w-full rounded-lg max-h-[40vh] object-contain bg-black"
                  onClick={handleVideoClick}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onPlay={() => {
                    setIsPlaying(true);
                    setShowPlayButton(false);
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    setShowPlayButton(true);
                  }}
                  onLoadedData={() => {
                    // Video loaded data successfully
                  }}
                  onError={(e) => {
                    console.error('[StoryboardModal] Video error:', e, {
                      error: e.currentTarget.error,
                      src: e.currentTarget.src,
                      networkState: e.currentTarget.networkState,
                      readyState: e.currentTarget.readyState
                    });
                  }}
                  onLoadStart={() => {
                    // Video load started
                  }}
                />

                {/* Hidden audio element for background audio playback */}
                {audio && audioSrc && (
                  <audio
                    ref={audioRef}
                    src={audioSrc}
                    preload="auto"
                    onLoadedData={() => {
                      setAudioLoaded(true);
                    }}
                    onCanPlay={() => {
                      setAudioLoaded(true);
                    }}
                    onError={(e) => {
                      console.error('[StoryboardModal] Audio error:', e);
                      setAudioLoaded(false);
                    }}
                    onLoadStart={() => {
                      setAudioLoaded(false);
                    }}
                  />
                )}

                {/* Play/Pause Overlay Button */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                    showPlayButton ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={handleVideoClick}
                >
                  <div className="bg-black/60 backdrop-blur-sm rounded-full p-4 hover:bg-black/70 transition-colors">
                    {isPlaying ? (
                      <PauseIcon className="w-16 h-16 text-white" />
                    ) : (
                      <PlayIcon className="w-16 h-16 text-white" />
                    )}
                  </div>
                </div>

                {/* Timeline Editor Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pt-8 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="relative">
                    <div
                      ref={timelineRef}
                      className="h-8 bg-zinc-700/50 rounded-lg relative cursor-pointer touch-pan-x"
                      onClick={handleTimelineClick}
                    >
                      {/* Ticks */}
                      {renderTimelineTicks(selectedClip.duration)}

                      {/* Selected range */}
                      <div
                        className="absolute top-0 h-full bg-blue-500/50 rounded-lg border-x-2 border-blue-300"
                        style={{
                          left: `${startPercentage}%`,
                          width: `${endPercentage - startPercentage}%`
                        }}
                      />

                      {/* Current time indicator handle */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-[calc(100%+8px)] cursor-ew-resize z-30 group"
                        style={{ left: `${currentPercentage}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                        onMouseDown={handlePlayheadMouseDown}
                        onTouchStart={handlePlayheadTouchStart}
                      >
                        <div className="w-0.5 h-full bg-white mx-auto group-hover:bg-blue-300 transition-colors" />
                      </div>

                      {/* Start handle */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-full bg-blue-500 rounded-l-md cursor-ew-resize z-20 hover:bg-blue-400 transition-colors touch-manipulation"
                        style={{ left: `${startPercentage}%`, transform: 'translateY(-50%)' }}
                        onMouseDown={handleHandleMouseDown('start')}
                        onTouchStart={handleHandleTouchStart('start')}
                      />

                      {/* End handle */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-full bg-blue-500 rounded-r-md cursor-ew-resize z-20 hover:bg-blue-400 transition-colors touch-manipulation"
                        style={{ left: `${endPercentage}%`, transform: 'translateX(-100%) translateY(-50%)' }}
                        onMouseDown={handleHandleMouseDown('end')}
                        onTouchStart={handleHandleTouchStart('end')}
                      />
                    </div>

                    {/* Background Audio Timeline */}
                    {audio && (
                      <div className="mt-2">
                        <div className="h-4 bg-zinc-800/50 rounded-md relative">
                          {/* Audio segment for this clip */}
                          <div
                            className="absolute top-0 h-full bg-green-500/60 rounded-md border border-green-400/50"
                            style={{
                              left: `${startPercentage}%`,
                              width: `${endPercentage - startPercentage}%`
                            }}
                          />
                          
                          {/* Audio timeline labels */}
                          <div className="absolute -bottom-5 left-0 text-xs text-green-400/80">
                            {formatTime(storyboardAudioStartTime + clips.slice(0, clips.findIndex(c => c.id === selectedClip.id)).reduce((total, clip) => total + (clip.endTime - clip.startTime), 0), false)}
                          </div>
                          <div className="absolute -bottom-5 right-0 text-xs text-green-400/80">
                            {formatTime(storyboardAudioStartTime + clips.slice(0, clips.findIndex(c => c.id === selectedClip.id) + 1).reduce((total, clip) => total + (clip.endTime - clip.startTime), 0), false)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Time displays and controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-4 text-sm">
                  <div className="text-center sm:text-left">
                    <div className="text-gray-400 text-xs mb-1">Start</div>
                    <div className="text-white font-mono text-sm">{formatTime(startTime)}</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-gray-400 text-xs mb-1">End</div>
                    <div className="text-white font-mono text-sm">{formatTime(endTime)}</div>
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-gray-400 text-xs mb-1">Duration</div>
                    <div className="text-white font-mono text-sm">{formatTime(endTime - startTime)}</div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="accentBrand"
                    onClick={handleSaveTrim}
                    className="py-2.5 sm:py-2 text-sm"
                  >
                    Save Trim
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!selectedClip && clips.length > 0 && (
            <div className="text-center py-8 text-gray-400">
              Click on a clip below to edit it
            </div>
          )}

          {/* Clips Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Clips</h3>
            <DragDropContext
              onDragEnd={onDragEnd}
              onDragStart={() => {
                // Disable body scroll during drag to prevent positioning issues
                document.body.style.userSelect = 'none';
              }}
              onDragUpdate={() => {
                // Keep body scroll disabled during drag
                document.body.style.userSelect = 'none';
              }}
            >
              <Droppable
                droppableId="storyboard"
                direction="horizontal"
                renderClone={(provided, snapshot, rubric) => (
                  <div
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    ref={provided.innerRef}
                    className={`relative flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden group cursor-pointer transition-all ring-2 ring-blue-500 shadow-lg`}
                    style={{
                      ...provided.draggableProps.style,
                      // Force the clone to be positioned properly
                      position: 'fixed',
                      zIndex: 9999,
                      pointerEvents: 'none',
                      transform: provided.draggableProps.style?.transform || 'none',
                    }}
                  >
                    <img
                      src={clips[rubric.source.index]?.preview.imagePreview || clips[rubric.source.index]?.preview.image}
                      alt={`Clip ${rubric.source.index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex flex-col justify-between p-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove clip"
                        >
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-white text-xs font-mono bg-black/60 px-1.5 py-0.5 rounded">
                          {rubric.source.index + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              >
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex space-x-3 overflow-x-auto pb-3 pt-1 pl-1"
                  >
                    {clips.map((clip, index) => (
                      <Draggable key={clip.id} draggableId={clip.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => handleClipSelect(clip)}
                            className={`relative flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden group cursor-pointer transition-all ${
                              selectedClip?.id === clip.id
                                ? 'ring-2 ring-blue-500 shadow-lg'
                                : 'hover:ring-1 hover:ring-blue-300'
                            } ${snapshot.isDragging ? 'opacity-50' : ''}`}
                            style={provided.draggableProps.style}
                          >
                            <img
                              src={clip.preview.imagePreview || clip.preview.image}
                              alt={`Clip ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 flex flex-col justify-between p-2">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeClip(clip.id);
                                  }}
                                  className="text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove clip"
                                >
                                  <XCircleIcon className="w-5 h-5" />
                                </button>
                              </div>
                              <div className="flex justify-between items-end">
                                <span className="text-white text-xs font-mono bg-black/60 px-1.5 py-0.5 rounded">
                                  {index + 1}
                                </span>
                                {selectedClip?.id === clip.id && (
                                  <ScissorsIcon className="w-4 h-4 text-blue-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {clips.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No clips in storyboard yet
              </div>
            )}
          </div>

          {/* Audio Section */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-white mb-3">Background Audio</h3>
            {audio ? (
              isRemixAudio && typeof audio === 'string' && audio.startsWith('http') ? (
                <div className="text-secondary/70 bg-zinc-700 rounded-lg p-4 text-sm">The original audio clip will be used.</div>
              ) : isEditingAudio ? (
                <>
                  <AudioUploader
                    file={audio}
                    setFile={setAudio}
                    startTime={storyboardAudioStartTime}
                    setStartTime={setStoryboardAudioStartTime}
                    audioDuration={storyboardDuration > 0 ? storyboardDuration : undefined}
                    compact
                  />
                  {audio && storyboardDuration > 0 && (
                    <div className="flex justify-end mt-2">
                      <Button variant="primary" size="sm" onClick={() => setIsEditingAudio(false)}>Confirm</Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between p-4 bg-zinc-700 rounded-lg">
                  <div className="flex items-center gap-6">
                    <MusicNoteIcon className="w-5 h-5 text-white" />
                    <span className="text-white text-sm">
                      {typeof audio === 'string' ? 'audio.mp3' : (audio instanceof File ? audio.name : audio.name || 'audio.mp3')}
                    </span>
                    <span className="text-white/60 text-sm">
                      ({formatTime(storyboardAudioStartTime, false)} - {formatTime(storyboardAudioStartTime + storyboardDuration, false)})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsEditingAudio(true)} className="text-white/70 hover:text-white"><PencilAltIcon className="w-5 h-5" /></button>
                    <button onClick={() => setAudio(null)} className="text-white/70 hover:text-white"><XCircleIcon className="w-5 h-5" /></button>
                  </div>
                </div>
              )
            ) : (
              // Show uploader if no audio
              <AudioUploader
                file={null}
                setFile={setAudio}
                startTime={storyboardAudioStartTime}
                setStartTime={setStoryboardAudioStartTime}
                audioDuration={storyboardDuration > 0 ? storyboardDuration : undefined}
                compact
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StoryboardModal;