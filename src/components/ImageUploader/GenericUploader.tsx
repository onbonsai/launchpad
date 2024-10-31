import { PhotographIcon } from "@heroicons/react/solid";
import { FC, ReactNode, SetStateAction } from "react";
import Dropzone from "react-dropzone";
import { toast } from "react-hot-toast";

import { cx } from "@src/utils/classnames";

interface ImageUploaderProps {
  files: any[];
  setFiles: (value: SetStateAction<any[]>) => void;
  children?: ReactNode;
}

const MAX_FILE_SIZE = 10000000; // 10 MB
const MAX_FILES = 1;

export const GenericUploader: FC<ImageUploaderProps> = ({ files, setFiles, ...rest }) => {
  const acceptFileTypes = {
    "image/*": [".png", ".gif", ".jpeg", ".jpg"],
    "video/*": [".mov", ".mp4"],
    // "audio/*": [".mp3", ".wav"]
  };

  const onDrop = (acceptedFiles: any[]) => {
    for (const file of acceptedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large. Maximum size is 10 MB.`);
        return;
      }
    }
    if (files.length + acceptedFiles.length > MAX_FILES) {
      toast.error(`You can only upload ${MAX_FILES}`);
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
      {files?.length < MAX_FILES && (
        <Dropzone
          accept={acceptFileTypes}
          onDrop={onDrop}
          MAX_FILES={MAX_FILES}
          maxSize={MAX_FILE_SIZE}
          {...rest}
        >
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className={cx(
                "flex flex-col items-center justify-center border-2 rounded-md border-spacing-5 rounded-xs border-dark-grey shadow-sm focus:border-dark-grey focus:ring-dark-grey transition-all h-10 cursor-pointer",
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
