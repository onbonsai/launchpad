import { PhotographIcon } from "@heroicons/react/solid";
import { FC, ReactNode, SetStateAction, useState, useRef, useEffect } from "react";
import Dropzone from "react-dropzone";
import { toast } from "react-hot-toast";
import imageCompression from "browser-image-compression";
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { MinusIcon, PlusIcon } from "@heroicons/react/solid";

import { cx } from "@src/utils/classnames";
import { BodySemiBold, Header2, Subtitle } from "@src/styles/text";
import { Button } from "../Button";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

interface FileWithPreview extends File {
  preview: string;
}

interface ImageUploaderProps {
  files: FileWithPreview[];
  setFiles: (value: SetStateAction<FileWithPreview[]>) => void;
  maxFiles?: number;
  orderedPreview?: boolean;
  accept?: string[];
  children?: ReactNode;
  enableCrop?: boolean;
  selectedAspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
}

const MAX_SIZE = 8000000; // 8mb

const ASPECT_RATIOS: { [key in AspectRatio]: { width: number; height: number; label: string } } = {
  "16:9": { width: 16, height: 9, label: "16:9" },
  "9:16": { width: 9, height: 16, label: "9:16" },
  "1:1": { width: 1, height: 1, label: "1:1" },
  "4:3": { width: 4, height: 3, label: "4:3" },
  "3:4": { width: 3, height: 4, label: "3:4" },
  "21:9": { width: 21, height: 9, label: "21:9" },
};

