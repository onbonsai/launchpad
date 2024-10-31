import { useState } from "react";
import Link from "next/link";

import { ConnectButton } from "@components/ConnectButton";
import { Modal } from "@src/components/Modal";
import LoginWithLensModal from "./LoginWithLensModal";

export default function CreatorCopy() {
  const [openSignInModal, setOpenSignInModal] = useState(false);
  return (
    <div className="hidden lg:block">
      <p className="text-lg text-secondary mb-4">
        Login to create your own{" "}
        <Link href="/help" legacyBehavior>
          <span className="link link-hover">Moonshot</span>
        </Link>.
      </p>
      <div className="pt-4"><ConnectButton className="md:px-12" setOpenSignInModal={setOpenSignInModal} /></div>
      {/* Login Modal */}
      <Modal
        onClose={() => setOpenSignInModal(false)}
        open={openSignInModal}
        setOpen={setOpenSignInModal}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <LoginWithLensModal closeModal={() => setOpenSignInModal(false)} />
      </Modal>
    </div>
  );
}
