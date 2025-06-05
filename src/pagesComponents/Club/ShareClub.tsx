import { useAccount } from "wagmi";
import { useState } from "react";

import { Modal } from "@src/components/Modal";
import { Button } from "@src/components/Button";

import ShareModal from "./ShareModal";
import { ShareIcon } from "@src/components/Share/ShareIcon";
import { Subtitle } from "@src/styles/text";

export const ShareClub = ({ chain, tokenAddress, symbol }) => {
  const { isConnected } = useAccount();
  const [shareClubModal, setShareClubModal] = useState(false);

  if (!isConnected) return null;

  return (
    <>
      <button
        style={{ cursor: 'pointer' }}
        onClick={() => setShareClubModal(true)}
        className="flex flex-row items-center space-x-2"
      >
        <ShareIcon color="#e2e2e2" height={14} />
        <Subtitle className='text-white'>Share</Subtitle>
      </button>

      {/* Share Club Modal */}
      <Modal
        onClose={() => setShareClubModal(false)}
        open={shareClubModal}
        setOpen={setShareClubModal}
        panelClassnames="w-screen max-h-[100dvh] md-plus:h-full p-4 text-secondary md:min-w-[532px]"
      >
        <ShareModal
          chain={chain}
          tokenAddress={tokenAddress}
          symbol={symbol}
        />
      </Modal>
    </>
  )
};