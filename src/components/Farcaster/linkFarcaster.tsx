import { Dialog } from "@headlessui/react";
import { usePrivy } from "@privy-io/react-auth";

import { Button } from "@src/components/Button";

const LinkFarcaster = ({ text }) => {
  const {
    linkFarcaster,
    user: { farcaster },
  } = usePrivy();

  return (
    <div className="flex flex-col w-full mt-8">
      <Dialog.Title as="h2" className="text-6xl uppercase text-center font-owners font-bold">
        Link Farcaster
      </Dialog.Title>
      <div className="text-center my-8 space-y-8">
        <p className="text-md text-secondary w-3/4 mx-auto mt-2">{farcaster ? "Your account is linked, you can close this modal now" : text}</p>
        <Button disabled={!!farcaster} onClick={linkFarcaster} size="md" variant="accent">
          {farcaster ? "Linked" : "Link Farcaster"}
        </Button>
      </div>
    </div>
  );
};

export default LinkFarcaster;
