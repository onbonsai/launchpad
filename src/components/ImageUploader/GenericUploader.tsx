import { PhotographIcon } from "@heroicons/react/solid";
import { FC, ReactNode, SetStateAction } from "react";
import Dropzone from "react-dropzone";
import { toast } from "react-hot-toast";
import imageCompression from "browser-image-compression";

import { cx } from "@src/utils/classnames";

interface ImageUploaderProps {
  files: any[];
  setFiles: (value: SetStateAction<any[]>) => void;
  children?: ReactNode;
  contained?: boolean;
}

const MAX_SIZE = 8000000; // 8 MB
const MAX_FILES = 1;

export const GenericUploader: FC<ImageUploaderProps> = ({ files, setFiles, contained, ...rest }) => {
  const acceptFileTypes = {
    "image/*": [".png", ".gif", ".jpeg", ".jpg"],
    "video/*": [".mov", ".mp4"],
    // "audio/*": [".mp3", ".wav"]
  };

  const onDrop = async (acceptedFiles: any[]) => {
    if (files.length + acceptedFiles.length > MAX_FILES) {
      toast.error(`You can only upload ${MAX_FILES} images`);
      return;
    }

    const processedFiles = await Promise.all(
      acceptedFiles.map(async (file: any) => {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 720,
          useWebWorker: true,
        };

        if (!file.type.startsWith("image/")) {
          return Object.assign(file, {
            preview: URL.createObjectURL(file),
          });
        }

        try {
          const compressedBlob = await imageCompression(file, options);
          (compressedBlob as any).name = file.name;
          // console.log("Compressed file:", compressedBlob);
          // console.log(`Image size reduced from ${file.size} to ${compressedBlob.size}`);
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

  const removeFile = (event, file: any) => {
    event?.preventDefault();
    setFiles(files.filter((f) => f !== file));
  };

  return (
    <>
      {contained ? (
        <div className="flex gap-2 mt-4">
          {files.map((file: any, i: number) => (
            <div className="reveal-on-hover relative" key={i}>
              <img className="object-cover rounded-md w-[3rem] h-8" src={file.preview} alt={file.name} />
              <button className="-mt-8 bg-black/75 absolute h-8 show-on-hover w-full" onClick={(e) => removeFile(e, file)}>
                x
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 pb-2 mt-2">
          {files.map((file: any, i: number) => (
            <div className="reveal-on-hover relative" key={i}>
              <img className="object-cover rounded-md w-[3rem] h-14" src={file.preview} alt={file.name} />
              <button className="-mt-8 bg-black/75 absolute h-8 show-on-hover w-full" onClick={(e) => removeFile(e, file)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      {files?.length < MAX_FILES && (
        <Dropzone
          accept={acceptFileTypes}
          onDrop={onDrop}
          maxFiles={MAX_FILES}
          maxSize={MAX_SIZE}
          {...rest}
        >
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className={cx(
                "flex flex-col items-center justify-center transition-all h-10 cursor-pointer",
                !contained ? "border-2 rounded-md border-spacing-5 rounded-xs border-dark-grey shadow-sm focus:border-dark-grey focus:ring-dark-grey" : "",
                files.length ? "shadow-xl" : "",
              )}
            >
              <input {...getInputProps()} />
              <div className="text-secondary flex items-center flex-col">
                <PhotographIcon width={50} height={20} />
              </div>
            </div>
          )}
        </Dropzone>
      )}
    </>
  );
};
