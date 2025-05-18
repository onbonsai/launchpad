import { brandFont } from "@src/fonts/fonts";
import { useAccount, useWalletClient } from "wagmi";
import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/solid";
import clsx from "clsx";
import { useModal, useSIWE } from "connectkit";
import { useDisconnect } from 'wagmi'
import { sdk } from '@farcaster/frame-sdk'
import { account } from "@lens-protocol/metadata";
import { createAccountWithUsername } from "@lens-protocol/client/actions";
import { evmAddress, uri } from "@lens-protocol/client";
import { SessionClient } from "@lens-protocol/client";
import { lensClient, storageClient } from "@src/services/lens/client";
import { BONSAI_NAMESPACE, LENS_BONSAI_APP } from "@src/services/madfi/utils";

import useGetProfiles from "@src/hooks/useGetProfiles";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { logout as lensLogout } from "@src/hooks/useLensLogin";
import { getProfileImage } from "@src/services/lens/utils";
import Image from "next/image";

interface FarcasterContext {
  user: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    location: {
      placeId: string;
      description: string;
    };
  };
  client: {
    clientFid: number;
    added: boolean;
  };
}

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

  const [isMiniApp, setIsMiniApp] = useState(false);
  const [context, setContext] = useState<FarcasterContext | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [sessionClient, setSessionClient] = useState<SessionClient | null>(null);

  // useEffect(() => {
  //   const setupSession = async () => {
  //     if (walletClient && address) {
  //       const authenticated = await lensClient.login({
  //         accountOwner: {
  //           app: LENS_BONSAI_APP,
  //           owner: address,
  //           account: address,
  //         },
  //         signMessage: (message) => walletClient.signMessage({ account: address, message }),
  //       });
        
  //       if (authenticated.isOk()) {
  //         setSessionClient(authenticated.value);
  //       }
  //     }
  //   };

  //   setupSession();
  // }, [walletClient, address]);

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

  useEffect(() => {
    const checkMiniApp = async () => {
      const isMiniApp = await sdk.isInMiniApp();
      
      if (isMiniApp) {
        setIsMiniApp(true);
        const context = await sdk.context;
        setContext(context as FarcasterContext);
      } else {
        setIsMiniApp(false);
      }
    };

    checkMiniApp();
  }, []);

  const handleCreateProfile = async () => {
    if (!context || !walletClient || !sessionClient) return;
    
    setIsCreatingProfile(true);
    try {
      const metadata = account({
        name: `${context.user.displayName} Replika`,
        bio: `Created from Farcaster profile @${context.user.username}`,
        picture: context.user.pfpUrl,
      });

      const { uri: metadataUri } = await storageClient.uploadAsJson(metadata);

      const result = await createAccountWithUsername(sessionClient, {
        username: { localName: `${context.user.username}_replika`, namespace: evmAddress(BONSAI_NAMESPACE) },
        metadataUri,
      });

      if (result.isErr()) {
        console.error(result.error);
        return;
      }

      // Handle successful profile creation
      await fullRefetch();
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setIsCreatingProfile(false);
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
    <div className={clsx("flex flex-col w-full mt-8", brandFont.className)}>
      <h2 className="text-3xl text-center font-bold">
        {`${!profiles || !profiles.length ? 'Create your Bonsai Replika' : 'Your profiles'}`}
      </h2>
      <div className="max-w-full flex flex-col gap-4 pt-4">
        {!profiles || !profiles.length ? (
          isMiniApp && context ? (
            <div className="card bg-black/70 p-4 rounded-2xl max-h-fit border-dark-grey border-2 shadow-lg">
              <div className="grid grid-cols-5 items-center gap-x-4">
                <div className="col-span-1">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-800">
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
                  <h3 className="font-bold">
                    {`${context.user.displayName} Replika`}
                  </h3>
                  <span className="text-sm opacity-80">@{`${context.user.username}_replika`}</span>
                </div>

                <div className="flex justify-end col-span-2">
                  <Button
                    className="md:px-8 hover:bg-bullish"
                    onClick={handleCreateProfile}
                    disabled={isCreatingProfile}
                  >
                    {isCreatingProfile ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full items-center text-center">
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
            </div>
          )
        ) : null}

        {/* PROFILE SELECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 pb-4 md:max-w-[800px]">
          {profiles && profiles.length
            ? profiles.map(({ account }) => (
              <div className="" key={account.address}>
                <div className="card bg-black/70 p-4 rounded-2xl max-h-fit border-dark-grey border-2 shadow-lg" key={account.address}>
                  <div className="grid grid-cols-5 items-center gap-x-4">
                    <div className="col-span-1">
                      <Image
                        src={getProfileImage(account)}
                        alt={account.address}
                        className="rounded-full w-14 h-14"
                        width={56}
                        height={56}
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
      </div>
    </div>
  );
};

export default LoginWithLensModal;
