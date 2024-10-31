import { FormEvent, useState, useMemo } from "react";
import { useAccount, useWalletClient, useSwitchChain, useChainId } from "wagmi";
import toast from "react-hot-toast";
import { DocumentDuplicateIcon, CheckCircleIcon } from "@heroicons/react/solid";
import { formatProfilePicture } from "@madfi/widgets-react";
import { TipAction } from "@madfi/lens-oa-client";
import { formatEther, parseEther } from "viem";

import useENS from "@src/hooks/useENS";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useMultiStepForm from "@src/hooks/useMultiStepForm";
import { ipfsOrNotWithDefaultGateway } from "@src/utils/pinata";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import publicationBody from "@src/services/lens/publicationBody";
import { pinJson, storjGatewayURL } from "@src/utils/storj";
import { createPostMomoka, createPostOnchain } from "@src/services/lens/createPost";
import readLensHub from "@src/services/lens/readLensHub";
import { bToHexString } from "@src/services/lens/utils";
import { chainIdNumber } from "@src/constants/validChainId";
import { encodeAbi } from "@src/utils/viem";
import { BLACKJACK_ACTION_MODULE, BONSAI_TOKEN_ADDRESS } from "@src/services/madfi/utils";
import { approveToken } from "@src/services/madfi/bountyContract";

import SetSchedule from "./SetSchedule";
// import SelectSpaceType from "./SelectSpaceType";
import SetPinnedLensPost from "./SetPinnedLensPost";

type MultiFormData = {
  spaceType: string;
  pinnedLensPost: string;
  launchDate: Date | undefined;
  enableTips: boolean;
  enableRecording: boolean;
  enableCashtagFrame: boolean;
  enableBlackjack: boolean;
  blackjackTableAmount?: string;
  blackjackTableSize?: string;
  // for gating the space to a collect
  // collectCurrency: any;
  // collectFee: string;
};

const INITIAL_DATA: MultiFormData = {
  spaceType: "video",
  pinnedLensPost: "",
  launchDate: undefined,
  enableTips: true,
  enableRecording: false,
  enableCashtagFrame: false,
  enableBlackjack: false,
  blackjackTableAmount: undefined,
  blackjackTableSize: undefined,
  // for gating the space to a collect
  // collectCurrency: { symbol: "", address: "" },
  // collectFee: "1",
};

