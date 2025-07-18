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
import { createAccountWithUsername, fetchAccount, canCreateUsername } from "@lens-protocol/client/actions";
import { evmAddress, never } from "@lens-protocol/client";
import { lensClient, storageClient } from "@src/services/lens/client";
import { BONSAI_NAMESPACE, getChain, LENS_BONSAI_APP, SAGE_EVM_ADDRESS, IS_PRODUCTION } from "@src/services/madfi/utils";

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
import { publicClient, USDC_CONTRACT_ADDRESS, USDC_DECIMALS, queryAvailableHandles } from "@src/services/madfi/moneyClubs";

import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import { cacheImageToStorj } from "@src/utils/utils";
import useWebNotifications from "@src/hooks/useWebNotifications";
import { usePWA } from "@src/hooks/usePWA";

const ALLOWANCE_AMOUNTS = [5, 10, 25, 50];

const LoginWithLensModal = ({ closeModal, modal, withBudget }: { closeModal: () => void, modal?: string, withBudget?: boolean }) => {
  const { chain, address, isConnected } = useAccount();
  const { disconnect } = useDisconnect()
  const { profiles, isLoading } = useGetProfiles(address);
  const { data: walletClient } = useWalletClient();
  const {
    signInWithLens,
    signingIn,
    isAuthenticated,
    authenticatedProfileId,
    setSelectedProfile,
    selectedProfile,
    fullRefetch,
  } = useLensSignIn(walletClient);

  const { isMiniApp, context } = useIsMiniApp();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isApprovingBudget, setIsApprovingBudget] = useState(false);
  const [creationStep, setCreationStep] = useState(() => {
    // Initialize with budget step if withBudget is true for miniapp users
    if (isMiniApp && withBudget) {
      return 'budget';
    }
    return 'create';
  }); // 'create' | 'budget' | 'notifications'
  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDisplayName, setEditedDisplayName] = useState('');
  const [editedUsername, setEditedUsername] = useState('');
  const [editedPfpUrl, setEditedPfpUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<any[]>([]);
  const [hasPreventedBudgetClose, setHasPreventedBudgetClose] = useState(false);

  // Profile creation flow state
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [createStep, setCreateStep] = useState(1); // 1: handle search, 2: name, 3: finalize
  const [searchHandle, setSearchHandle] = useState('');
  const [selectedHandle, setSelectedHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profilePicture, setProfilePicture] = useState<any[]>([]);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleError, setHandleError] = useState<string>('');
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);

  // Initialize notifications hook
  const { subscribeToPush } = useWebNotifications(address, profiles?.[0]?.account?.address);
  const { isStandalone } = usePWA();

  useEffect(() => {
    if (modal) {
      if (modal === "budget" && !isAuthenticated) {
        // For miniapp users with budget, skip to budget step directly
        if (isMiniApp && withBudget) {
          setCreationStep("budget");
        } else {
          setCreationStep("create");
        }
      } else {
        setCreationStep(modal);
      }
    }
  }, [modal, isAuthenticated, isMiniApp, withBudget]);

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
      // If modal is "budget", transition to budget step instead of closing
      if (modal === "budget") {
        setCreationStep("budget");
      } else {
        handleCloseModal();
      }
    }
  }, [signingIn, authenticatedProfileId, selectedProfile?.address, modal]);

  const checkHandleAvailability = async (handle: string) => {
    if (!handle || handle.length < 3) {
      setHandleError('Handle must be at least 3 characters');
      setHandleAvailable(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
      setHandleError('Handle can only contain letters, numbers, and underscores');
      setHandleAvailable(false);
      return;
    }

    setIsCheckingHandle(true);
    setHandleError('');

    try {
      const result = await queryAvailableHandles(handle);
      const isAvailable = typeof result === 'boolean' ? result : result.available;

      if (isAvailable) {
        setHandleAvailable(true);
        setHandleError('');
      } else {
        setHandleAvailable(false);
        setHandleError('This handle is already taken');
      }
    } catch (error) {
      console.error('Error checking handle:', error);
      setHandleError('Failed to check handle availability');
      setHandleAvailable(false);
    } finally {
      setIsCheckingHandle(false);
    }
  };

  // Debounced handle checking
  useEffect(() => {
    if (!searchHandle) {
      setHandleAvailable(null);
      setHandleError('');
      return;
    }

    const timeoutId = setTimeout(() => {
      checkHandleAvailability(searchHandle);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchHandle, address, walletClient]);

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

      if (withBudget) {
        setCreationStep("budget");
      } else {
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('username already taken') ||
          errorMessage.toLowerCase().includes('already taken')) {
        toast.error(`Username already taken. Please try a different username.`, { duration: 5000 });
      } else {
        toast.error(`Failed to create profile: ${errorMessage}`, { duration: 5000 });
      }
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleCreateNewProfile = async () => {
    if (!walletClient || !selectedHandle || !displayName) return;

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
        throw new Error(authenticated.error.message);
      }

      let sessionClient = authenticated.value;

      // create metadata
      let picture = "https://picsum.photos/400/400"; // default profile picture
      if (profilePicture.length > 0) {
        picture = await cacheImageToStorj(
          profilePicture[0],
          selectedHandle,
          'profile-images'
        );
      }

      const metadata = account({
        name: displayName,
        bio: `Welcome to my Lens profile!`,
        picture
      });

      // upload metadata to lens chain storage
      const { uri: metadataUri } = await storageClient.uploadAsJson(metadata, {
        acl: immutable(getChain("lens").id),
      });

      // deploy account contract
      const result = await createAccountWithUsername(sessionClient, {
        username: { localName: selectedHandle },
        metadataUri,
      }).andThen(handleOperationWith(lensWalletClient))
        .andThen(sessionClient.waitForTransaction)
        .andThen((txHash) => fetchAccount(sessionClient, { txHash }))
        .andThen((account) =>
          sessionClient.switchAccount({
            account: account?.address ?? never("Account not found"),
          })
        );

      if (result.isErr()) throw new Error(result.error.message);

      // Handle successful profile creation
      await fullRefetch();
      setShowCreateFlow(false);
      setCreateStep(1);
      // Reset form
      setSearchHandle('');
      setSelectedHandle('');
      setDisplayName('');
      setProfilePicture([]);

      if (isStandalone) {
        setCreationStep("notifications");
      } else {
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('username already taken') ||
          errorMessage.toLowerCase().includes('already taken')) {
        toast.error(`Username already taken. Please try a different username.`, { duration: 5000 });
      } else {
        toast.error(`Failed to create profile: ${errorMessage}`, { duration: 5000 });
      }
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

      handleCloseModal();

      // Prompt to add mini app
      if (!(await sdk.context).client.added) {
        try {
          await sdk.actions.addMiniApp();
        } catch (error) {
          console.log(error);
        }
      }

      closeModal(); // Close the modal normally
    } catch (error) {
      console.error("Error approving budget:", error);
      toast.error("Failed to approve allowance", { duration: 5000 });
    } finally {
      setIsApprovingBudget(false);
    }
  };

  const handleEnableNotifications = async () => {
    setIsEnablingNotifications(true);
    try {
      const success = await subscribeToPush();
      if (success) {
        toast.success("Notifications enabled! Welcome to Bonsai! 🌱", {
          duration: 4000,
          position: 'top-center',
        });
        handleCloseModal();
      } else {
        toast.error("Failed to enable notifications. You can enable them later in settings.", {
          duration: 4000,
        });
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast.error("Failed to enable notifications. You can enable them later in settings.", {
        duration: 4000,
      });
      handleCloseModal();
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  // Wrapper function to prevent closing modal when modal === "budget" (but only once)
  const handleCloseModal = () => {
    if (modal === "budget" && !hasPreventedBudgetClose) {
      setHasPreventedBudgetClose(true);
      return; // Don't close the modal
    }
    closeModal(); // Close the modal normally
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
                          src={editedPfpUrl || context.user.pfpUrl}
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
      {creationStep === 'notifications' && isStandalone ? (
        <>
          <h2 className="text-3xl text-center font-bold">Enable Notifications</h2>
          <p className="text-center text-gray-400 mt-2">
            Complete your onboarding and receive your welcome gift!
          </p>

          <div className="flex flex-col items-center mt-6 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#5be39d] to-[#4ade80] rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">🎉 Welcome Gift Awaiting!</h3>
              <p className="text-gray-300 text-sm mb-4">
                Enable notifications to receive updates about your content and claim your <span className="text-[#5be39d] font-semibold">1000 BONSAI tokens</span> welcome bonus!
              </p>

              <div className="bg-black/50 rounded-lg p-4 text-left">
                <h4 className="font-semibold mb-2">You'll be notified about:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Content generation completions</li>
                  <li>• New interactions on your posts</li>
                  <li>• Token rewards and achievements</li>
                  <li>• Platform updates and features</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-6 w-full pb-4">
            <Button
              className="w-full px-3 py-2 text-lg"
              onClick={handleEnableNotifications}
              disabled={isEnablingNotifications}
              variant="accentBrand"
            >
              {isEnablingNotifications ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner customClasses="h-4 w-4" color="#5be39d" />
                  <span>Enabling notifications...</span>
                </div>
              ) : (
                '🎁 Enable Notifications & Claim Gift'
              )}
            </Button>

            <Button
              className="w-full px-3 py-2 text-sm"
              onClick={handleCloseModal}
              variant="secondary"
            >
              Skip for now
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-3xl text-center font-bold">{showCreateFlow ? 'Create Profile' : 'Your profiles'}</h2>
          <div className="max-w-full flex flex-col gap-4 pt-4">
            {!profiles || !profiles.length ? (
              !showCreateFlow ? (
                <div className="w-full items-center text-center">
                  <p className="mb-2">To use social features or create a token you'll need to get one.</p>
                  <p className="mb-8">You can still trade without a profile.</p>
                  <Button
                    variant="accent"
                    onClick={() => setShowCreateFlow(true)}
                    className="w-full mb-4"
                  >
                    Create Profile
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
                <div className="w-full">
                  {/* Progress Indicator */}
                  <div className="flex flex-col items-center justify-center mb-6">
                    <div className="relative w-full max-w-xs flex items-center justify-center" style={{height: 40}}>
                      {/* Connecting line */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-600 z-0" style={{transform: 'translateY(-50%)'}} />
                      {/* Steps */}
                      {[1, 2, 3].map((step, idx) => (
                        <div key={step} className="relative z-10 flex items-center" style={{width: idx < 2 ? '50%' : 'auto'}}>
                          <div className={clsx(
                            "w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold border-2 transition-all",
                            createStep === step
                              ? "bg-[#5be39d] text-black border-[#5be39d]"
                              : createStep > step
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-gray-600 text-gray-300 border-gray-600"
                          )}>
                            {createStep > step ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              step
                            )}
                          </div>
                          {/* No extra line after last step */}
                          {idx < 2 && <div className="flex-1" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 1: Handle Search */}
                  {createStep === 1 && (
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-2">Choose your handle</h3>
                      <p className="text-gray-400 mb-6">Select a unique username for your profile</p>

                      <div className="relative mb-4">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-400 text-lg">@</span>
                        </div>
                        <input
                          type="text"
                          value={searchHandle}
                          onChange={(e) => setSearchHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="yourhandle"
                          className="block w-full pl-8 pr-10 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5be39d] focus:border-transparent"
                          maxLength={31}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          {isCheckingHandle && (
                            <Spinner customClasses="h-5 w-5" color="#5be39d" />
                          )}
                          {!isCheckingHandle && handleAvailable === true && (
                            <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {!isCheckingHandle && handleAvailable === false && (
                            <svg className="h-5 w-5 text-bearish" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {handleError && (
                        <p className="text-bearish text-sm mb-4">{handleError}</p>
                      )}

                      {handleAvailable === true && (
                        <p className="text-green-400 text-sm mb-4">✓ @{searchHandle} is available!</p>
                      )}

                      <Button
                        onClick={() => {
                          setSelectedHandle(searchHandle);
                          setCreateStep(2);
                        }}
                        disabled={!handleAvailable || isCheckingHandle}
                        className="w-full"
                        variant="accentBrand"
                      >
                        Next
                      </Button>
                    </div>
                  )}

                  {/* Step 2: Display Name */}
                  {createStep === 2 && (
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-2">What's your name?</h3>
                      <p className="text-gray-400 mb-6">This is how others will see you on Lens</p>

                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="block w-full py-3 px-4 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5be39d] focus:border-transparent mb-6"
                        maxLength={50}
                      />

                      <div className="flex gap-3">
                        <Button
                          onClick={() => setCreateStep(1)}
                          variant="secondary"
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={() => setCreateStep(3)}
                          disabled={!displayName.trim()}
                          className="flex-1"
                          variant="accentBrand"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Finalize */}
                  {createStep === 3 && (
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-2">Complete your profile</h3>
                      <p className="text-gray-400 mb-6">Review your profile and add a picture (optional)</p>

                      <div className="rounded-lg p-6 mb-6">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 flex-shrink-0">
                            <ImageUploader
                              files={profilePicture}
                              setFiles={setProfilePicture}
                              maxFiles={1}
                              compact
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-bold text-lg truncate">{displayName}</h4>
                            <p className="text-gray-400">@{selectedHandle}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => setCreateStep(2)}
                          variant="secondary"
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleCreateNewProfile}
                          disabled={isCreatingProfile}
                          className="flex-1"
                          variant="accentBrand"
                        >
                          {isCreatingProfile ? (
                            <div className="flex items-center justify-center gap-2">
                              <Spinner customClasses="h-4 w-4" color="currentColor" />
                              <span>Creating...</span>
                            </div>
                          ) : (
                            'Create Profile'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Back to login option */}
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => {
                        setShowCreateFlow(false);
                        setCreateStep(1);
                        setSearchHandle('');
                        setSelectedHandle('');
                        setDisplayName('');
                        setProfilePicture([]);
                      }}
                      className="text-gray-400 hover:text-white text-sm underline"
                    >
                      ← Back to login options
                    </button>
                  </div>
                </div>
              )
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
              </div>
            )}

            {profiles && profiles.length > 0 && (
              <div className="flex justify-between items-end mt-4 text-sm gap-x-4 pb-6">
                <div></div>
                <span
                  className="link link-hover text-brand-highlight cursor-pointer"
                  onClick={async () => { closeModal(); disconnect(); }}
                >
                  Switch wallets
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default LoginWithLensModal;
