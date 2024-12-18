import { useState } from "react";
import Link from "next/link";

import { ConnectButton } from "@components/ConnectButton";
import { Modal } from "@src/components/Modal";
import LoginWithLensModal from "./LoginWithLensModal";
import { Header2, Subtitle } from "@src/styles/text";

export default function CreatorCopy() {
  const [openSignInModal, setOpenSignInModal] = useState(false);
  return (
    <div className="hidden lg:flex flex-col gap-[2px] bg-card py-3 px-4 rounded-xl">
      <Header2 className="text-white">
        Log in
      </Header2>
      <Subtitle className="">
        Log in to trade or create your own token
      </Subtitle>
      <div className="pt-[30px]"><ConnectButton setOpenSignInModal={setOpenSignInModal} /></div>
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