const CreateSpace = ({ livestreamConfig, setLivestreamConfig, closeModal, profile, moneyClubId }) => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();

  const [roomName, setRoomName] = useState("");
  const [drop, setDrop] = useState<any>();
  const [launchDate, setLaunchDate] = useState<number | undefined>();
  const [uploading, setUploading] = useState<boolean>();
  const [isCopied, setIsCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>();
  const [postUrl, setPostUrl] = useState<string>();
  const [gatedBy, setGatedBy] = useState();
  const [gatedCondition, setGatedCondition] = useState();
  const [invitedHandles, setInvitedHandles] = useState<string[]>([]);

  const { ensName } = useENS(address);

  const [formMultiFormData, setMultiFormData] = useState(INITIAL_DATA);

  const updateFields = (fields: Partial<MultiFormData>) => {
    setMultiFormData((prev) => {
      return { ...prev, ...fields };
    });
  };

  const { step, currenStepIndex, back, next, isFirstStep, isLastStep } = useMultiStepForm([
    // <SelectSpaceType
    //   spaceType={formMultiFormData.spaceType}
    //   setSpaceType={(value: string) => updateFields({ spaceType: value })}
    //   collectionId={collectionId}
    //   gatedBy={gatedBy}
    //   setGatedBy={setGatedBy}
    //   key="a"
    // />,
    <SetPinnedLensPost
      key="b"
      {...formMultiFormData}
      updateFields={updateFields}
      roomName={roomName}
      setRoomName={setRoomName}
      setInvitedHandles={setInvitedHandles}
      invitedHandles={invitedHandles}
      moneyClubId={moneyClubId}
      profileHandle={profile?.handle?.localName}
    />,
    // <SetSchedule
    //   key="c"
    //   setLaunchDate={setLaunchDate}
    //   {...formMultiFormData}
    //   updateFields={updateFields}
    // />,
  ]);

  const canSkip = useMemo(() => {
    return false;
    // if (currenStepIndex === 0) return false;
    // if (currenStepIndex === 1) return formMultiFormData.pinnedLensPost || roomName ? false : true;
  }, [currenStepIndex, formMultiFormData.pinnedLensPost, roomName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLastStep) return next();

    createSpace();
  };

  const createSpace = async (switched = false) => {
    setUploading(true);

    try {
      const { pinnedLensPost, spaceType, enableTips, enableRecording, enableBlackjack } = formMultiFormData;

      const handle = authenticatedProfile?.handle?.localName || ensName || address;
      const gated = gatedBy?.value || undefined;

      const toastId = toast.loading("Creating your stream...");

      let tipPubId;
      if (enableTips || enableBlackjack) {
        const { pubCount } = await readLensHub({ functionName: "getProfile", args: [authenticatedProfile?.id] }) as unknown as any;
        tipPubId = `${authenticatedProfile?.id}-${bToHexString(pubCount + 1n)}`;
      }

      const response = await fetch(`/api/spaces/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: address,
          creatorLensHandle: authenticatedProfile?.handle?.localName,
          creatorAvatar: formatProfilePicture(authenticatedProfile!).metadata.picture.url,
          creatorBanner: authenticatedProfile?.metadata?.coverPicture?.optimized?.uri || ipfsOrNotWithDefaultGateway(authenticatedProfile?.metadata?.coverPicture?.raw?.uri),
          handle,
          creatorLensProfileId: authenticatedProfile?.id,
          drop,
          startAt: launchDate,
          pinnedLensPost,
          gated,
          spaceType,
          roomName,
          enableRecording,
          tipPubId,
          invitedHandles: invitedHandles.length ? invitedHandles.join(",") : undefined,
        })
      });

      if (!response.ok) {
        toast.error("Could not create space");
        setUploading(false);
        return;
      }

      const data = await response.json();
      const { url, endAt, playbackURL } = data;

      let actionModuleWithInitData;
      if (enableTips) {
        const actionHandler = new TipAction(LENS_ENVIRONMENT);
        await actionHandler.fetchActionModuleData({ authenticatedProfileId: "", connectedWalletAddress: "" });
        actionModuleWithInitData = {
          actionModule: actionHandler.address,
          actionModuleInitData: actionHandler.encodeModuleInitData({ receiver: authenticatedProfile!.ownedBy.address })
        };
      } else if (enableBlackjack) {
        actionModuleWithInitData = {
          actionModule: BLACKJACK_ACTION_MODULE,
          actionModuleInitData: encodeAbi(
            ["uint256,uint256"],
            [parseEther(formMultiFormData.blackjackTableAmount!), parseEther(formMultiFormData.blackjackTableSize!)],
          )
        };
      }

      setLivestreamConfig({
        title: roomName,
        playbackUrl: playbackURL,
        startsAt: launchDate ? new Date(launchDate * 1000).toISOString() : undefined,
        endsAt: endAt ? new Date(endAt * 1000).toISOString() : undefined,
        actionModuleWithInitData,
      });

      toast.success("Created your stream!", { duration: 5000, id: toastId });

      try {
        await handleCreatePost(undefined, {
          title: roomName,
          playbackUrl: playbackURL,
          startsAt: launchDate ? new Date(launchDate * 1000).toISOString() : undefined,
          endsAt: endAt ? new Date(endAt * 1000).toISOString() : undefined,
          actionModuleWithInitData,
          tipPubId,
          shareUrl: url,
        });
      } catch (error) {
        console.log(error);
      }

      setUploading(false);
      setShareUrl(url);
    } catch (error) {
      console.log(error);
      setUploading(false);
      toast.error("An error has ocurred");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl!);
    setIsCopied(true);
    toast.success('Copied to clipboard');
  };

  const handleCreatePost = async (e?, __livestreamConfig?: any) => {
    e?.preventDefault();

    let toastId;
    if (chainIdNumber !== chainId && switchChain) {
      toastId = toast.loading("Switching networks...");
      try {
        await switchChain({ chainId: chainIdNumber });
      } catch {
        toast.error("Please switch networks to create your bounty");
      }
      toast.dismiss(toastId);
      // return;
    }

    if (formMultiFormData.enableBlackjack) {
      await approveToken(
        BONSAI_TOKEN_ADDRESS,
        parseEther(formMultiFormData.blackjackTableAmount!),
        walletClient,
        BLACKJACK_ACTION_MODULE
      );
    }

    setUploading(true);
    toastId = toast.loading("Preparing post...");

    // in case we're coming from a calling function
    const _livestreamConfig = livestreamConfig || __livestreamConfig;
    const _shareUrl = shareUrl || __livestreamConfig?.shareUrl;

    let content;
    if (formMultiFormData.enableCashtagFrame) {
      content = `📺 ${roomName}

$${profile.handle.localName}: https://frames.bonsai.meme/cashtags/club?moneyClubAddress=${moneyClubId}&moneyClubProfileId=${profile.id}

Tune in 👉 ${_shareUrl}`;
    } else if (formMultiFormData.enableBlackjack) {
      content = `📺 ${roomName}

🦋 Play on @lens/buttrfly to earn 3x Buttrfly Points this week 🦋

https://frames.bonsai.meme/blackjack/start`;
    } else {
      content = `📺 ${roomName}
Tune in 👉 ${_shareUrl}`;
    }

    const publicationMetadata = publicationBody(
      content,
      [],
      profile.metadata?.displayName || profile.handle!.suggestedFormatted.localName,
      _livestreamConfig
    );
    const { data: postIpfsHash } = await pinJson(publicationMetadata);

    let broadcastResult;
    if (_livestreamConfig.actionModuleWithInitData) {
      // create a post onchain with our module
      broadcastResult = await createPostOnchain(
        walletClient,
        storjGatewayURL(`ipfs://${postIpfsHash}`),
        authenticatedProfile,
        [_livestreamConfig.actionModuleWithInitData.actionModule],
        [_livestreamConfig.actionModuleWithInitData.actionModuleInitData],
      );
    } else {
      // creating a post on momoka
      broadcastResult = await createPostMomoka(
        walletClient,
        storjGatewayURL(`ipfs://${postIpfsHash}`),
        authenticatedProfile,
      );
    }

    if (broadcastResult) {
      toast.success("Post created!", { id: toastId, duration: 5000 });
    } else {
      toast.error("Error creating post", { id: toastId, duration: 5000 });
    }

    if (__livestreamConfig?.tipPubId) {
      setPostUrl(`https://hey.xyz/posts/${__livestreamConfig?.tipPubId}`);
    }

    setUploading(false);
  };

  return (
    <form className="step-form">
      {!shareUrl && step}
      {!shareUrl && (
        <div className="flex gap-x-4 justify-end fixed bottom-4 md:right-24 right-12">
          {/* <button
            disabled={isFirstStep || uploading}
            type="button"
            className="btn disabled:cursor-not-allowed disabled:opacity-50"
            onClick={back}
          >
            Back
          </button> */}

          <button
            type="submit"
            className="btn disabled:cursor-not-allowed disabled:opacity-50"
            disabled={uploading || !roomName}
            onClick={handleSubmit}
          >
            {isLastStep ? `${uploading ? "Creating..." : "Go Live"}` : (canSkip ? 'Skip' : 'Next')}
          </button>
        </div>
      )}
      {shareUrl && (
        <div className="w-full flex flex-col gap-2">
          <h2 className="mt-4 text-md font-bold tracking-tight sm:text-xl md:text-2xl">Your livestream is {launchDate ? "scheduled" : "live"}! Here is your link</h2>
          <div className="relative block w-full">
            <div className="items-center justify-center">
              <p className="flex mt-3 text-center">
                <a href={shareUrl} target="_blank" rel="noreferrer" className="underline mr-2">
                  {shareUrl}
                </a>
                <span className={`copy-btn w-7 p-1 ${!isCopied ? 'cursor-pointer' : ''}`} onClick={handleCopy}>
                  {isCopied ? <CheckCircleIcon className="h-5 w-5 text-white" /> : <DocumentDuplicateIcon className="h-5 w-5 text-white" />}
                </span>
              </p>
              <p className="mt-4">Keep in mind</p>
              <ol className="ml-6 list-decimal">
                <li>Maximum 30 concurrent viewers on MadFi</li>
                {formMultiFormData.enableTips && (
                  <li>To enable $BONSAI tips, you must make a post using the button below</li>
                )}
                {formMultiFormData.enableBlackjack && (
                  <li>To enable Blackjack, you must make a post using the button below</li>
                )}
              </ol>
              <h2 className="mt-4 text-md font-bold tracking-tight sm:text-xl md:text-2xl pt-8">
                {!postUrl ? 'Post to Lens so anyone can tune in from the feed!' : 'Anyone can tune in from the feed!'}
              </h2>
              <div className="flex justify-center pt-8">
                {!postUrl ? (
                  <button
                    className="btn disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleCreatePost}
                    disabled={uploading}
                  >
                    Post to Lens
                  </button>
                ): (
                    <button
                      className="btn disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(postUrl, '_blank');
                      }}
                    >
                      View Post
                    </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default CreateSpace;
