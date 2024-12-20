import React, { useMemo, memo } from "react";
import Image from "next/image";
import { formatProfilePicture } from "@madfi/widgets-react";

const ProfilePics: React.FC<{ profiles?: any[] }> = ({ profiles }) => {
  if (!profiles?.length) return null;

  const images = useMemo(() => {
    return profiles
      .map((profile) => {
        // using lens profile object
        if (profile.__typename === "Profile" || profile.id?.includes("0x")) {
          return formatProfilePicture(profile).metadata.picture.url;
        }

        // basic usage
        return profile.lens ? profile.lens.avatar_url : profile.twitter.avatar_url;
      })
      .filter((u) => u);
  }, [profiles]);

  return (
    <div className="flex -space-x-2">
      {images.map((url: string, index: number) => (
        <Image
          key={index}
          className="inline-block h-10 w-10 rounded-full ring-2 ring-dark-grey"
          src={url}
          alt="/sage.webp"
          height={32}
          width={32}
          quality={75}
        />
      ))}
    </div>
  );
};

export default memo(ProfilePics);
