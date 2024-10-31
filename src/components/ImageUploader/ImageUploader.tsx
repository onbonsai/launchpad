import { PhotographIcon } from "@heroicons/react/solid";
import { FC, ReactNode, SetStateAction } from "react";
import Dropzone from "react-dropzone";
import { toast } from "react-hot-toast";

import { cx } from "@src/utils/classnames";

interface ImageUploaderProps {
  files: any[];
  setFiles: (value: SetStateAction<any[]>) => void;
  maxFiles?: number;
  orderedPreview?: boolean;
  accept?: string[];
  children?: ReactNode;
}

export const ImageUploader: FC<ImageUploaderProps> = ({
  files,
  setFiles,
  maxFiles = 6,
  accept = ["*"],
  orderedPreview = false,
  ...rest
}) => {
  const onDrop = (acceptedFiles: any[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`You can only upload ${maxFiles} images`);
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
                      className=" top-0 left-0 w-full h-full rounded-sm mb-1"
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
      ) : (
        <div className="grid grid-cols-2 gap-2 pb-4">
          {files.map((file: any, i: number) => (
            <div className="reveal-on-hover relative" key={i}>
              <img className="object-cover rounded-md w-[17.3rem] h-28" src={file.preview} alt={file.name} />
              <button
                className="-mt-8 bg-black/75 absolute h-8 show-on-hover w-full"
                onClick={(e) => removeFile(e, file)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length != maxFiles && (
        <Dropzone accept={{ "image/": ["*"] }} onDrop={onDrop} maxFiles={maxFiles} maxSize={8000000} {...rest}>
          {({ getRootProps, getInputProps }) => (
            <div
              {...getRootProps()}
              className={cx(
                "flex flex-col items-center justify-center border-4 rounded-md border-spacing-5 border-dashed rounded-xs transition-all h-40 cursor-pointer border-dark-grey",
                files.length ? "shadow-xl" : "",
              )}
            >
              <input {...getInputProps()} />

              <div className="text-secondary flex items-center flex-col">
                <PhotographIcon width={50} height={50} />
                <p className="font-bold text-xl">
                  {/* Add {orderedPreview ? "" : "up to"} {maxFiles - files.length} {files.length === 0 ? "" : "more"}{" "} */}
                  Upload an image
                </p>
              </div>
            </div>
          )}
        </Dropzone>
      )}
    </>
  );
};
