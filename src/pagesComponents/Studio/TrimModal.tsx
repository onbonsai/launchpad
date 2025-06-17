import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoryboardClip } from '@pages/studio/create';
import { Button } from '@src/components/Button';

interface TrimModalProps {
  clip: StoryboardClip | null;
  onClose: () => void;
  onSave: (clipId: string, startTime: number, endTime: number) => void;
}

const TrimModal: React.FC<TrimModalProps> = ({ clip, onClose, onSave }) => {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (clip) {
      setStartTime(clip.startTime);
      setEndTime(clip.endTime);
      setCurrentTime(clip.startTime);
    }
  }, [clip]);

  // High-precision time tracking with requestAnimationFrame
  useEffect(() => {
    const updateTime = () => {
      if (videoRef.current && isPlaying) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        
        // Auto-pause if we've reached the end time
        if (time >= endTime) {
          videoRef.current.pause();
          setIsPlaying(false);
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
  }, [isPlaying, endTime]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = (time % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };

  // Extract coordinates from mouse or touch event
  const getEventCoordinates = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return { clientX: e.touches[0]?.clientX || 0 };
    }
    return { clientX: e.clientX };
  };

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !clip) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const time = percentage * clip.duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [clip]);

  const handleHandleMouseDown = useCallback((handle: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(handle);
  }, []);

  const handleHandleTouchStart = useCallback((handle: 'start' | 'end') => (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(handle);
  }, []);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !timelineRef.current || !clip) return;
    
    e.preventDefault();
    const rect = timelineRef.current.getBoundingClientRect();
    const { clientX } = getEventCoordinates(e);
    const mouseX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
    const time = percentage * clip.duration;
    
    if (isDragging === 'start') {
      const newStartTime = Math.max(0, Math.min(time, endTime - 0.1));
      setStartTime(newStartTime);
      if (videoRef.current) {
        videoRef.current.currentTime = newStartTime;
        setCurrentTime(newStartTime);
      }
    } else if (isDragging === 'end') {
      const newEndTime = Math.min(clip.duration, Math.max(time, startTime + 0.1));
      setEndTime(newEndTime);
    }
  }, [isDragging, clip, endTime, startTime]);

  const handleEnd = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      // Add both mouse and touch event listeners
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
  }, [isDragging, handleMove, handleEnd]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.currentTime = Math.max(startTime, currentTime);
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || isPlaying) return;
    // Only update when not playing (to avoid conflicts with animation frame)
    setCurrentTime(videoRef.current.currentTime);
  };

  const playTrimmedSection = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!videoRef.current) return;
    
    videoRef.current.currentTime = startTime;
    setCurrentTime(startTime);
    videoRef.current.play();
    setIsPlaying(true);
  };

  if (!clip || !clip.preview.video) return null;

  const handleSave = () => {
    onSave(clip.id, startTime, endTime);
    onClose();
  };

  const startPercentage = (startTime / clip.duration) * 100;
  const endPercentage = (endTime / clip.duration) * 100;
  const currentPercentage = (currentTime / clip.duration) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-xl p-4 sm:p-6 w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Trim Clip</h2>
        
        <div className="relative mb-4 sm:mb-6">
          <video
            ref={videoRef}
            src={clip.preview.video.url}
            className="w-full rounded-lg max-h-[40vh] sm:max-h-[50vh] object-contain bg-black"
            onTimeUpdate={handleVideoTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Timeline */}
          <div className="relative">
            <div
              ref={timelineRef}
              className="h-14 sm:h-16 bg-zinc-700 rounded-lg relative cursor-pointer touch-pan-x"
              onClick={handleTimelineClick}
            >
              {/* Selected range */}
              <div
                className="absolute top-0 h-full bg-blue-500/30 rounded-lg"
                style={{
                  left: `${startPercentage}%`,
                  width: `${endPercentage - startPercentage}%`
                }}
              />
              
              {/* Current time indicator */}
              <div
                className="absolute top-0 w-1 sm:w-0.5 h-full bg-white z-20"
                style={{ left: `${currentPercentage}%` }}
              />
              
              {/* Start handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-6 h-10 sm:w-5 sm:h-8 bg-blue-500 rounded cursor-ew-resize z-10 hover:bg-blue-400 transition-colors touch-manipulation"
                style={{ left: `${startPercentage}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                onMouseDown={handleHandleMouseDown('start')}
                onTouchStart={handleHandleTouchStart('start')}
              />
              
              {/* End handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-6 h-10 sm:w-5 sm:h-8 bg-blue-500 rounded cursor-ew-resize z-10 hover:bg-blue-400 transition-colors touch-manipulation"
                style={{ left: `${endPercentage}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                onMouseDown={handleHandleMouseDown('end')}
                onTouchStart={handleHandleTouchStart('end')}
              />
            </div>
            
            <div className="flex justify-between text-xs sm:text-sm text-gray-400 mt-2">
              <span>0:00</span>
              <span>{formatTime(clip.duration)}</span>
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
            
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={playTrimmedSection}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:px-3 sm:py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors touch-manipulation"
              >
                Preview Trim
              </button>
              <button
                onClick={togglePlayPause}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:px-3 sm:py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors touch-manipulation"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 justify-end">
          <Button 
            variant="primary" 
            onClick={onClose}
            className="py-3 sm:py-2 text-base sm:text-sm"
          >
            Cancel
          </Button>
          <Button 
            variant="accentBrand" 
            onClick={handleSave}
            className="py-3 sm:py-2 text-base sm:text-sm"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrimModal; 