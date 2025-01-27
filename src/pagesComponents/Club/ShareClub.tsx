import { useAccount } from "wagmi";
import { useState } from "react";

import { Modal } from "@src/components/Modal";
import { Button } from "@src/components/Button";

import ShareModal from "./ShareModal";
import { ShareIcon } from "@src/components/Share/ShareIcon";

export const ShareClub = ({ clubId, symbol }) => {
  const { isConnected } = useAccount();
  const [shareClubModal, setShareClubModal] = useState(false);

  if (!isConnected) return null;

  return (
    <>
      <Button
        variant="accent"
        size="sm"
        className="text-base font-medium text-secondary/60 px-2 bg-transparent border-none hover:bg-black hover:text-secondary/80 rounded-xl focus:outline-none"
        onClick={() => setShareClubModal(true)}
      >
        <ShareIcon color="#e2e2e2" height={14} />
        <span className="text-secondary/60 ml-2 text-sm">Share</span>
      </Button>

      {/* Share Club Modal */}
      <Modal
        onClose={() => setShareClubModal(false)}
        open={shareClubModal}
        setOpen={setShareClubModal}
        panelClassnames="bg-card-light w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <ShareModal
          clubId={clubId}
          symbol={symbol}
        />
      </Modal>
    </>
  )
};