import { useState } from "react";

import { ConnectButton } from "@components/ConnectButton";
import { Modal } from "@src/components/Modal";
import LoginWithLensModal from "./LoginWithLensModal";
import { Header2, Subtitle } from "@src/styles/text";
import { usePrivy } from "@privy-io/react-auth";

interface CreatorCopyProps {
  isConnected: boolean;
  isAuthenticatedProfile: boolean;
}

export default function CreatorCopy(props: CreatorCopyProps) {
  const { isConnected, isAuthenticatedProfile } = props;
  const { authenticated: connected } = usePrivy();
  const [openSignInModal, setOpenSignInModal] = useState(false);

  return (
    <div className="hidden lg:flex flex-col gap-[2px] bg-card py-3 px-4 rounded-xl mb-2">
      <Header2 className="text-white mb-2">Log in</Header2>
      {!isAuthenticatedProfile &&
        ((!isConnected || !connected) ? (
          <Subtitle className="">Log in to trade or create your own token</Subtitle>
        ) : (
          <Subtitle className="">Log in with Lens to access social features</Subtitle>
        ))}
      <div className="pt-[30px]">
        <ConnectButton setOpenSignInModal={setOpenSignInModal} />
      </div>
      {/* Login Modal */}
      <Modal
        onClose={() => setOpenSignInModal(false)}
        open={openSignInModal}
        setOpen={setOpenSignInModal}
        panelClassnames="bg-card w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <LoginWithLensModal closeModal={() => setOpenSignInModal(false)} />
      </Modal>
    </div>
  );
}
