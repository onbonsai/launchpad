import { useMemo, useState, useEffect } from "react";
import { LockClosedIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useWalletClient, useAccount, useReadContract } from "wagmi";
import { switchChain } from "@wagmi/core";
import { PostFragment, postId, PublicationReactionType } from "@lens-protocol/client"
import { Publication, Theme } from "@madfi/widgets-react";
import Popper from '@mui/material/Popper';
import clsx from "clsx";
import { erc20Abi, formatEther } from "viem";
import ClickAwayListener from '@mui/material/ClickAwayListener';

import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { Button } from "@src/components/Button";
import { MADFI_POST_URL, MADFI_BANNER_IMAGE_SMALL, BONSAI_POST_URL } from "@src/constants/constants";
import { LENS_ENVIRONMENT, lensClient } from "@src/services/lens/client";
import { createMirrorMomoka, createMirrorOnchain } from "@src/services/lens/createMirror";
import { ChainRpcs } from "@src/constants/chains";
import { pinFile, storjGatewayURL, pinJson } from "@src/utils/storj";
import { followProfile } from "@src/services/lens/follow";
import useIsFollowed from "@src/hooks/useIsFollowed";
import { polygon } from "viem/chains";
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, actButtonContainerStyleOverride } from "./PublicationStyleOverrides";
import { addReaction } from "@lens-protocol/client/actions";
import { resumeSession } from "@src/hooks/useLensLogin";
import { sendLike } from "@src/services/lens/getReactions";
import { LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { kFormatter } from "@src/utils/utils";
import { inter } from "@src/fonts/fonts";
import { Subtitle } from "@src/styles/text";
import { collectPost } from "@src/services/lens/collect";
import { configureChainsConfig } from "@src/utils/wagmi";

type PublicationContainerProps = {
  publicationId?: string;
  publication?: PostFragmentPotentiallyDecrypted;
  isProfileAdmin?: boolean;
  setSubscriptionOpenModal?: () => void;
  hasMintedBadge?: string;
  decryptGatedPosts?: () => void;
  decrypting?: boolean;
  shouldGoToPublicationPage?: boolean;
  onCommentButtonClick?: (e) => void;
  onActButtonClick?: (e) => void;
  renderActButtonWithCTA?: string;
  returnToPage?: string;
  hideQuoteButton?: boolean;
  hideFollowButton?: boolean;
};

export type PostFragmentPotentiallyDecrypted = PostFragment & {
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
  setSubscriptionOpenModal,
  hasMintedBadge,
  decryptGatedPosts,
  decrypting,
  shouldGoToPublicationPage = false,
  onCommentButtonClick,
  onActButtonClick,
  renderActButtonWithCTA,
  returnToPage,
  hideQuoteButton = false,
  hideFollowButton,
}: PublicationContainerProps) => {
  const router = useRouter();
  const referralAddress = router.query.ref as `0x${string}`;
  const { isConnected, chainId, address, chain } = useAccount();
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
  const [collectAmount, setCollectAmount] = useState<string>();
  const [isCollecting, setIsCollecting] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectAnchorElement, setCollectAnchorElement] = useState<EventTarget>();

  // bonsai balance on Lens
  const { data: bonsaiBalance } = useReadContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: {
      refetchInterval: 10000,
      enabled: isConnected && !!address
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
    if (onCommentButtonClick) onCommentButtonClick(e);
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

  // TODO: refactor for p00ls
  // const { requiresBadge, hasMintedCorrectBadge } = useMemo(() => {
  //   const hasTokenIdRequirement = publication?.metadata?.encryptedWith?.accessCondition?.criteria?.
  //     find(({ tokenIds }) => tokenIds);
  //   const requiresBadge = !isEmpty(hasTokenIdRequirement);
  //   const hasMintedCorrectBadge = hasTokenIdRequirement?.tokenIds?.includes(hasMintedBadge);

  //   return { requiresBadge, hasMintedCorrectBadge };
  // }, [publication, hasMintedBadge]);

  // TODO: update to lens storage
  // const handlePinMetadata = async (content, files): Promise<string> => {
  //   let toastId;
  //   let attachments: any[] = [];

  //   if (files.length > 0) {
  //     toastId = toast.loading("Uploading content...", { id: toastId });
  //     try {
  //       const cids = await Promise.all(
  //         files.map(async (file: any, idx: number) => ({
  //           item: `ipfs://${await pinFile(file)}`,
  //           type: file.type,
  //           altTag: file.name || `attachment_${idx}`,
  //         })),
  //       );
  //       attachments = attachments.concat(cids);
  //     } catch (error) {
  //       console.log(error);
  //       toast.dismiss(toastId);
  //       return '';
  //     }
  //   }

  //   const publicationMetadata = publicationBody(
  //     content,
  //     attachments,
  //     authenticatedProfile!.metadata?.displayName || authenticatedProfile!.handle!.suggestedFormatted.localName
  //   );

  //   const { data: postIpfsHash } = await pinJson(publicationMetadata);

  //   if (toastId) toast.dismiss(toastId);

  //   return storjGatewayURL(postIpfsHash);
  // }

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
      toast.success("Collected! You can now join the post evolution", { id: toastId });
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

const CollectModal = ({ onCollect, bonsaiBalance, collectAmount, anchorEl, onClose, isCollecting }) => {
  const bonsaiBalanceFormatted = useMemo(() => (
    kFormatter(parseFloat(formatEther(bonsaiBalance || 0n)))
  ), [bonsaiBalance]);

  const bonsaiCostFormatted = useMemo(() => (
    kFormatter(parseFloat(collectAmount), true)
  ), [collectAmount]);

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
        <div className={clsx("mt-2 bg-dark-grey p-4 rounded-xl shadow-lg w-[300px]", inter.className)}>
          <div className="mb-4 flex items-center justify-center text-center">
            <Subtitle className="text-md">
              You must collect this post to participate in the evolution of it
            </Subtitle>
          </div>
          <Button
            variant="accent"
            className="w-full md:mb-0 text-base"
            disabled={isCollecting}
            onClick={onCollect}
          >
            Pay {bonsaiCostFormatted} $BONSAI
          </Button>
          <div className="mt-4 flex items-center justify-center">
            <Subtitle>
              Balance:
              <span className="ml-2">{bonsaiBalanceFormatted} $BONSAI</span>
            </Subtitle>
          </div>
        </div>
      </ClickAwayListener>
    </Popper>
  );
};


export default PublicationContainer;