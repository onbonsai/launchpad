import { brandFont } from "@src/fonts/fonts";
import { useAccount, useBalance, useWalletClient } from "wagmi";
import { useEffect, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/solid";
import clsx from "clsx";
import { useModal } from "connectkit";
import { useDisconnect } from 'wagmi'
import { erc20Abi, formatUnits, parseUnits, createWalletClient, http } from "viem";
import toast from "react-hot-toast";
import { switchChain } from "viem/actions";
import { account } from "@lens-protocol/metadata";
import { sdk } from "@farcaster/frame-sdk";
import { createAccountWithUsername, fetchAccount } from "@lens-protocol/client/actions";
import { evmAddress, never } from "@lens-protocol/client";
import { lensClient, storageClient } from "@src/services/lens/client";
import { BONSAI_NAMESPACE, getChain, LENS_BONSAI_APP, SAGE_EVM_ADDRESS } from "@src/services/madfi/utils";

import useGetProfiles from "@src/hooks/useGetProfiles";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { logout as lensLogout } from "@src/hooks/useLensLogin";
import { getProfileImage } from "@src/services/lens/utils";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { immutable } from "@lens-chain/storage-client";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { SafeImage } from "../SafeImage/SafeImage";
import { publicClient, USDC_CONTRACT_ADDRESS, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";

import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import { cacheImageToStorj } from "@src/utils/utils";

const ALLOWANCE_AMOUNTS = [5, 10, 25, 50];

const LoginWithLensModal = ({ closeModal, modal }: { closeModal: () => void, modal?: string }) => {
  const { chain, address, isConnected } = useAccount();
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
  const [isApprovingBudget, setIsApprovingBudget] = useState(false);
  const [creationStep, setCreationStep] = useState(modal || 'create'); // 'create' | 'budget'
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [editedUsername, setEditedUsername] = useState('');
  const [editedPfpUrl, setEditedPfpUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<any[]>([]);

  // Initialize edited values when context changes
  useEffect(() => {
    if (context) {
      setEditedDisplayName(context.user.displayName);
      setEditedUsername(context.user.username);
      setEditedPfpUrl(context.user.pfpUrl);
    }
  }, [context]);

  // Update editedPfpUrl when uploadedImage changes
  useEffect(() => {
    if (uploadedImage.length > 0) {
      setEditedPfpUrl(uploadedImage[0].preview);
    }
  }, [uploadedImage]);

  // USDC Balance for Base
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_CONTRACT_ADDRESS,
    chainId: getChain("base").id,
    query: {
      enabled: isConnected && isMiniApp,
    },
  });

  const formattedUsdcBalance = Number(formatUnits(usdcBalance?.value || 0n, USDC_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

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
      const lensWalletClient = createWalletClient({
        account: walletClient.account,
        chain: getChain("lens"),
        transport: http()
      });

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

      let sessionClient = authenticated.value;

      // create metadata using edited values if available
      let picture = context.user.pfpUrl;
      if (uploadedImage.length > 0) {
        picture = await cacheImageToStorj(
          uploadedImage[0],
          editedUsername || context.user.username,
          'token-images'
        );
      }
      const metadata = account({
        name: editedDisplayName || context.user.displayName,
        bio: `replika for FC user @${context.user.username}`,
        picture
      });

      // upload metadata to lens chain storage
      const { uri: metadataUri } = await storageClient.uploadAsJson(metadata, {
        acl: immutable(getChain("lens").id),
      });

      // deploy account contract
      const result = await createAccountWithUsername(sessionClient, {
        username: { localName: `${editedUsername || context.user.username}`}, // , namespace: evmAddress(BONSAI_NAMESPACE) },
        metadataUri,
        accountManager: [evmAddress(SAGE_EVM_ADDRESS)],
        enableSignless: true,
      }).andThen(handleOperationWith(lensWalletClient))
        .andThen(sessionClient.waitForTransaction)
        .andThen((txHash) => fetchAccount(sessionClient, { txHash }))
        .andThen((account) =>
          sessionClient.switchAccount({
            account: account?.address ?? never("Account not found"),
          })
        );

      if (result.isErr()) throw new Error(result.error.message);

      sessionClient = result.value;

      // create the replika in our db
      let idToken;
      const creds = await sessionClient.getCredentials();
      if (creds.isOk()) {
        idToken = creds.value?.idToken;
      } else {
        throw new Error("Failed to get credentials");
      }
      const response = await fetch('/api/bonsai/create-replika', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ source: "farcaster", fid: context.user.fid })
      });

      if (!response.ok) throw new Error('Failed to persist replika info');

      // Handle successful profile creation
      await fullRefetch();

      // Instead of closing modal, move to budget step
      setCreationStep('budget');
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error(`Failed to create profile`, { duration: 5000 });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleApproveBudget = async () => {
    if (!walletClient) return;
    const _base = getChain("base");

    if (_base.id !== chain?.id && walletClient) {
      try {
        await switchChain(walletClient, { id: _base.id });
      } catch (error) {
        console.log(error);
        toast.error("Please switch to Base to approve");
        return;
      }
    }

    setIsApprovingBudget(true);
    try {
      const client = publicClient("base");
      const hash = await walletClient.writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [SAGE_EVM_ADDRESS, parseUnits(selectedAmount.toString(), USDC_DECIMALS)],
        chain: _base
      });
      console.log(`hash: ${hash}`)
      await client.waitForTransactionReceipt({ hash });

      closeModal();

      // Prompt to add mini app
      if (!(await sdk.context).client.added) {
        try {
          await sdk.actions.addMiniApp();
        } catch (error) {
          console.log(error);
        }
      }
    } catch (error) {
      console.error("Error approving budget:", error);
      toast.error("Failed to approve allowance", { duration: 5000 });
    } finally {
      setIsApprovingBudget(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-full flex justify-center">
        <Spinner customClasses="h-6 w-6" color="#5be39d" />
      </div>
    );
  }

  // Mini App Profile Creation Flow
  if (isMiniApp && (!profiles?.length || creationStep === "budget")) {
    return (
      <div className={clsx("flex flex-col w-full mt-6 px-4", brandFont.className)}>
        {creationStep === 'create' && (
          <>
            <h2 className="text-3xl text-center font-bold">Continue with a Replika</h2>
            <p className="text-center text-gray-400 mt-2">
              A replika can socialize independently, build its own network, and create content for you.
            </p>
            <div className="max-w-full flex flex-col gap-4 pt-4">
              {context && (
                <div className="card bg-black/70 p-4 rounded-2xl max-h-fit border-dark-grey border-2 shadow-lg">
                  <div className="flex items-center gap-4">
                    {isEditing ? (
                      <div className="w-16 h-16">
                        <ImageUploader
                          files={uploadedImage}
                          setFiles={setUploadedImage}
                          maxFiles={1}
                          compact
                          defaultImage={context.user.pfpUrl}
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-800">
                        <SafeImage
                          src={editedPfpUrl}
                          alt={editedUsername}
                          className="object-cover aspect-square w-full h-full"
                          width={64}
                          height={64}
                        />
                      </div>
                    )}

                    <div className="flex flex-col text-left flex-grow">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editedDisplayName}
                            onChange={(e) => setEditedDisplayName(e.target.value)}
                            className="bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm p-1 mb-0.5 w-[180px]"
                            placeholder="Display Name"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-md opacity-80 whitespace-nowrap">@</span>
                            <input
                              type="text"
                              value={editedUsername}
                              onChange={(e) => setEditedUsername(e.target.value)}
                              className="bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm p-1 w-[160px]"
                              placeholder="username"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="font-bold text-lg truncate">
                            {editedDisplayName}
                          </h3>
                          <span className="text-md opacity-80 truncate">@{editedUsername}</span>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="p-2 bg-black rounded-lg text-secondary/70 hover:text-brand-highlight transition-colors"
                    >
                      {isEditing ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <p className="text-center text-sm text-gray-400 mt-2">
              You are the primary controller, Bonsai is a manager.
            </p>
            <div className="mt-6 w-full pb-4">
              <Button
                className="w-full px-3 py-2 text-lg"
                onClick={handleCreateProfile}
                disabled={isCreatingProfile || isEditing}
                variant="accentBrand"
              >
                {isCreatingProfile ? (
                  <div className="flex items-center justify-center gap-2">
                    <Spinner customClasses="h-4 w-4" color="#5be39d" />
                    <span>Creating your Replika...</span>
                  </div>
                ) : 'Continue'}
              </Button>
            </div>
          </>
        )}

        {creationStep === 'budget' && (
          <>
            <h2 className="text-3xl text-center font-bold">Set Allowance</h2>
            <p className="text-center text-gray-400 mt-2">
              Set an allowance (USDC) for generations
            </p>

            <div className="grid grid-cols-4 gap-2 mt-4">
              {ALLOWANCE_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={clsx(
                    "py-3 px-4 rounded-lg font-semibold transition-all",
                    "border focus:outline-none focus:ring-2 focus:ring-[#5be39d]",
                    selectedAmount === amount
                      ? "bg-[#5be39d] border-[#5be39d] text-black"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600",
                  )}
                >
                  ${amount}
                </button>
              ))}
            </div>

            <div className="py-2 px-3">
              <div className="flex justify-end space-x-2">
                <span className="text-sm text-gray-400">Balance</span>
                <span className="text-sm font-semibold">
                  {`${formattedUsdcBalance} USDC`}
                </span>
              </div>
            </div>

            <div className="mt-4 w-full pb-4">
              <Button
                className="w-full px-3 py-2 text-lg"
                onClick={handleApproveBudget}
                disabled={isApprovingBudget}
                variant="accentBrand"
              >
                {isApprovingBudget ? (
                  <div className="flex items-center justify-center gap-2">
                    <Spinner customClasses="h-4 w-4" color="#5be39d" />
                    <span>Approving...</span>
                  </div>
                ) : 'Approve'}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Regular Profile Selection Flow
  return (
    <div className={clsx("flex flex-col w-full mt-10 px-4", brandFont.className)}>
      <h2 className="text-3xl text-center font-bold">Your profiles</h2>
      <div className="max-w-full flex flex-col gap-4 pt-4">
        {!profiles || !profiles.length ? (
          <div className="w-full items-center text-center">
            <p className="mb-2">To create a token or use social features you'll need to get one.</p>
            <p className="mb-8">You can still trade without a profile.</p>
            <Button variant="accent">
              <a href="https://onboarding.lens.xyz/" target="_blank">
                <span className="text-grey">Mint a profile on Lens {"->"}</span>
              </a>
            </Button>
            <div className="flex justify-between items-end mt-4 text-sm gap-x-4 pb-6">
              <div></div>
              <span
                className="link link-hover text-brand-highlight cursor-pointer"
                onClick={async () => { closeModal(); disconnect(); }}
              >
                Switch wallets
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 pt-4 md:max-w-[800px]">
            {profiles.map(({ account }) => (
              <div className="mb-4" key={account.address}>
                <div className="card bg-black/70 p-4 md:p-4 rounded-2xl max-h-fit border-dark-grey border-2 shadow-lg">
                  <div className="grid grid-cols-5 items-center gap-x-2 md:gap-x-4">
                    <div className="col-span-1">
                      <SafeImage
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
            ))}
            <div className="flex justify-between items-end mt-4 text-sm gap-x-4 pb-6">
              <div></div>
              <span
                className="link link-hover text-brand-highlight cursor-pointer"
                onClick={async () => { closeModal(); disconnect(); }}
              >
                Switch wallets
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginWithLensModal;
