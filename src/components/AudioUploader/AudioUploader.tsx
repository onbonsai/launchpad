import { FC, SetStateAction, useRef, useState, useEffect } from "react";
import Dropzone from "react-dropzone";
import { toast } from "react-hot-toast";
import { MusicNoteIcon, PlayIcon, PauseIcon } from "@heroicons/react/solid";
import { XIcon } from "@heroicons/react/outline";
import { cx } from "@src/utils/classnames";
import { BodySemiBold, Subtitle } from "@src/styles/text";
import { Button } from "../Button";
import WaveSurfer from "wavesurfer.js";

interface AudioUploaderProps {
  file: any;
  setFile: (value: SetStateAction<any>) => void;
  startTime: number;
  setStartTime: (t: number) => void;
}

const MAX_SIZE = 10_000_000; // 10MB
const CLIP_LENGTH = 10; // 10 seconds

export const AudioUploader: FC<AudioUploaderProps> = ({
  file,
  setFile,
  startTime,
  setStartTime,
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load audio into WaveSurfer
  useEffect(() => {
    if (file && waveformRef.current) {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#888",
        progressColor: "#5be39d",
        height: 64,
        barWidth: 2,
        cursorColor: "#5be39d",
        interact: true,
      });
      wavesurfer.current.load(file.preview);
      wavesurfer.current.on("ready", () => {
        setDuration(wavesurfer.current!.getDuration());
        setStartTime(0);
      });
      wavesurfer.current.on("seek", (progress: number) => {
        const newStart = Math.min(progress * wavesurfer.current!.getDuration(), wavesurfer.current!.getDuration() - CLIP_LENGTH);
        setStartTime(Math.max(0, newStart));
      });
      return () => {
        wavesurfer.current?.destroy();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Stop playback at end of clip
  useEffect(() => {
    if (!wavesurfer.current) return;
    const ws = wavesurfer.current;
    const checkTime = () => {
      if (ws.getCurrentTime() >= Math.min(startTime + CLIP_LENGTH, duration)) {
        ws.pause();
        setIsPlaying(false);
      }
    };
    ws.on("audioprocess", checkTime);
    ws.on("finish", () => setIsPlaying(false));
    return () => {
      ws.un("audioprocess", checkTime);
      ws.un("finish", () => setIsPlaying(false));
    };
  }, [startTime, duration]);

  const onDrop = (acceptedFiles: any[]) => {
    const file = acceptedFiles[0];
    if (file.size > MAX_SIZE) {
      toast.error(`File too large. Maximum size is 10MB.`);
      return;
    }
    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file)
    });
    setFile(fileWithPreview);
  };

  const removeFile = () => {
    setFile(null);
    setStartTime(0);
    setDuration(0);
    setIsPlaying(false);
    if (wavesurfer.current) {
      wavesurfer.current.destroy();
      wavesurfer.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const endTime = Math.min(startTime + CLIP_LENGTH, duration);

  // Play or pause from startTime for 10s
  const togglePlayPause = () => {
    if (!wavesurfer.current) return;
    if (isPlaying) {
      wavesurfer.current.pause();
      setIsPlaying(false);
    } else {
      wavesurfer.current.seekTo(startTime / duration);
      wavesurfer.current.play();
      setIsPlaying(true);
    }
  };

  // Drag handle for startTime
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseFloat(e.target.value);
    setStartTime(newStart);
    if (wavesurfer.current) {
      wavesurfer.current.seekTo(newStart / duration);
    }
  };

  return (
    <div className="space-y-4">
      {file ? (
        <div className="flex flex-col items-start rounded-2xl bg-card-light justify-center border-2 border-spacing-5 border-dashed rounded-xs transition-all cursor-pointer p-3 border-card-lightest">
          <div className="flex flex-row w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <MusicNoteIcon className="h-6 w-6 text-white" />
              <Subtitle className="text-white">{file.name}</Subtitle>
            </div>
            <Button
              className="w-fit max-h-6"
              size="xs"
              onClick={removeFile}
            >
              Remove
            </Button>
          </div>

          <div className="w-full mt-4">
            <div ref={waveformRef} className="w-full h-16 bg-black/30 rounded" />
            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                size="sm"
                className="px-2 py-1"
                onClick={togglePlayPause}
                disabled={duration === 0}
              >
                {isPlaying ? (
                  <PauseIcon className="h-5 w-5" />
                ) : (
                  <PlayIcon className="h-5 w-5" />
                )}
                <span className="ml-1">{isPlaying ? "Pause" : "Play Selection"}</span>
              </Button>
              <span className="text-xs text-white/60">
                {formatTime(startTime)} - {formatTime(endTime)}
              </span>
            </div>
            {/* Slider for startTime selection */}
            <div className="relative w-full h-2 bg-dark-grey rounded-full mt-4">
              <div
                className="absolute h-full bg-brand-highlight rounded-full"
                style={{
                  left: `${(startTime / duration) * 100}%`,
                  width: `${(CLIP_LENGTH / duration) * 100}%`,
                }}
              />
              <input
                type="range"
                min={0}
                max={duration - CLIP_LENGTH}
                step={0.01}
                value={startTime}
                onChange={handleSliderChange}
                className="absolute w-full h-full opacity-0 cursor-pointer"
                disabled={duration === 0}
              />
            </div>
          </div>
        </div>
      ) : (
        <Dropzone
          accept={{ "audio/": ["*"] }}
          onDrop={onDrop}
          maxFiles={1}
          maxSize={MAX_SIZE}
          onDropRejected={(fileRejections) => {
            fileRejections.forEach((file) => {
              if (file.errors[0].code === "file-too-large") {
                toast.error(`File "${file.file.name}" is larger than max size of 10MB`);
              }
            });
          }}
        >
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className={cx(
                "flex flex-col items-center rounded-2xl bg-card-light justify-center border-2 border-spacing-5 border-dashed rounded-xs transition-all cursor-pointer p-3 border-card-lightest",
                file ? "shadow-xl" : ""
              )}
            >
              <input {...getInputProps()} />
              <div className="text-secondary flex items-center flex-col">
                <MusicNoteIcon width={50} height={50} />
                <BodySemiBold>Upload audio (max: 10MB)</BodySemiBold>
              </div>
            </div>
          )}
        </Dropzone>
      )}
    </div>
  );
}; 