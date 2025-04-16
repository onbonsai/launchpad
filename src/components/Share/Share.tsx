import Image from "next/image";

import { IS_PRODUCTION } from "@src/constants/constants";

const Share = ({ text, url }: { text: string; url: string }) => {
  const shareToX = () => {
    const ctaLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURI(url)}`;
    window.open(ctaLink, "_blank");
  };
  const shareToLens = () => {
    const ctaLink = `https://${!IS_PRODUCTION ? "testnet." : ""}hey.xyz/?text=${text}&url=${encodeURI(url)}`;
    window.open(ctaLink, "_blank");
  };
  const shareToFarcaster = () => {
    const ctaLink = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds%5B%5D=${encodeURI(url)}`;
    window.open(ctaLink, "_blank");
  };

  return (
    <div className="mt-4 text-center mx-auto">
      <p className="mb-2">Share to socials</p>
      <div className="flex items-center justify-center">
        <div className="flex justify-center space-x-6 mt-4">
          <button onClick={() => shareToLens()}>
            <Image
              height={46}
              width={46}
              src="/lens.png"
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
