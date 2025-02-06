import { PhotographIcon } from "@heroicons/react/solid";
import { FC, ReactNode, SetStateAction } from "react";
import Dropzone from "react-dropzone";
import { toast } from "react-hot-toast";
import imageCompression from "browser-image-compression";

import { cx } from "@src/utils/classnames";
import { BodySemiBold, Header2, Subtitle } from "@src/styles/text";
import { Button } from "../Button";

interface ImageUploaderProps {
  files: any[];
  setFiles: (value: SetStateAction<any[]>) => void;
  maxFiles?: number;
  orderedPreview?: boolean;
  accept?: string[];
  children?: ReactNode;
}

const MAX_SIZE = 10000000; // 10mb

export const ImageUploader: FC<ImageUploaderProps> = ({
  files,
  setFiles,
  maxFiles = 6,
  accept = ["*"],
  orderedPreview = false,
  ...rest
}) => {
  const onDrop = async (acceptedFiles: any[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`You can only upload ${maxFiles} images`);
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
          console.log("Compressed file:", compressedBlob);
          console.log(`Image size reduced from ${file.size} to ${compressedBlob.size}`);

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
      {orderedPreview ? (
        <div className="grid grid-cols-5 gap-4 mt-2 pb-4">
          {files.map((file: any, i: number) => (
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
          {files.map((file: any, i: number) => (
            <div className="flex flex-row" key={`file-${i}`}>
              <img
                className="rounded-xl h-12 w-12 object-cover"
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
        <Dropzone
          accept={{ "image/": ["*"] }}
          onDrop={onDrop}
          maxFiles={maxFiles}
          maxSize={MAX_SIZE}
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
                <BodySemiBold>Upload an image (max: 10mb)</BodySemiBold>
              </div>
            </div>
          )}
        </Dropzone>
      )}
    </>
  );
};