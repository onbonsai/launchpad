import { inter } from "@src/fonts/fonts";
import { useAccount, useWalletClient } from "wagmi";
import Link from "next/link";
import { useEffect } from "react";
import { ProfileFragment } from "@lens-protocol/client";
import { formatProfilePicture } from "@madfi/widgets-react";
import { Dialog } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/solid";
import { useLogout } from '@privy-io/react-auth';

import useGetProfiles from "@src/hooks/useGetProfiles";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { logout as lensLogout } from "@src/hooks/useLensLogin";
import clsx from "clsx";

const LoginWithLensModal = ({ closeModal }) => {
  const { address } = useAccount();
  const { profiles, farcasterProfiles, isLoading } = useGetProfiles(address);
  const { data: walletClient } = useWalletClient();
  const {
    signInWithLens,
    signingIn,
    authenticatedProfileId,
    setSelectedProfileId,
    selectedProfileId,
    fullRefetch,
  } = useLensSignIn(walletClient);
  const { logout } = useLogout({
    onSuccess: () => {
      if (authenticatedProfileId) {
        lensLogout();
        fullRefetch() // invalidate cached query data
      }
    },
  })

  useEffect(() => {
    if (selectedProfileId) { // triggered when we select a profile
      if (authenticatedProfileId) lensLogout(); // if switching profiles
      signInWithLens(selectedProfileId);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    if (!signingIn && authenticatedProfileId === selectedProfileId) {
      closeModal();
    }
  }, [signingIn, authenticatedProfileId, selectedProfileId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-full flex justify-center">
        <Spinner customClasses="h-6 w-6" color="#E42101" />
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col w-full mt-8", inter.className)}>
      <Dialog.Title as="h2" className="text-3xl text-center font-bold">
        Choose a Profile
      </Dialog.Title>
      <div className="max-w-full flex flex-col gap-4 pt-4">

        {/* PROFILE SELECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
          {profiles && profiles.length
            ? profiles.map((profile: ProfileFragment) => (
              <div className="" key={profile.id}>
                <div className="card bg-black/70 p-4 rounded-2xl max-h-fit border-dark-grey border-2 shadow-lg flex flex-col gap-6" key={profile.id}>
                  <div className="flex w-full items-center justify-between">
                    <img
                      src={formatProfilePicture(profile).metadata.picture.url}
                      alt={profile?.id}
                      className="rounded-sm w-20 h-20"
                    />
                    <div className="flex flex-col">
                      {authenticatedProfileId === profile.id && (
                        <div className="flex flex-col justify-center items-center">
                          <CheckCircleIcon className="h-8 w-8 text-white" />
                          <span>Logged in</span>
                        </div>
                      )}
                      {authenticatedProfileId !== profile.id && (
                        <Button
                          className="md:px-12 ml-4 hover:bg-bullish"
                          onClick={() => setSelectedProfileId(profile.id)}
                          disabled={signingIn}
                        >
                          Login
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex w-full justify-between items-center">
                    <h3 className="font-bold">
                      {profile?.metadata?.displayName || ""}
                    </h3>
                    <span className="text-sm">{profile?.handle?.suggestedFormatted?.full}</span>
                  </div>
                </div>
              </div>
            ))
            : (<div className="flex w-full items-center justify-between">No Lens profile found.{" "}
              <Link href={`lens.xyz/mint`} passHref legacyBehavior target="_blank">
                <span className="text-grey link-hover">Get one.</span>
              </Link>
            </div>)}
          <div className="flex justify-center mt-4 mb-4 text-sm gap-x-4 pb-8">
            <div className="absolute right-8 bottom-2">
              <span
                className="link link-hover mb-8"
                onClick={async () => { await logout(); closeModal(); }}
              >
                Switch wallets
              </span>
            </div>
          </div>
        </div>

        {/* PFP SELECTION */}
        {/* <h2 className="font-bold text-xl">Token-bound accounts</h2>
        <p className="font-light italic mt-2">Coming soon</p> */}
      </div>
    </div>
  );
};

export default LoginWithLensModal;
