import { MusicNoteIcon, PhotographIcon, VideoCameraIcon } from "@heroicons/react/solid";
import { FC, ReactNode, SetStateAction } from "react";
import Dropzone from "react-dropzone";
import { toast } from "react-hot-toast";
import { XIcon } from "@heroicons/react/outline";

import { cx } from "@src/utils/classnames";

interface ImageUploaderProps {
  files: any[];
  setFiles: (value: SetStateAction<any[]>) => void;
  children?: ReactNode;
  maxFiles?: number;
}

export const UploaderLite: FC<ImageUploaderProps> = ({ files, setFiles, maxFiles = 3, ...rest }) => {
  const onDrop = (acceptedFiles: any[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`You can only upload ${maxFiles} files`);
      return;
    }
    setFiles([
      ...files,
      ...acceptedFiles.map((file: any) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        }),
      ),
    ]);
  };

  const removeFile = (event, file: any) => {
    event?.preventDefault();
    setFiles(files.filter((f) => f !== file));
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 pb-4 mt-4">
        {files.map((file: any, i: number) => (
          <div className="reveal-on-hover relative" key={i}>
            {file.type.startsWith("image/") ? (
              <img className="object-cover rounded-sm w-[17.3rem] h-28" src={file.preview} alt={file.name} />
            ) : file.type.startsWith("video/") ? (
              <video className="object-cover rounded-sm w-[17.3rem] h-28" src={file.preview} controls />
            ) : (
              <audio className="object-cover rounded-sm w-[17.3rem] h-28" src={file.preview} controls />
            )}
            <button
              className="absolute top-0 right-0 bg-black/75 h-10 w-10 flex items-center justify-center show-on-hover "
              onClick={(e) => removeFile(e, file)}
            >
              <XIcon className="h-8 w-8 pl-2" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Dropzone
          accept={{ "image/*": [".png", ".gif", ".jpeg", ".jpg"] }}
          onDrop={onDrop}
          maxFiles={maxFiles}
          maxSize={8_000_000}
          onDropRejected={(fileRejections) => {
            fileRejections.forEach((file) => {
              if (file.errors[0].code === "file-too-large") {
                toast.error(`File "${file.file.name}" is larger than max size of 8MB`);
              }
            });
          }}
          {...rest}
        >
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className={cx(
                "flex flex-col items-center justify-center border-4 rounded-md border-spacing-5 border-dashed rounded-xs transition-all h-12 cursor-pointer border-dark-grey",
                files.length ? "shadow-xl" : "",
              )}
            >
              <input {...getInputProps()} />
              <div className="text-secondary flex items-center flex-col">
                <PhotographIcon width={25} height={25} />
              </div>
            </div>
          )}
        </Dropzone>

        <Dropzone
          accept={{ "video/*": [".mov", ".mp4"] }}
          onDrop={onDrop}
          maxFiles={maxFiles}
          maxSize={512_000_000}
          onDropRejected={(fileRejections) => {
            fileRejections.forEach((file) => {
              if (file.errors[0].code === "file-too-large") {
                toast.error(`File "${file.file.name}" is larger than max size of 512MB`);
              }
            });
          }}
          {...rest}
        >
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className={cx(
                "flex flex-col items-center justify-center border-4 rounded-md border-spacing-5 border-dashed rounded-xs transition-all h-12 cursor-pointer border-dark-grey",
                files.length ? "shadow-xl" : "",
              )}
            >
              <input {...getInputProps()} />
              <div className="text-secondary flex items-center flex-col">
                <VideoCameraIcon width={25} height={25} />
              </div>
            </div>
          )}
        </Dropzone>

        <Dropzone
          accept={{ "audio/*": [".mp3", ".wav"] }}
          onDrop={onDrop}
          maxFiles={maxFiles}
          maxSize={100_000_000}
          onDropRejected={(fileRejections) => {
            fileRejections.forEach((file) => {
              if (file.errors[0].code === "file-too-large") {
                toast.error(`File "${file.file.name}" is larger than max size of 100MB`);
              }
            });
          }}
          {...rest}
        >
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className={cx(
                "flex flex-col items-center justify-center border-4 rounded-md border-spacing-5 border-dashed rounded-xs transition-all h-12 cursor-pointer border-dark-grey",
                files.length ? "shadow-xl" : "",
              )}
            >
              <input {...getInputProps()} />
              <div className="text-secondary flex items-center flex-col">
                <MusicNoteIcon width={25} height={25} />
              </div>
            </div>
          )}
        </Dropzone>
      </div>
    </>
  );
};
