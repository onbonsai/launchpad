import { Dialog } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAccount, useWalletClient } from "wagmi";

import { Button } from "@src/components/Button";
import { createPostMomoka } from "@src/services/lens/createPost";
import { pinJson, storjGatewayURL } from "@src/utils/storj";
import publicationBody from "@src/services/lens/publicationBody";
import { useLensLogin, getAccessToken } from "@src/hooks/useLensLogin";
import { useLensProfile } from "@src/hooks/useLensProfile";

const ShareModal = ({ startingText, authenticatedProfile }) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: defaultProfile } = useLensProfile(address);
  const { refetch: login } = useLensLogin();

  const [text, setText] = useState(startingText);

  const shareToLens = async () => {
    let toastId;
    try {
      let accessToken = await getAccessToken();
      if (!accessToken) {
        toastId = toast.loading("Logging in with Lens...");
        const success = await login();
        if (!success) throw new Error("Unable to login");
        accessToken = await getAccessToken();
      }
      if (!text) throw new Error("Invalid share text");
      if (!defaultProfile) throw new Error("Invalid profile");
      const content = publicationBody(
        text,
        [],
        authenticatedProfile?.metadata?.displayName || authenticatedProfile?.handle?.localName,
      );
      const { data: IpfsHash } = await pinJson(content);
      const res = await createPostMomoka(walletClient, storjGatewayURL(`ipfs://${IpfsHash}`), authenticatedProfile);
      if (!res.txHash) throw new Error(res.reason ?? "Invalid tx hash");
    } catch (e: any) {
      console.error(e);
      toast.error(`Error: something went wrong`, { id: toastId });
    }
  };

  const shareToX = async () => {
    const ctaLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(ctaLink, "_blank");
  };

  return (
    <div className="flex flex-col w-full mt-8">
      <Dialog.Title as="h2" className="text-6xl uppercase text-center font-owners font-bold">
        Share
      </Dialog.Title>
      <div className="w-full mt-4 md:mb-8 mb-4 md:h-full">
        <div className="flex flex-col w-full my-8 space-y-4">
          <p className="text-md text-center text-secondary w-3/4 mx-auto mt-2">
            Share this points drop with your community so they know its time to claim their points!
          </p>
          <label htmlFor="title" className="block text-sm font-medium text-secondary">
            Post Text
          </label>
          <textarea
            value={text}
            rows={7}
            onChange={(e) => setText(e.target.value)}
            className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
            placeholder="Enter a your post text here."
          />
          <Button disabled={!text} onClick={shareToX} size="md" variant="primary">
            Share to X
          </Button>
          <Button disabled={!text} onClick={shareToLens} size="md" variant="accent" className="">
            Share to Lens
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
