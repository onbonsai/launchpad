import clsx from "clsx";
import { inter } from "@src/fonts/fonts";
import { useAccount } from "wagmi";
import { Dialog } from "@headlessui/react";
import { MADFI_CLUBS_URL } from "@src/constants/constants";
import { Button } from "@src/components/Button";
import { tweetIntentTokenReferral, castIntentTokenReferral } from "@src/utils/utils";
import Copy from "@src/components/Copy/Copy";
import { BodySemiBold } from "@src/styles/text";

const ShareModal = ({ tokenAddress, chain, symbol }) => {
  const { address } = useAccount();

  const urlEncodedPostParams = () => {
    const params = {
      text: `Trade $${symbol} on @bonsai
${MADFI_CLUBS_URL}/token/${chain}/${tokenAddress}?ref=${address}`,
    };

    return new URLSearchParams(params).toString();
  }

  return (
    <div className={clsx("flex flex-col md:w-[500px] w-full")}
    style={{
      fontFamily: inter.style.fontFamily,
    }}>
      <Dialog.Title as="h2" className="text-2xl leading-7 font-bold">
        Earn Referral Rewards from your link
      </Dialog.Title>
      <div className="w-full mt-4 md:mb-8 mb-4 md:h-full">
        <div className="flex flex-col w-full my-8 space-y-4">
          <div className="flex flex-row md:flex-row flex-col items-center md:space-x-2 margin-auto space-y-2 md:space-y-0">
            <a href={`https://orb.club/create-post?${urlEncodedPostParams()}`} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="w-[150px] bg-black hover:bg-black">
                <img src="/svg/orb-logo-white.svg" alt="X Logo" className="mr-2 w-4 h-4" />
                Orb
              </Button>
            </a>
            <a href={tweetIntentTokenReferral({
              text: `Trade $${symbol} on the @onbonsai Launchpad`,
              chain,
              tokenAddress,
              referralAddress: address!
            })} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button variant="accent" className="w-[150px] flex items-center justify-center">
                <img src="/svg/X_logo_2023.svg" alt="X Logo" className="w-4 h-4" />
              </Button>
            </a>
            <a href={castIntentTokenReferral({
              text: `Trade $${symbol} on the @onbonsai Launchpad`,
              chain,
              tokenAddress,
              referralAddress: address!
            })} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="w-[150px] bg-[#472a91] hover:bg-[#472a91] text-white">
                Warpcast
              </Button>
            </a>
          </div>
          <Copy
            title=""
            text={`${MADFI_CLUBS_URL}/token/${chain}/${tokenAddress}?ref=${address}`}
            link={`${MADFI_CLUBS_URL}/token/${chain}/${tokenAddress}?ref=${address}`}
          />
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
