import Image from "next/image";
import { ShareIcon, ClipboardCopyIcon } from "@heroicons/react/outline";

import { WebShareManager, copyLink } from "@src/utils/webShare";

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const Share = ({ text, url }: { text: string; url: string }) => {
  const shareNative = async () => {
    await WebShareManager.share({
      title: text,
      text: text,
      url: url
    });
  };

  const handleCopyLink = async () => {
    await copyLink(url, 'Link copied!');
  };

  const shareToX = () => {
    const ctaLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURI(url)}`;
    window.open(ctaLink, "_blank");
  };
  const shareToLens = () => {
    const ctaLink = `https://${!IS_PRODUCTION ? "testnet." : ""}hey.xyz/?text=${text}&url=${encodeURI(url)}`;
    window.open(ctaLink, "_blank");
  };
  const shareToFarcaster = () => {
    const ctaLink = `https://farcaster.xyz/~/compose?text=${encodeURIComponent(text)}&embeds%5B%5D=${encodeURI(url)}`;
    window.open(ctaLink, "_blank");
  };

  return (
    <div className="mt-4 text-center mx-auto">
      <p className="mb-2">Share to socials</p>
      <div className="flex items-center justify-center">
        <div className="flex justify-center space-x-6 mt-4">
          <button 
            onClick={shareNative}
            className="flex flex-col items-center hover:opacity-80 transition-opacity"
            title="Share"
          >
            <div className="w-[46px] h-[46px] bg-blue-500 rounded-full flex items-center justify-center">
              <ShareIcon className="w-6 h-6 text-white" />
            </div>
          </button>
          <button 
            onClick={handleCopyLink}
            className="flex flex-col items-center hover:opacity-80 transition-opacity"
            title="Copy Link"
          >
            <div className="w-[46px] h-[46px] bg-gray-600 rounded-full flex items-center justify-center">
              <ClipboardCopyIcon className="w-6 h-6 text-white" />
            </div>
          </button>
          <button onClick={() => shareToLens()}>
            <Image
              height={46}
              width={46}
              src="/lens.webp"
              title="Lens"
              unoptimized={true}
              alt="Lens"
              style={{
                maxWidth: "100%",
                height: "auto",
              }}
            />
          </button>
          <button onClick={() => shareToFarcaster()}>
            <Image
              height={46}
              width={46}
              src="/farcaster.png"
              title="Farcaster"
              unoptimized={true}
              alt="farcaster"
              style={{
                maxWidth: "100%",
                height: "auto",
              }}
            />
          </button>
          <button onClick={() => shareToX()}>
            <Image
              height={46}
              width={46}
              src="/twitter.png"
              title="Twitter"
              unoptimized={true}
              alt="twitter"
              style={{
                maxWidth: "100%",
                height: "auto",
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Share;
