import { brandFont } from "@src/fonts/fonts";
import { useAccount, useWalletClient } from "wagmi";
import { useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/solid";
import clsx from "clsx";
import { useModal, useSIWE } from "connectkit";
import { useDisconnect } from 'wagmi'

import useGetProfiles from "@src/hooks/useGetProfiles";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { logout as lensLogout } from "@src/hooks/useLensLogin";
import { getProfileImage } from "@src/services/lens/utils";

const LoginWithLensModal = ({ closeModal }) => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect()
  const { profiles, isLoading } = useGetProfiles(address);
  const { data: walletClient } = useWalletClient();
  const {
    signInWithLens,
    signingIn,
    authenticatedProfileId,
    setSelectedProfile,
    selectedProfile,
    fullRefetch,
  } = useLensSignIn(walletClient);
  // const { signOut } = useSIWE({
  //   onSignOut: () => {
  //     disconnect();

  //     if (authenticatedProfileId) {
  //       lensLogout();
  //       fullRefetch() // invalidate cached query data
  //     }
  //   }
  // });
  useModal({
    onDisconnect: () => {
      if (authenticatedProfileId) {
        lensLogout().then(fullRefetch);
      }
    }
  });

  useEffect(() => {
    if (selectedProfile?.address) { // triggered when we select a profile
      if (authenticatedProfileId) lensLogout().then(fullRefetch); // if switching profiles
      else signInWithLens(selectedProfile);
    }
  }, [selectedProfile?.address]);

  useEffect(() => {
    if (!signingIn && authenticatedProfileId === selectedProfile?.address) {
      closeModal();
    }
  }, [signingIn, authenticatedProfileId, selectedProfile?.address]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-full flex justify-center">
        <Spinner customClasses="h-6 w-6" color="#5be39d" />
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col w-full mt-8", brandFont.className)}>
      <Dialog.Title as="h2" className="text-3xl text-center font-bold">
        {`${!profiles || !profiles.length ? 'No Profile found' : 'Your profiles'}`}
      </Dialog.Title>
      <div className="max-w-full flex flex-col gap-4 pt-4">
        {
          !profiles || !profiles.length ? <div className="w-full items-center text-center">
            <p className="mb-2">To create a token or use social features you'll need to get one.</p>
            <p className="mb-8">You can still trade without a profile.</p>
            <div>
              <a href="https://onboarding.lens.xyz/" target="_blank">
                <span className="text-grey link-hover cursor-pointer">Mint a profile on Lens {"->"}</span>
              </a>
            </div>
            <div className="mb-4">
              <a href="https://orb.club/" target="_blank">
                <span className="text-grey link-hover cursor-pointer">Download Orb for mobile {"->"}</span>
              </a>
            </div>
          </div> : null
        }

        {/* PROFILE SELECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 pb-4 md:max-w-[800px]">
          {profiles && profiles.length
            ? profiles.map(({ account }) => (
              <div className="" key={account.address}>
                <div className="card bg-black/70 p-4 rounded-2xl max-h-fit border-dark-grey border-2 shadow-lg" key={account.address}>
                  <div className="grid grid-cols-5 items-center gap-x-4">
                    <div className="col-span-1">
                      <img
                        src={getProfileImage(account)}
                        alt={account.address}
                        className="rounded-full w-14 h-14"
                      />
                    </div>

                    <div className="flex flex-col text-left col-span-2">
                      <h3 className="font-bold">
                        {account?.metadata?.name || account?.username?.localName || "username"}
                      </h3>
                      <span className="text-sm">{account.username?.localName || `${account.metadata?.name}`}</span>
                    </div>

                    <div className="flex justify-end col-span-2">
                      {authenticatedProfileId === account.address && (
                        <div className="flex flex-col justify-center items-center">
                          <CheckCircleIcon className="h-8 w-8 text-white" />
                          <span>Logged in</span>
                        </div>
                      )}
                      {authenticatedProfileId !== account.address && (
                        <Button
                          className="md:px-8 hover:bg-bullish"
                          onClick={() => setSelectedProfile(account)}
                          disabled={signingIn}
                        >
                          Login
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )) : null}
          <div className="flex justify-center mt-4 mb-4 text-sm gap-x-4 pb-8">
            <div className="absolute right-8 bottom-2">
              <span
                className="link link-hover mb-8 text-brand-highlight"
                onClick={async () => { closeModal(); disconnect(); }}
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
