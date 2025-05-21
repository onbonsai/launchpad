import { brandFont } from "@src/fonts/fonts";
import { useAccount, useWalletClient } from "wagmi";
import { useEffect, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/solid";
import clsx from "clsx";
import { useModal, useSIWE } from "connectkit";
import { useDisconnect } from 'wagmi'
import { account } from "@lens-protocol/metadata";
import { createAccountWithUsername, fetchAccount } from "@lens-protocol/client/actions";
import { evmAddress, never } from "@lens-protocol/client";
import { lensClient, storageClient } from "@src/services/lens/client";
import { BONSAI_NAMESPACE, getChain, LENS_BONSAI_APP } from "@src/services/madfi/utils";

import useGetProfiles from "@src/hooks/useGetProfiles";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { logout as lensLogout } from "@src/hooks/useLensLogin";
import { getProfileImage } from "@src/services/lens/utils";
import Image from "next/image";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { immutable } from "@lens-chain/storage-client";
import { handleOperationWith } from "@lens-protocol/client/viem";

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

  const { isMiniApp, context } = useIsMiniApp();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  useModal({
    onDisconnect: () => {
      if (authenticatedProfileId) {
        lensLogout().then(fullRefetch);
      }
    }
  });

  useEffect(() => {
    if (selectedProfile?.address) {
      if (authenticatedProfileId) lensLogout().then(fullRefetch);
      else signInWithLens(selectedProfile);
    }
  }, [selectedProfile?.address]);

  useEffect(() => {
    if (!signingIn && authenticatedProfileId === selectedProfile?.address) {
      closeModal();
    }
  }, [signingIn, authenticatedProfileId, selectedProfile?.address]);

  const handleCreateProfile = async () => {
    if (!context || !walletClient) return;

    setIsCreatingProfile(true);
    try {
      // authenticate as onboarding user
      const authenticated = await lensClient.login({
        onboardingUser: {
          app: LENS_BONSAI_APP,
          wallet: address,
        },
        signMessage: (message) => walletClient.signMessage({ account: address, message }),
      });

      if (authenticated.isErr()) {
        return console.error(authenticated.error);
      }

      const sessionClient = authenticated.value;

      // create metadata
      const metadata = account({
        name: `${context.user.displayName}`,
        bio: `Created from Farcaster profile @${context.user.username}`,
        picture: context.user.pfpUrl,
      });

      // upload metadata to lens chain storage
      const { uri: metadataUri } = await storageClient.uploadAsJson(metadata, {
        acl: immutable(getChain("lens").id),
      });

      // deploy account contract
      const result = await createAccountWithUsername(sessionClient, {
        username: { localName: `${context.user.username}`, namespace: evmAddress(BONSAI_NAMESPACE) },
        metadataUri,
      })
        .andThen(handleOperationWith(walletClient))
        .andThen(sessionClient.waitForTransaction)
        .andThen((txHash) => fetchAccount(sessionClient, { txHash }))
        .andThen((account) =>
          sessionClient.switchAccount({
            account: account?.address ?? never("Account not found"),
          })
        );

      if (result.isErr()) {
        console.error(result.error);
        return;
      }

      // Handle successful profile creation
      await fullRefetch();
    } catch (error) {
      console.error("Error creating profile:", error);
    } finally {
      setIsCreatingProfile(false);
      closeModal();
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-full flex justify-center">
        <Spinner customClasses="h-6 w-6" color="#5be39d" />
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col w-full mt-10 px-4", brandFont.className)}>
      <h2 className="text-3xl text-center font-bold">
        {`${isMiniApp && (!profiles || !profiles.length) ? 'Create your Replika' : 'Your profiles'}`}
      </h2>
      {isMiniApp && (!profiles || !profiles.length) && (
        <>
          <p className="text-center text-gray-400 mt-2">Replikas keep track of your content and will soon have full autonomy</p>
          <p className="text-center text-gray-400 mt-2">It's free and only takes a second</p>
        </>
      )}
      <div className="max-w-full flex flex-col gap-4 pt-4">
        {!profiles || !profiles.length ? (
          isMiniApp && context ? (
            <div className="card bg-black/70 p-4 rounded-2xl max-h-fit border-dark-grey border-2 shadow-lg">
              <div className="grid grid-cols-5 items-center gap-x-2 md:gap-x-4">
                <div className="col-span-1">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-full overflow-hidden bg-neutral-800">
                    <Image
                      src={context.user.pfpUrl}
                      alt={context.user.username}
                      className="object-cover aspect-square w-full h-full"
                      width={56}
                      height={56}
                    />
                  </div>
                </div>

                <div className="flex flex-col text-left col-span-2">
                  <h3 className="font-bold text-sm md:text-base">
                    {`${context.user.displayName}`}
                  </h3>
                  <span className="text-sm opacity-80">@{`${context.user.username}`}</span>
                </div>

                <div className="flex justify-end col-span-2">
                  <Button
                    className="px-3 md:px-8 text-sm md:text-base hover:bg-bullish"
                    onClick={handleCreateProfile}
                    disabled={isCreatingProfile}
                  >
                    {isCreatingProfile ? (
                      <div className="flex items-center gap-2">
                        <Spinner customClasses="h-3 w-3 md:h-4 md:w-4" color="#5be39d" />
                      </div>
                    ) : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full items-center text-center">
              <p className="mb-2">To create a token or use social features you'll need to get one.</p>
              <p className="mb-8">You can still trade without a profile.</p>
              <Button variant="accent">
                <a href="https://onboarding.lens.xyz/" target="_blank">
                  <span className="text-grey">Mint a profile on Lens {"->"}</span>
                </a>
              </Button>
              <div className="my-4">
                <a href="https://orb.club/" target="_blank">
                  <span className="text-grey link-hover cursor-pointer">Download Orb for mobile {"->"}</span>
                </a>
              </div>
            </div>
          )
        ) : null}

        {/* PROFILE SELECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 pb-4 md:max-w-[800px]">
          {profiles && profiles.length
            ? profiles.map(({ account }) => (
              <div className="mb-4" key={account.address}>
                <div className="card bg-black/70 p-4 md:p-4 rounded-2xl max-h-fit border-dark-grey border-2 shadow-lg" key={account.address}>
                  <div className="grid grid-cols-5 items-center gap-x-2 md:gap-x-4">
                    <div className="col-span-1">
                      <Image
                        src={getProfileImage(account)}
                        alt={account.address}
                        className="rounded-full w-12 h-12 md:w-14 md:h-14"
                        width={56}
                        height={56}
                      />
                    </div>

                    <div className="flex flex-col text-left col-span-2">
                      <h3 className="font-bold text-sm md:text-base">
                        {account?.metadata?.name || account?.username?.localName || "username"}
                      </h3>
                      <span className="text-sm">{account.username?.localName || `${account.metadata?.name}`}</span>
                    </div>

                    <div className="flex justify-end col-span-2">
                      {authenticatedProfileId === account.address && (
                        <div className="flex flex-col justify-center items-center">
                          <CheckCircleIcon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                          <span className="text-xs md:text-sm">Logged in</span>
                        </div>
                      )}
                      {authenticatedProfileId !== account.address && (
                        <Button
                          className="md:px-8 px-3 text-sm md:text-base hover:bg-bullish"
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
      </div>
    </div>
  );
};

export default LoginWithLensModal;
