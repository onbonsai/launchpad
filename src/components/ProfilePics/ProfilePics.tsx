import React, { memo } from "react";
import { SafeImage } from "../SafeImage/SafeImage";

const ProfilePics: React.FC<{ profiles?: any[] }> = ({ profiles }) => {
  if (!profiles?.length) return null;

  return (
    <div className="flex -space-x-2">
      {profiles.map((p: any, index: number) => (
        <SafeImage
          key={index}
          className="inline-block h-10 w-10 rounded-full ring-2 ring-dark-grey"
          src={p.metadata?.picture}
          alt="/sage.webp"
          height={32}
          width={32}
          // quality={75}
          unoptimized
        />
      ))}
    </div>
  );
};

export default memo(ProfilePics);
