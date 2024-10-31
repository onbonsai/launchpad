import { useAccount } from "wagmi";
import { useState } from "react";

import { Modal } from "@src/components/Modal";

import ShareModal from "./ShareModal";
import { ShareIcon } from "@src/components/Share/ShareIcon";
import { Subtitle } from "@src/styles/text";
import { WebShareManager } from "@src/utils/webShare";
import { SITE_URL } from "@src/constants/constants";
import { usePWA } from "@src/hooks/usePWA";

export const ShareClub = ({ chain, tokenAddress, symbol }) => {
  const { isConnected, address } = useAccount();
  const { isStandalone } = usePWA();
  const [shareClubModal, setShareClubModal] = useState(false);

  const handleShareClick = async () => {
    if (isStandalone) {
      // In PWA mode, directly trigger web share with custom URL
      const baseUrl = `${SITE_URL}/token/${chain}/${tokenAddress}`;
      const shareUrl = isConnected ? `${baseUrl}?ref=${address}` : baseUrl;

      await WebShareManager.shareCustom({
        title: `$${symbol} Token`,
        text: `Trade $${symbol} on the @onbonsai Launchpad`,
        url: shareUrl,
      });
    } else {
      // In browser mode, show the modal
      setShareClubModal(true);
    }
  };

  return (
    <>
      <button style={{ cursor: "pointer" }} onClick={handleShareClick} className="flex flex-row items-center space-x-2">
        <ShareIcon color="#e2e2e2" height={14} />
        <Subtitle className="text-white">Share</Subtitle>
      </button>

      {/* Share Club Modal - only shown in browser mode */}
      {!isStandalone && (
        <Modal
          onClose={() => setShareClubModal(false)}
          open={shareClubModal}
          setOpen={setShareClubModal}
          panelClassnames="w-screen max-h-[100dvh] md-plus:h-full p-4 text-secondary md:min-w-[532px]"
        >
          <ShareModal chain={chain} tokenAddress={tokenAddress} symbol={symbol} />
        </Modal>
      )}
    </>
  );
};
