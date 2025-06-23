import { FC, SetStateAction, useRef, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { MusicNoteIcon, PlayIcon, PauseIcon } from "@heroicons/react/solid";
import { cx } from "@src/utils/classnames";
import { BodySemiBold, Subtitle } from "@src/styles/text";
import { Button } from "../Button";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import clsx from "clsx";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@src/components/LoadingSpinner/LoadingSpinner";

interface AudioUploaderProps {
  file: any;
  setFile: (value: SetStateAction<any>) => void;
  startTime: number;
  setStartTime: (t: number) => void;
  audioDuration?: number;
  compact?: boolean;
  onAddToStoryboard?: () => void;
  isAddedToStoryboard?: boolean;
}

const MAX_SIZE = 10_000_000; // 10MB
const DEFAULT_CLIP_LENGTH = 10; // 10 seconds

export const AudioUploader: FC<AudioUploaderProps> = ({
  file,
  setFile,
  startTime,
  setStartTime,
  audioDuration,
  compact = false,
  onAddToStoryboard,
  isAddedToStoryboard,
}) => {
  const { address } = useAccount();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const {
    data: userAudioData,
    isLoading: userAudioLoading,
    error: userAudioError,
  } = useQuery({
    queryKey: ["userAudio", address],
    queryFn: () => fetch(`/api/audio/get-user-audio?address=${address}`).then((res) => res.json()),
    enabled: !!address,
  });

  const userAudios = userAudioData?.audios || [];

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regionsPlugin = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const clipLength = audioDuration ?? DEFAULT_CLIP_LENGTH;

  // Load audio into WaveSurfer
  useEffect(() => {
    if (file && waveformRef.current) {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }

      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current!,
        waveColor: "#888",
        progressColor: "#5be39d",
        height: 64,
        barWidth: 2,
        cursorColor: "transparent",
        interact: true,
        plugins: [RegionsPlugin.create()],
      });

      regionsPlugin.current = wavesurfer.current.getActivePlugins()[0] as ReturnType<
        typeof RegionsPlugin.create
      >;

      wavesurfer.current.load(file.preview || file.url);
      wavesurfer.current.on("ready", () => {
        const newDuration = wavesurfer.current!.getDuration();
        setDuration(newDuration);
        setStartTime(0);

        if (clipLength > 0) {
          regionsPlugin.current!.addRegion({
            id: "clip-region",
            start: 0,
            end: Math.min(clipLength, newDuration),
            color: "rgba(255,255,255,0.3)",
            drag: true,
            resize: false,
          });
        }
      });

      regionsPlugin.current.on("region-updated", (region) => {
        setStartTime(region.start);
      });

      return () => {
        try {
          wavesurfer.current?.destroy();
        } catch {}
      };
    }
  }, [file, clipLength, setStartTime]);

  // Stop playback at end of clip
  useEffect(() => {
    if (!wavesurfer.current) return;
    const ws = wavesurfer.current;
    const checkTime = () => {
      if (ws.getCurrentTime() >= Math.min(startTime + clipLength, duration)) {
        ws.pause();
      }
    };
    ws.on("audioprocess", checkTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    ws.on("play", onPlay);
    ws.on("pause", onPause);
    ws.on("finish", onPause);

    return () => {
      ws.un("audioprocess", checkTime);
      ws.un("play", onPlay);
      ws.un("pause", onPause);
      ws.un("finish", onPause);
    };
  }, [startTime, duration, clipLength]);

  const onDrop = (acceptedFiles: any[]) => {
    const file = acceptedFiles[0];
    if (file.size > MAX_SIZE) {
      toast.error(`File too large. Maximum size is 10MB.`);
      return;
    }
    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file),
    });
    setFile(fileWithPreview);
    setIsLibraryOpen(false);
  };

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/": ["*"] },
    maxFiles: 1,
    maxSize: MAX_SIZE,
    noClick: true,
    noKeyboard: true,
    onDropRejected: (fileRejections) => {
      fileRejections.forEach((file) => {
        if (file.errors[0].code === "file-too-large") {
          toast.error(`File "${file.file.name}" is larger than max size of 10MB`);
        }
      });
    },
  });

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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const endTime = Math.min(startTime + clipLength, duration);

  const handleSelectAudio = (audio) => {
    setFile(audio);
    setIsLibraryOpen(false);
  };

  // Play or pause from startTime for 10s
  const togglePlayPause = () => {
    if (!wavesurfer.current) return;
    if (isPlaying) {
      wavesurfer.current.pause();
    } else {
      wavesurfer.current.play(startTime, endTime);
    }
  };

  return (
    <div className={clsx("space-y-4", compact ? "space-y-2" : "")}>
      {file ? (
        <div
          className={clsx(
            "flex flex-col items-start rounded-2xl justify-center border-2 border-spacing-5 border-dashed rounded-xs transition-all p-3 border-card-lightest",
            "bg-card-light"
          )}
        >
          <div className="flex flex-row w-full items-center justify-between relative">
            <div className="flex items-center gap-3">
              <MusicNoteIcon className={clsx("text-white", compact ? "h-4 w-4" : "h-6 w-6")} />
              <Subtitle className={clsx("text-white", compact ? "text-sm" : "")}>
                {file.name}
              </Subtitle>
            </div>
            <button
              onClick={removeFile}
              className="absolute right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="w-full mt-4">
            <div ref={waveformRef} className={clsx("w-full bg-black/30 rounded relative", compact ? "h-8" : "h-16")} />
            <div className="flex items-center gap-2 mt-2 relative z-10">
              <Button type="button" size="xs" variant="dark-grey" className={clsx("w-fit", compact ? "max-h-5" : "max-h-6")} onClick={togglePlayPause} disabled={duration === 0}>
                {isPlaying ? <PauseIcon className={clsx(compact ? "h-4 w-4" : "h-5 w-5")} /> : <PlayIcon className={clsx(compact ? "h-4 w-4" : "h-5 w-5")} />}
                <span className={clsx("ml-1", compact ? "text-xs" : "")}>{isPlaying ? "Pause" : "Preview Selection"}</span>
              </Button>
              <span className={clsx("text-white/60", compact ? "text-xs" : "text-sm")}>
                {formatTime(startTime)} - {formatTime(endTime)}
              </span>
              {onAddToStoryboard && (
                <Button
                  type="button"
                  size="xs"
                  variant={isAddedToStoryboard ? "primary" : "accentBrand"}
                  className={clsx("w-fit ml-auto", compact ? "max-h-5" : "max-h-6")}
                  onClick={onAddToStoryboard}
                  disabled={isAddedToStoryboard}
                >
                  {isAddedToStoryboard ? "Added" : "Add to Storyboard"}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          {!isLibraryOpen ? (
            <div
              onClick={() => setIsLibraryOpen(true)}
              className={clsx(
                "flex flex-col items-center rounded-2xl justify-center border-2 border-spacing-5 border-dashed rounded-xs transition-all cursor-pointer p-3 border-card-lightest",
                isDragActive ? "shadow-xl" : "",
                compact ? "p-2 bg-transparent" : "bg-card-light"
              )}
            >
              <div className="text-secondary flex items-center flex-col">
                <MusicNoteIcon width={compact ? 25 : 50} height={compact ? 25 : 50} />
                {!compact && <BodySemiBold>Upload audio (max: 10MB)</BodySemiBold>}
              </div>
            </div>
          ) : (
            <div className="bg-card-light rounded-2xl p-4 relative">
              <button
                onClick={() => setIsLibraryOpen(false)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-20"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-white font-semibold mb-3">Select from your library</h3>
              {userAudioLoading ? (
                <div className="flex justify-center items-center h-24">
                  <LoadingSpinner />
                </div>
              ) : userAudios.length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {userAudios.map((audio, index) => (
                    <li
                      key={index}
                      onClick={() => handleSelectAudio(audio)}
                      className="flex items-center justify-between p-2 rounded-lg bg-card-lightest hover:bg-card-lighter cursor-pointer transition-colors"
                    >
                      <span className="text-white text-sm">{audio.name}</span>
                      <PlayIcon className="h-5 w-5 text-gray-400" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No audio files found in your library.
                </p>
              )}
              <Button type="button" variant="dark-grey" className="w-full mt-4" onClick={open}>
                Upload new audio
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
