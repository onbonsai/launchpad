import clsx from "clsx";
import { brandFont } from "@src/fonts/fonts";
import { useAccount } from "wagmi";
import { Dialog } from "@headlessui/react";
import { SITE_URL } from "@src/constants/constants";
import { Button } from "@src/components/Button";
import { tweetIntentTokenReferral, castIntentTokenReferral } from "@src/utils/utils";
import Copy from "@src/components/Copy/Copy";
import Image from "next/image";

const ShareModal = ({ tokenAddress, chain, symbol }) => {
  const { address } = useAccount();

  const urlEncodedPostParams = () => {
    const params = {
      text: `Trade $${symbol} on @bonsai
${SITE_URL}/token/${chain}/${tokenAddress}?ref=${address}`,
    };

    return new URLSearchParams(params).toString();
  }

  return (
    <div className="flex flex-col md:w-[500px] w-full"
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}>
      <Dialog.Title as="h2" className="text-2xl leading-7 font-bold">
        Earn Referral Rewards from your link
      </Dialog.Title>
      <div className="w-full mt-4 md:mb-8 mb-4 md:h-full">
        <div className="flex flex-col w-full my-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center md:space-x-2 margin-auto space-y-2 md:space-y-0">
            <a href={`https://orb.club/create-post?${urlEncodedPostParams()}`} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
              <Button className="w-full md:w-[150px] bg-black hover:bg-black/80" variant="none">
                <Image src="/svg/orb-logo-white.svg" alt="Orb Logo" className="w-4 h-4" width={20} height={20} />
              </Button>
            </a>
            <a href={tweetIntentTokenReferral({
              text: `Trade $${symbol} on the @onbonsai Launchpad \n`,
              chain,
              tokenAddress,
              referralAddress: address!
            })} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
              <Button variant="accent" className="w-full md:w-[150px] flex items-center justify-center hover:bg-white/80">
                <Image src="/svg/X_logo_2023.svg" alt="X Logo" className="w-4 h-4" width={20} height={20} />
              </Button>
            </a>
            <a href={castIntentTokenReferral({
              text: `Trade $${symbol} on the @onbonsai.eth Launchpad`,
              chain,
              tokenAddress,
              referralAddress: address!
            })} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
              <Button className="w-full md:w-[150px] bg-[#7C65C1] hover:bg-[#7C65C1]/80 text-white" variant="none">
                <Image src="/svg/farcaster-logo.svg" alt="Farcaster Logo" className="-mt-[3px]" width={27} height={27} />
              </Button>
            </a>
          </div>
          <Copy
            title=""
            text={`${SITE_URL}/token/${chain}/${tokenAddress}?ref=${address}`}
            link={`${SITE_URL}/token/${chain}/${tokenAddress}?ref=${address}`}
          />
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
