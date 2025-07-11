import { PhotographIcon } from "@heroicons/react/solid";
import { FC, ReactNode, SetStateAction, useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Dropzone from "react-dropzone";
import { toast } from "react-hot-toast";
import imageCompression from "browser-image-compression";
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { MinusIcon, PlusIcon, PencilIcon } from "@heroicons/react/solid";
import clsx from "clsx";
import { BodySemiBold } from "@src/styles/text";
import { Button } from "../Button";

export type AspectRatio = "16:9" | "9:16";

interface FileWithPreview extends File {
  preview: string;
}

// Add this interface for the ref methods
export interface ImageUploaderRef {
  openCropModal: (imageUrl: string, fileName?: string) => Promise<void>;
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
  compact?: boolean;
  defaultImage?: string;
}

const MAX_SIZE = 8000000; // 8mb

const ASPECT_RATIOS: { [key in AspectRatio]: { width: number; height: number; label: string } } = {
  "9:16": { width: 9, height: 16, label: "Vertical" },
  "16:9": { width: 16, height: 9, label: "Horizontal" },
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

  // Determine which dimension to constrain based on aspect ratio
  if (cropWidth / cropHeight > aspect) {
    // Image is wider than desired aspect ratio, constrain width
    cropWidth = cropHeight * aspect;
  } else {
    // Image is taller than desired aspect ratio, constrain height
    cropHeight = cropWidth / aspect;
  }

  // Center the crop area
  const x = (mediaWidth - cropWidth) / 2;
  const y = (mediaHeight - cropHeight) / 2;

  const result = {
    unit: '%' as const,
    width: (cropWidth / mediaWidth) * 100,
    height: (cropHeight / mediaHeight) * 100,
    x: (x / mediaWidth) * 100,
    y: (y / mediaHeight) * 100,
  };
  return result;
};

export const ImageUploader = forwardRef<ImageUploaderRef, ImageUploaderProps>(({
  files,
  setFiles,
  maxFiles = 6,
  accept = ["*"],
  orderedPreview = false,
  enableCrop = false,
  selectedAspectRatio,
  onAspectRatioChange,
  compact = false,
  defaultImage,
  ...rest
}, ref) => {
  const [cropFile, setCropFile] = useState<FileWithPreview | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [zoom, setZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const [internalSelectedRatio, setInternalSelectedRatio] = useState<AspectRatio>(selectedAspectRatio as AspectRatio || "9:16");
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

  // Expose the openCropModal method to parent components
  useImperativeHandle(ref, () => ({
    openCropModal: async (imageUrl: string, fileName = 'bonsai_image.png') => {
      if (!enableCrop) {
        console.warn('Crop modal cannot be opened when enableCrop is false');
        return;
      }

      try {
        let fileWithPreview: FileWithPreview;

        // For base64 images, convert directly to blob
        if (imageUrl.startsWith('data:')) {
          const response = await fetch(imageUrl);
          const blob = await response.blob();

          const file = new File([blob], fileName, {
            type: blob.type || 'image/png'
          });

          fileWithPreview = Object.assign(file, {
            preview: imageUrl // Keep the original base64 as preview
          }) as FileWithPreview;
        } else {
          // For regular URLs, try to fetch with CORS
          try {
            const response = await fetch(imageUrl, {
              mode: 'cors',
              headers: {
                'Accept': 'image/*'
              }
            });
            const blob = await response.blob();

            const file = new File([blob], fileName, {
              type: blob.type || 'image/png'
            });

            // Create an object URL for the blob to avoid CORS issues
            const objectUrl = URL.createObjectURL(blob);

            fileWithPreview = Object.assign(file, {
              preview: objectUrl
            }) as FileWithPreview;
          } catch (corsError) {
            // If CORS fails, try to use the original URL but this might still cause issues
            console.warn('CORS fetch failed, using original URL:', corsError);

            // Create a dummy file for the interface
            const file = new File([], fileName, { type: 'image/png' });

            fileWithPreview = Object.assign(file, {
              preview: imageUrl
            }) as FileWithPreview;
          }
        }

        setCropFile(fileWithPreview);

        // Set the anchor element to the dropzone element
        const dropzoneElement = document.querySelector('[data-testid="dropzone"]');
        if (dropzoneElement) {
          setCropperAnchorEl(dropzoneElement as HTMLElement);
        }

        // Set a default crop immediately to ensure the button isn't disabled
        // This will be overridden when the image loads
        const defaultCrop = {
          unit: '%' as const,
          width: 80,
          height: 80,
          x: 10,
          y: 10,
        };
        setCrop(defaultCrop);

      } catch (error) {
        console.error('Failed to open crop modal:', error);
        toast.error('Failed to load image for cropping');
      }
    }
  }), [enableCrop, selectedRatio]);

  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(1, Math.min(3, newZoom)));
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const ratio = ASPECT_RATIOS[selectedRatio];
    const aspect = ratio.width / ratio.height;
    const newCrop = centerAspectCrop(width, height, aspect);
    setCrop(newCrop);
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

  // Add this useEffect after the existing ones
  useEffect(() => {
    if (cropFile && !crop) {
      // If we have a crop file but no crop, set a default crop
      const defaultCrop = {
        unit: '%' as const,
        width: 80,
        height: 80,
        x: 10,
        y: 10,
      };
      setCrop(defaultCrop);
    }
  }, [cropFile, crop]);

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
    if (!cropFile || !crop || !imgRef.current) return;

    setIsCropping(true);

    try {
      // Create a new image element to load the original image data
      const sourceImage = new Image();
      sourceImage.crossOrigin = 'anonymous';

      // Load the original image data
      await new Promise<void>((resolve, reject) => {
        sourceImage.onload = () => resolve();
        sourceImage.onerror = () => reject(new Error('Failed to load source image'));
        sourceImage.src = cropFile.preview;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        toast.error('Failed to create canvas context');
        setIsCropping(false);
        return;
      }

      // Get the displayed image dimensions from the crop component
      const displayedImg = imgRef.current;
      if (!displayedImg) {
        toast.error('Display image reference not found');
        setIsCropping(false);
        return;
      }

      // Calculate scale factors between displayed and original image
      const scaleX = sourceImage.naturalWidth / displayedImg.clientWidth;
      const scaleY = sourceImage.naturalHeight / displayedImg.clientHeight;

      // Handle both pixel and percentage-based crop coordinates
      const pixelCrop = crop.unit === 'px' ? {
        // For pixel coordinates, scale them to match the original image size
        x: Math.round(crop.x * scaleX),
        y: Math.round(crop.y * scaleY),
        width: Math.round(crop.width * scaleX),
        height: Math.round(crop.height * scaleY)
      } : {
        // For percentage coordinates, apply directly to original image
        x: Math.round((crop.x * sourceImage.naturalWidth) / 100),
        y: Math.round((crop.y * sourceImage.naturalHeight) / 100),
        width: Math.round((crop.width * sourceImage.naturalWidth) / 100),
        height: Math.round((crop.height * sourceImage.naturalHeight) / 100)
      };

      // Validate crop dimensions
      if (pixelCrop.width <= 0 || pixelCrop.height <= 0) {
        toast.error('Invalid crop dimensions');
        console.error('Invalid crop dimensions:', pixelCrop);
        setIsCropping(false);
        return;
      }

      // Ensure crop doesn't exceed image bounds
      const clampedCrop = {
        x: Math.max(0, Math.min(pixelCrop.x, sourceImage.naturalWidth - pixelCrop.width)),
        y: Math.max(0, Math.min(pixelCrop.y, sourceImage.naturalHeight - pixelCrop.height)),
        width: Math.min(pixelCrop.width, sourceImage.naturalWidth),
        height: Math.min(pixelCrop.height, sourceImage.naturalHeight)
      };

      // Set canvas dimensions to match the crop size
      canvas.width = clampedCrop.width;
      canvas.height = clampedCrop.height;

      // Set the rendering quality
      ctx.imageSmoothingQuality = 'high';
      ctx.imageSmoothingEnabled = true;

      // Draw the cropped portion of the image
      ctx.drawImage(
        sourceImage,
        clampedCrop.x,
        clampedCrop.y,
        clampedCrop.width,
        clampedCrop.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, cropFile.type, 0.95); // Use original file type with 95% quality
      });

      if (!blob) {
        toast.error('Failed to create cropped image');
        setIsCropping(false);
        return;
      }

      const croppedFile = new File([blob], cropFile.name, {
        type: cropFile.type,
      });

      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          preserveExif: true,
        };

        const compressedBlob = await imageCompression(croppedFile, options);
        (compressedBlob as any).name = croppedFile.name;

        if (compressedBlob.size > MAX_SIZE) {
          toast.error(`File too large. Maximum size is 8 MB.`);
          setIsCropping(false);
          return;
        }

        const processedFile = Object.assign(compressedBlob, {
          preview: URL.createObjectURL(compressedBlob),
        });

        setFiles([...files, processedFile]);

        // Clean up the crop file's object URL
        if (cropFile.preview && cropFile.preview.startsWith('blob:')) {
          URL.revokeObjectURL(cropFile.preview);
        }

        setCropFile(null);
        setCropperAnchorEl(null);
        setCrop(undefined);
        setZoom(1);
        setIsCropping(false);
      } catch (error) {
        console.error("Compression error:", error);
        toast.error(`Error compressing ${croppedFile.name}`);
        setIsCropping(false);
      }
    } catch (error) {
      console.error("Cropping error:", error);
      toast.error('Failed to crop image');
      setIsCropping(false);
    }
  };

  const handleClose = () => {
    // Clean up object URLs to prevent memory leaks
    if (cropFile?.preview && cropFile.preview.startsWith('blob:')) {
      URL.revokeObjectURL(cropFile.preview);
    }

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
      ) : (files && files.length > 0) ? (
        <div className={clsx(
          "flex flex-col items-start rounded-2xl justify-center border-2 border-spacing-5 border-dashed rounded-xs transition-all cursor-pointer p-2 border-card-lightest relative w-fit",
          compact ? "p-1 bg-transparent" : "bg-card-light"
        )}>
          {files.map((file: FileWithPreview, i: number) => (
            <div className="relative w-fit" key={`file-${i}`}>
              <img
                className={clsx(
                  "rounded-lg object-contain bg-card-lightest",
                  compact ? "w-12 h-12" : "w-48 h-48"
                )}
                src={file.preview}
                alt={file.name}
              />
              <button
                onClick={(e) => removeFile(e, file)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : defaultImage ? (
        <div data-testid="dropzone">
          <Dropzone
            accept={{ "image/png": [".png"], "image/jpeg": [".jpeg"], "image/jpg": [".jpg"] }}
            onDrop={onDrop}
            maxFiles={maxFiles}
            {...rest}
          >
            {({ getRootProps, getInputProps }) => (
              <div
                {...getRootProps()}
                className={clsx(
                  "flex flex-col items-center rounded-2xl justify-center border-2 border-spacing-5 border-dashed rounded-xs transition-all cursor-pointer p-2 border-card-lightest w-fit min-w-16 relative",
                  compact ? "p-1 bg-transparent" : "bg-card-light"
                )}
              >
                <input {...getInputProps()} />
                <div className="relative">
                  <img
                    src={defaultImage}
                    alt="Default"
                    className={clsx(
                      "rounded-lg object-contain bg-card-lightest",
                      compact ? "w-12 h-12" : "w-48 h-48"
                    )}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
                    <span className="text-white text-sm font-medium">Edit</span>
                  </div>
                </div>
              </div>
            )}
          </Dropzone>
        </div>
      ) : (
        <div data-testid="dropzone">
          <Dropzone
            accept={{ "image/png": [".png"], "image/jpeg": [".jpeg"], "image/jpg": [".jpg"] }}
            onDrop={onDrop}
            maxFiles={maxFiles}
            {...rest}
          >
            {({ getRootProps, getInputProps }) => (
              <div
                {...getRootProps()}
                className={clsx(
                  "flex flex-col items-center rounded-2xl justify-center border-2 border-spacing-5 border-dashed rounded-xs transition-all cursor-pointer p-2 border-card-lightest w-fit min-w-16",
                  files?.length ? "shadow-xl" : "",
                  compact ? "p-1 bg-transparent" : "bg-card-light"
                )}
              >
                <input {...getInputProps()} />
                <div className="text-secondary flex items-center flex-col">
                  <PhotographIcon width={48} height={48} />
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
                    crossOrigin="anonymous"
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
                    className={clsx(
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
                <Button onClick={handleClose} variant="primary" disabled={isCropping} size="xs">Cancel</Button>
                <Button
                  onClick={onCropComplete}
                  variant="secondary"
                  disabled={!crop || isCropping}
                  size="xs"
                  className="transition-all duration-200"
                  title={!crop ? 'Waiting for crop area...' : isCropping ? 'Processing...' : 'Crop image'}
                >
                  {isCropping ? 'Cropping...' : 'Crop'}
                </Button>
              </div>
            </div>
          </div>
        </ClickAwayListener>
      </Popper>
    </>
  );
});

ImageUploader.displayName = 'ImageUploader';