// Preview icon component for aspect ratios
const AspectRatioIcon: FC<{ width: number; height: number }> = ({ width, height }) => {
  const scale = 16 / Math.max(width, height);
  const scaledWidth = Math.round(width * scale);
  const scaledHeight = Math.round(height * scale);

  return (
    <span className="inline-block border border-current mr-1" style={{
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`
    }} />
  );
};

const centerAspectCrop = (
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) => {
  let cropWidth = mediaWidth;
  let cropHeight = mediaHeight;

  if (cropWidth / cropHeight > aspect) {
    cropWidth = cropHeight * aspect;
  } else {
    cropHeight = cropWidth / aspect;
  }

  const x = (mediaWidth - cropWidth) / 2;
  const y = (mediaHeight - cropHeight) / 2;

  return {
    unit: '%' as const,
    width: (cropWidth / mediaWidth) * 100,
    height: (cropHeight / mediaHeight) * 100,
    x: (x / mediaWidth) * 100,
    y: (y / mediaHeight) * 100,
  };
};

export const ImageUploader: FC<ImageUploaderProps> = ({
  files,
  setFiles,
  maxFiles = 6,
  accept = ["*"],
  orderedPreview = false,
  enableCrop = false,
  selectedAspectRatio,
  onAspectRatioChange,
  ...rest
}) => {
  const [cropFile, setCropFile] = useState<FileWithPreview | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [zoom, setZoom] = useState(1);
  const [internalSelectedRatio, setInternalSelectedRatio] = useState<AspectRatio>(selectedAspectRatio as AspectRatio || "1:1");
  const [cropperAnchorEl, setCropperAnchorEl] = useState<HTMLElement | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use either controlled or internal state
  const selectedRatio = selectedAspectRatio || internalSelectedRatio;
  const setSelectedRatio = (ratio: AspectRatio) => {
    if (onAspectRatioChange) {
      onAspectRatioChange(ratio);
    } else {
      setInternalSelectedRatio(ratio);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(1, Math.min(3, newZoom)));
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const ratio = ASPECT_RATIOS[selectedRatio];
    const aspect = ratio.width / ratio.height;

    const crop = centerAspectCrop(width, height, aspect);
    setCrop(crop);
    setZoom(1);
  };

  // Update crop when aspect ratio changes
  useEffect(() => {
    if (!imgRef.current) return;

    const { naturalWidth: width, naturalHeight: height } = imgRef.current;
    const ratio = ASPECT_RATIOS[selectedRatio];
    const aspect = ratio.width / ratio.height;

    const crop = centerAspectCrop(width, height, aspect);
    setCrop(crop);
  }, [selectedRatio]);

  const onDrop = async (acceptedFiles: any[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`You can only upload ${maxFiles} images`);
      return;
    }

    if (enableCrop) {
      // When cropping is enabled, handle one file at a time
      const file = acceptedFiles[0];
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      const fileWithPreview = Object.assign(file, {
        preview: URL.createObjectURL(file)
      }) as FileWithPreview;
      setCropFile(fileWithPreview);
      // Set the anchor element to the dropzone element
      const dropzoneElement = document.querySelector('[data-testid="dropzone"]');
      if (dropzoneElement) {
        setCropperAnchorEl(dropzoneElement as HTMLElement);
      }
      return;
    }

    const processedFiles = await Promise.all(
      acceptedFiles.map(async (file: any) => {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          return null;
        }

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 720,
          useWebWorker: true,
        };

        try {
          const compressedBlob = await imageCompression(file, options);
          (compressedBlob as any).name = file.name;
          if (compressedBlob.size > MAX_SIZE) {
            toast.error(`File too large. Maximum size is 8 MB.`);
            return;
          }

          return Object.assign(compressedBlob, {
            preview: URL.createObjectURL(compressedBlob),
          });
        } catch (error) {
          console.error("Compression error:", error);
          toast.error(`Error compressing ${file.name}. Uploading original file.`);
          return Object.assign(file, {
            preview: URL.createObjectURL(file),
          });
        }
      })
    );

    const validFiles = processedFiles.filter((f) => f !== null);
    setFiles([...files, ...validFiles]);
  };

  const removeFile = (event, file: FileWithPreview) => {
    event?.preventDefault();
    setFiles(files.filter((f) => f !== file));
  };

  const onCropComplete = async () => {
    if (!cropFile || !imgRef.current || !crop) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    // Use the original image dimensions for the canvas
    const pixelCrop = {
      x: (crop.x * imgRef.current.naturalWidth) / 100,
      y: (crop.y * imgRef.current.naturalHeight) / 100,
      width: (crop.width * imgRef.current.naturalWidth) / 100,
      height: (crop.height * imgRef.current.naturalHeight) / 100
    };

    // Set canvas dimensions to match the crop size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      toast.error('Failed to crop image');
      return;
    }

    // Set the rendering quality
    ctx.imageSmoothingQuality = 'high';
    ctx.imageSmoothingEnabled = true;

    // Draw the cropped portion of the image
    ctx.drawImage(
      imgRef.current,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error('Failed to crop image');
        return;
      }

      const croppedFile = new File([blob], cropFile.name, {
        type: cropFile.type,
      });

      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920, // Increased from 720 to maintain better quality
          useWebWorker: true,
          preserveExif: true,
        };

        const compressedBlob = await imageCompression(croppedFile, options);
        (compressedBlob as any).name = croppedFile.name;

        if (compressedBlob.size > MAX_SIZE) {
          toast.error(`File too large. Maximum size is 8 MB.`);
          return;
        }

        const processedFile = Object.assign(compressedBlob, {
          preview: URL.createObjectURL(compressedBlob),
        });

        setFiles([...files, processedFile]);
        setCropFile(null);
        setCropperAnchorEl(null);
        setCrop(undefined);
        setZoom(1);
      } catch (error) {
        console.error("Compression error:", error);
        toast.error(`Error compressing ${croppedFile.name}`);
      }
    }, cropFile.type, 1.0); // Added quality parameter of 1.0 for maximum quality
  };

  const handleClose = () => {
    setCropFile(null);
    setCropperAnchorEl(null);
    setCrop(undefined);
    setZoom(1);
  };

  return (
    <>
      {orderedPreview ? (
        <div className="grid grid-cols-5 gap-4 mt-2 pb-4">
          {files.map((file: FileWithPreview, i: number) => (
            <div key={i}>
              {i < maxFiles && (
                <>
                  <div className="reveal-on-hover relative w-50 h-50">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="top-0 left-0 w-full h-full rounded-sm mb-1"
                      width={200}
                      height={200}
                    />
                    <button
                      className="-mt-8 bg-black/75 absolute h-8 show-on-hover w-full"
                      onClick={(e) => removeFile(e, file)}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="">Level {i + 1}</p>
                </>
              )}
            </div>
          ))}
        </div>
      ) : files.length > 0 && (
        <div className="flex flex-col items-start rounded-2xl bg-card-light justify-center border-2 border-spacing-5 border-dashed rounded-xs transition-all cursor-pointer p-3 border-card-lightest">
          {files.map((file: FileWithPreview, i: number) => (
            <div className="flex flex-row" key={`file-${i}`}>
              <img
                className="rounded-lg h-12 w-12 object-cover"
                src={file.preview}
                alt={file.name}
              />
              <div className="flex flex-col ml-3 justify-between">
                <Subtitle className="text-white">{file.name}</Subtitle>
                <Button
                  className="w-fit max-h-6"
                  size="xs"
                  onClick={(e) => removeFile(e, file)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length !== maxFiles && (
        <div data-testid="dropzone">
          <Dropzone
            accept={{ "image/": ["*"] }}
            onDrop={onDrop}
            maxFiles={maxFiles}
            {...rest}
          >
            {({ getRootProps, getInputProps }) => (
              <div
                {...getRootProps()}
                className={cx(
                  "flex flex-col items-center rounded-2xl bg-card-light justify-center border-2 border-spacing-5 border-dashed rounded-xs transition-all cursor-pointer p-3 border-card-lightest",
                  files.length ? "shadow-xl" : ""
                )}
              >
                <input {...getInputProps()} />
                <div className="text-secondary flex items-center flex-col">
                  <PhotographIcon width={50} height={50} />
                  <BodySemiBold>Upload an image (max: 8mb)</BodySemiBold>
                </div>
              </div>
            )}
          </Dropzone>
        </div>
      )}

      <Popper
        open={Boolean(cropperAnchorEl)}
        anchorEl={cropperAnchorEl}
        placement="bottom-start"
        style={{ zIndex: 1400 }}
      >
        <ClickAwayListener onClickAway={handleClose}>
          <div className="mt-2 bg-dark-grey rounded-lg shadow-lg w-[400px] overflow-hidden">
            <div className="relative">
              <ReactCrop
                crop={crop}
                onChange={setCrop}
                aspect={ASPECT_RATIOS[selectedRatio].width / ASPECT_RATIOS[selectedRatio].height}
                className="max-h-[400px] overflow-hidden flex items-center justify-center bg-card-light"
                locked={true}
                ruleOfThirds
              >
                <div className="relative w-fit flex items-center justify-center">
                  <img
                    ref={imgRef}
                    src={cropFile?.preview}
                    alt="Crop preview"
                    className="max-h-[400px] w-auto object-contain"
                    onLoad={onImageLoad}
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center'
                    }}
                  />
                </div>
              </ReactCrop>
            </div>

            <div className="p-2.5 space-y-2.5">
              {/* Aspect Ratio Selector */}
              <div className="flex justify-center gap-1">
                {Object.entries(ASPECT_RATIOS).map(([ratio, { width, height, label }]) => (
                  <button
                    key={ratio}
                    onClick={() => setSelectedRatio(ratio as AspectRatio)}
                    className={cx(
                      "flex items-center justify-center px-2 py-1 rounded border text-sm transition-colors",
                      selectedRatio === ratio
                        ? "bg-white text-black border-white"
                        : "bg-card-light text-white border-card-lightest hover:bg-card-lightest"
                    )}
                  >
                    <span className="flex items-center">
                      <AspectRatioIcon width={width} height={height} />
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center justify-center gap-1.5 px-2">
                <button
                  className="p-1 rounded-full hover:bg-card-lightest transition-colors"
                  onClick={() => handleZoomChange(zoom - 0.1)}
                >
                  <MinusIcon className="w-3 h-3" />
                </button>

                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-28 mx-1.5 accent-white"
                />

                <button
                  className="p-1 rounded-full hover:bg-card-lightest transition-colors"
                  onClick={() => handleZoomChange(zoom + 0.1)}
                >
                  <PlusIcon className="w-3 h-3" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-card-lightest">
                <Button onClick={handleClose} variant="primary" size="xs">Cancel</Button>
                <Button onClick={onCropComplete} variant="secondary" disabled={!crop} size="xs">
                  Crop
                </Button>
              </div>
            </div>
          </div>
        </ClickAwayListener>
      </Popper>
    </>
  );
};