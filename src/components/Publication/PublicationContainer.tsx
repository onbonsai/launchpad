import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useWalletClient, useAccount, useReadContract } from "wagmi";
import { switchChain } from "@wagmi/core";
import { Publication, Theme } from "@madfi/widgets-react";
import Popper from '@mui/material/Popper';
import clsx from "clsx";
import { erc20Abi, formatEther, parseEther } from "viem";
import ClickAwayListener from '@mui/material/ClickAwayListener';

import useLensSignIn from "@src/hooks/useLensSignIn";
import { Button } from "@src/components/Button";
import { MADFI_BANNER_IMAGE_SMALL, BONSAI_POST_URL } from "@src/constants/constants";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { createMirrorMomoka, createMirrorOnchain } from "@src/services/lens/createMirror";
import { ChainRpcs } from "@src/constants/chains";
import { followProfile } from "@src/services/lens/follow";
import useIsFollowed from "@src/hooks/useIsFollowed";
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, actButtonContainerStyleOverride } from "./PublicationStyleOverrides";
import { resumeSession } from "@src/hooks/useLensLogin";
import { sendLike } from "@src/services/lens/getReactions";
import { LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { kFormatter } from "@src/utils/utils";
import { inter } from "@src/fonts/fonts";
import { Subtitle } from "@src/styles/text";
import { collectPost } from "@src/services/lens/collect";
import { configureChainsConfig } from "@src/utils/wagmi";
import type { SmartMedia } from "@src/services/madfi/studio";
import WalletButton from "../Creators/WalletButton";

type PublicationContainerProps = {
  publicationId?: string;
  publication?: PostFragmentPotentiallyDecrypted;
  isProfileAdmin?: boolean;
  decryptGatedPosts?: () => void;
  decrypting?: boolean;
  shouldGoToPublicationPage?: boolean;
  onCommentButtonClick?: (e) => void;
  onActButtonClick?: (e) => void;
  renderActButtonWithCTA?: string;
  returnToPage?: string;
  hideQuoteButton?: boolean;
  hideFollowButton?: boolean;
  media?: SmartMedia;
  onCollectCallback?: () => void;
};

export type PostFragmentPotentiallyDecrypted = any & {
  isDecrypted?: boolean;
};

// handles all the mf buttons
// - decrypt
// - subscribe to view (TODO: maybe abstract to whatever the gated condition is)
// - act
// - like / mirror / comment
const PublicationContainer = ({
  publicationId,
  publication,
  isProfileAdmin,
  decryptGatedPosts,
  decrypting,
  shouldGoToPublicationPage = false,
  onCommentButtonClick,
  onActButtonClick,
  renderActButtonWithCTA,
  returnToPage,
  hideQuoteButton = false,
  hideFollowButton,
  media,
  onCollectCallback,
}: PublicationContainerProps) => {
  const router = useRouter();
  const referralAddress = router.query.ref as `0x${string}`;
  const { isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const {
    isAuthenticated,
    authenticatedProfile,
    authenticatedProfileId,
  } = useLensSignIn(walletClient);
  const { data: isFollowedResponse } = useIsFollowed(authenticatedProfileId, publication?.by?.id);
  const { canFollow, isFollowed: _isFollowed } = isFollowedResponse || {};
  const [isFollowed, setIsFollowed] = useState(_isFollowed);
  const [hasUpvoted, setHasUpvoted] = useState<boolean>(publication?.operations?.hasUpvoted || false);
  const [hasMirrored, setHasMirrored] = useState<boolean>(publication?.operations?.hasMirrored || false);
  const [hasCollected, setHasCollected] = useState<boolean>(publication.operations?.hasSimpleCollected || false);
  const [collectAmount, setCollectAmount] = useState<string>();
  const [isCollecting, setIsCollecting] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectAnchorElement, setCollectAnchorElement] = useState<EventTarget>();

  // bonsai balance of Lens Account
  const { data: bonsaiBalance } = useReadContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: "balanceOf",
    args: [authenticatedProfile?.address as `0x${string}`],
    query: {
      refetchInterval: 10000,
      enabled: isAuthenticated && authenticatedProfile?.address
    },
  });

  if (!(publicationId || publication)) throw new Error('Need publicationId or publication');
  if (publication?.metadata?.encryptedWith && !decryptGatedPosts) throw new Error('Encrypted publication needs fn decryptGatedPosts');

  const _publicationId = publication?.slug || publicationId!;

  const onShareButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    navigator.clipboard.writeText(`${BONSAI_POST_URL}/${_publicationId}`);

    toast("Link copied", { position: "bottom-center", icon: "🔗", duration: 2000 });
  };

  const goToPublicationPage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // router.push(`/post/${_publicationId}${returnToPage ? `?returnTo=${encodeURIComponent(returnToPage!) }` : ''}`);
    router.push(`/post/${_publicationId}`);
  };

  const goToCreatorPage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // router.push(`/post/${_publicationId}${returnToPage ? `?returnTo=${encodeURIComponent(returnToPage!) }` : ''}`);
    router.push(`/profile/${publication.author.username.localName}`);
  };

  // stub the encrypted pub metadata to render something nicer
  const getPublicationDataPotentiallyEncrypted = (publication: PostFragmentPotentiallyDecrypted): any => {
    if (!publication.metadata?.encryptedWith || publication.isDecrypted) {
      return JSON.parse(JSON.stringify(publication));
    }

    return {
      ...publication,
      metadata: {
        content: "This publication is gated",
        asset: {
          __typename: "PublicationMetadataMediaImage",
          image: { raw: { uri: MADFI_BANNER_IMAGE_SMALL } }
        },
        encryptedWith: publication.metadata.encryptedWith
      }
    };
  }

  const onLikeButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasUpvoted) return;

    await sendLike(publication.slug);

    setHasUpvoted(true);
    toast.success("Liked", { duration: 3000 });
  };

  const handleCommentButton = (e, actionModuleHandler?) => {
    if (shouldGoToPublicationPage) return goToPublicationPage(e);
    if (onCommentButtonClick && (!media || hasCollected)) onCommentButtonClick(e);
  };

  const onMirrorButtonClick = async (e: React.MouseEvent, actionModuleHandler?) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasMirrored) return;

    const toastId = toast.loading("Preparing mirror...");
    try {
      // if (actionModuleHandler?.address === REWARD_ENGAGEMENT_ACTION_MODULE && actionModuleHandler.publicationRewarded?.actionType === "MIRROR") {
      //   // handle this mirror as an act to get the points (should've been a ref module :shrug:)
      //   // TODO: add check for limit reached (once enabled in the composer)
      //   if (!actionModuleHandler.hasClaimed) {
      //   await actWithActionHandler(actionModuleHandler, walletClient, authenticatedProfile, '');
      //     setHasMirrored(true);
      //     toast.success("Mirrored", { duration: 3000, id: toastId });
      //     return;
      //   }
      // }

      if (publication?.momoka) {
        await createMirrorMomoka(walletClient, publication!.id, authenticatedProfile!);
      } else {
        await createMirrorOnchain(walletClient, publication!.id, authenticatedProfile!);
      }

      setHasMirrored(true);
      toast.success("Mirrored", { duration: 3000, id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed to mirror", { id: toastId });
    }
  };

  // TODO: lens v3
  const onFollowClick = async (e: React.MouseEvent, _) => {
    e.preventDefault();

    if (!isAuthenticated) return;

    if (LENS_CHAIN_ID !== chain?.id && switchChain) {
      try {
        await switchChain(configureChainsConfig, { chainId: LENS_CHAIN_ID });
      } catch {
        toast.error("Please switch networks");
      }
      return;
    }

    const toastId = toast.loading("Following...");
    try {
      await followProfile(walletClient, publication?.by?.id!);
      setIsFollowed(true);
      toast.success("Followed", { id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed", { id: toastId });
    }
  };

  const _renderActButtonWithCTA = useMemo(() => {
    const simpleCollect = publication?.actions?.find(action => action.__typename === "SimpleCollectAction");

    if (simpleCollect) {
      if (hasCollected) return;
      const isBonsai = simpleCollect.amount.asset.contract.address = PROTOCOL_DEPLOYMENT.lens.Bonsai;

      if (isBonsai && !!authenticatedProfileId) {
        setCollectAmount(simpleCollect.amount.value);
        return "Collect";
      }
    }

    return renderActButtonWithCTA;
  }, [publication, authenticatedProfileId]);

  const _onActButtonClick = async (e: React.MouseEvent) => {
    if (!!collectAmount) {
      e.preventDefault();
      e.stopPropagation();

      setShowCollectModal(true);
      setCollectAnchorElement(e.target);
    }

    if (onActButtonClick) onActButtonClick(e);
  }

  const onCollect = async () => {
    setIsCollecting(true);
    let toastId;
    try {
      toastId = toast.loading("Collecting post...");

      if (LENS_CHAIN_ID !== chain?.id && switchChain) {
        try {
          await switchChain(configureChainsConfig, { chainId: LENS_CHAIN_ID });
        } catch {
          toast.error("Please switch networks to collect", { id: toastId });
          return;
        }
      }
      const sessionClient = await resumeSession();
      if (!sessionClient) throw new Error("Not authenticated");

      const collected = await collectPost(
        sessionClient,
        walletClient,
        publication.id,
        referralAddress
      );

      if (!collected) throw new Error("Failed to collect");
      toast.success("Collected! You can now join the post", { id: toastId });
      setHasCollected(true);
      if (onCollectCallback) onCollectCallback();
    } catch (error) {
      console.log(error);
      toast.error("Failed to collect", { id: toastId });
    }

    setIsCollecting(false);
  }

  return (
    <div className="mt-4 relative">
      <Publication
        key={publication?.isDecrypted ? `pub-${publication.id}-decrypted` : undefined}
        publicationId={publication?.id ? publication!.id : publicationId}
        publicationData={publication ? getPublicationDataPotentiallyEncrypted(publication) : undefined}
        theme={Theme.dark}
        environment={LENS_ENVIRONMENT}
        authenticatedProfile={authenticatedProfile || undefined}
        walletClient={walletClient || undefined}
        onClick={shouldGoToPublicationPage ? (e) => goToPublicationPage(e) : undefined}
        onProfileClick={!shouldGoToPublicationPage ? (e) => goToCreatorPage(e) : undefined}
        onShareButtonClick={(e) => onShareButtonClick(e)}
        onCommentButtonClick={handleCommentButton}
        onLikeButtonClick={!hasUpvoted ? onLikeButtonClick : undefined}
        onMirrorButtonClick={!hasMirrored ? onMirrorButtonClick : undefined}
        // @ts-ignore
        operations={{
          ...publication?.operations || {},
          hasUpvoted: publication?.operations?.hasUpvoted || hasUpvoted,
          hasMirrored: publication?.operations?.hasMirrored || hasMirrored,
          hasCollected: publication?.operations?.hasSimpleCollected || hasCollected,
          canComment: media?.agentId ? hasCollected : undefined,
        }}
        useToast={toast}
        rpcURLs={ChainRpcs}
        appDomainWhitelistedGasless={true}
        // handlePinMetadata={handlePinMetadata}
        onActButtonClick={_onActButtonClick}
        renderActButtonWithCTA={_renderActButtonWithCTA}
        hideFollowButton={!(isConnected && isAuthenticated) || isProfileAdmin || hideFollowButton}
        onFollowPress={onFollowClick}
        followButtonBackgroundColor={(isFollowed || _isFollowed) ? "transparent" : "#EEEDED"}
        followButtonDisabled={!isConnected}
        isFollowed={_isFollowed || isFollowed}
        hideQuoteButton={hideQuoteButton}
        profilePictureStyleOverride={publicationProfilePictureStyle}
        containerBorderRadius={'24px'}
        containerPadding={'12px'}
        profilePadding={'0 0 0 0'}
        textContainerStyleOverride={textContainerStyleOverrides}
        backgroundColorOverride={'rgba(255,255,255, 0.08)'}
        mediaImageStyleOverride={mediaImageStyleOverride}
        imageContainerStyleOverride={imageContainerStyleOverride}
        reactionsContainerStyleOverride={reactionsContainerStyleOverride}
        reactionContainerStyleOverride={reactionContainerStyleOverride}
        shareContainerStyleOverride={shareContainerStyleOverride}
        actButtonContainerStyleOverride={actButtonContainerStyleOverride}
        markdownStyleBottomMargin={'0'}
        heartIconOverride={true}
        messageIconOverride={true}
        shareIconOverride={true}
      />
      {showCollectModal && (
        <CollectModal
          onCollect={onCollect}
          bonsaiBalance={bonsaiBalance}
          collectAmount={collectAmount}
          anchorEl={collectAnchorElement}
          onClose={() => setShowCollectModal(false)}
          isCollecting={isCollecting}
          isMedia={media?.agentId}
          account={authenticatedProfile?.address}
        />
      )}

      {/* {publication?.metadata?.encryptedWith && decryptGatedPosts && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] md:w-[500px] w-250px rounded-xl">
          <Button
            variant={isConnected ? "accent" : "accent-disabled"}
            className="w-200px md:mb-0 text-base"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isConnected) return toast.error('Not connected');
              decryptGatedPosts(); // we're either decrypting this in single publication view or the feed
              // if (isProfileAdmin || (requiresBadge && hasMintedCorrectBadge)) {
              //   decryptGatedPosts(); // we're either decrypting this in single publication view or the feed
              // }
            }}
            // disabled={decrypting || !isConnected || !isAuthenticated}
            disabled
          >
            {(decrypting && isConnected && isAuthenticated) && <Spinner />}
            {!decrypting && (
              <>
                <LockClosedIcon className="mr-2 w-[18px] h-[18px] mt-[1px]" strokeWidth={2} />
                {isProfileAdmin ? "View" : "Gated"}
              </>
            )}
          </Button>
        </div>
      )} */}
    </div>
  )
};

const CollectModal = ({ onCollect, bonsaiBalance, collectAmount, anchorEl, onClose, isCollecting, isMedia, account }) => {
  const bonsaiBalanceFormatted = useMemo(() => (
    kFormatter(parseFloat(formatEther(bonsaiBalance || 0n)), true)
  ), [bonsaiBalance]);

  const bonsaiCostFormatted = useMemo(() => (
    kFormatter(parseFloat(collectAmount), true)
  ), [collectAmount]);

  const collectAmountBn = useMemo(() => {
    if (collectAmount) return parseEther(collectAmount);
    return 0n;
  }, [collectAmount])

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <Popper
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      placement="bottom-start"
      style={{ zIndex: 1400 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <div className={clsx("mt-2 bg-dark-grey p-4 rounded-xl shadow-lg w-[300px] space-y-4", inter.className)}>
          {isMedia && (
            <div className="flex items-center justify-center text-center">
              <Subtitle className="text-md">
                Collect to join the post
              </Subtitle>
            </div>
          )}
          <Button
            variant="accent"
            className="w-full md:mb-0 text-base"
            disabled={isCollecting || collectAmountBn > bonsaiBalance}
            onClick={onCollect}
          >
            Collect {bonsaiCostFormatted} $BONSAI
          </Button>
          <div className="flex items-center justify-center">
            <Subtitle className="text-md">
              Account Balance:
              <span className="ml-2">{bonsaiBalanceFormatted} $BONSAI</span>
            </Subtitle>
          </div>
          <div className="flex items-center justify-center space-x-1">
            <Subtitle className="text-md">Deposit</Subtitle>
            <WalletButton wallet={account} chain="lens" />
          </div>
        </div>
      </ClickAwayListener>
    </Popper>
  );
};


export default PublicationContainer;