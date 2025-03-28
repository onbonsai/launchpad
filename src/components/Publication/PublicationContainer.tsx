import { useMemo, useState, ReactNode, useRef } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useWalletClient, useAccount, useReadContract } from "wagmi";
import { switchChain } from "@wagmi/core";
import { Publication, HorizontalPublication, Theme } from "@madfi/widgets-react";
import { erc20Abi } from "viem";
import { BookmarkAddOutlined, BookmarkOutlined, MoreHoriz } from "@mui/icons-material";

import useLensSignIn from "@src/hooks/useLensSignIn";
import { MADFI_BANNER_IMAGE_SMALL, BONSAI_POST_URL } from "@src/constants/constants";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { ChainRpcs } from "@src/constants/chains";
import { followProfile } from "@src/services/lens/follow";
import useIsFollowed from "@src/hooks/useIsFollowed";
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, actButtonContainerStyleOverride } from "./PublicationStyleOverrides";
import { resumeSession } from "@src/hooks/useLensLogin";
import { sendLike } from "@src/services/lens/getReactions";
import { LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { collectPost } from "@src/services/lens/collect";
import { configureChainsConfig } from "@src/utils/wagmi";
import type { SmartMedia } from "@src/services/madfi/studio";
import CollectModal from "./CollectModal";
import { Button } from "../Button";
import DropdownMenu from "./DropdownMenu";
import { sendRepost } from "@src/services/lens/posts";
import { SparkIcon } from "../Icons/SparkIcon";

type PublicationContainerProps = {
  publicationId?: string;
  publication?: PostFragmentPotentiallyDecrypted;
  isProfileAdmin?: boolean;
  decryptGatedPosts?: () => void;
  decrypting?: boolean;
  shouldGoToPublicationPage?: boolean;
  onCommentButtonClick?: (e, commentId?: string, username?: string) => void;
  onActButtonClick?: (e) => void;
  renderActButtonWithCTA?: string;
  returnToPage?: string;
  hideQuoteButton?: boolean;
  hideFollowButton?: boolean;
  media?: SmartMedia;
  onCollectCallback?: () => void;
  sideBySideMode?: boolean;
  nestedWidget?: ReactNode;
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
  sideBySideMode,
  nestedWidget,
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
  const [hasMirrored, setHasMirrored] = useState<boolean>(!!publication?.operations?.hasReposted?.onchain || false);
  const [hasCollected, setHasCollected] = useState<boolean>(publication.operations?.hasSimpleCollected || false);
  const [collectAmount, setCollectAmount] = useState<string>();
  const [isCollecting, setIsCollecting] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectAnchorElement, setCollectAnchorElement] = useState<EventTarget>();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

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

  const goToCreatorPage = (e: React.MouseEvent, username?: string) => {
    e.preventDefault();
    e.stopPropagation();
    // router.push(`/post/${_publicationId}${returnToPage ? `?returnTo=${encodeURIComponent(returnToPage!) }` : ''}`);
    router.push(`/profile/${username}`);
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
    if (onCommentButtonClick && (!media || hasCollected)) onCommentButtonClick(e, publication?.id, publication?.author.username.localName);
  };

  const onMirrorButtonClick = async (e: React.MouseEvent, actionModuleHandler?) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasMirrored) return;

    const toastId = toast.loading("Reposting");
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

      const success = await sendRepost(publication.id);
      if (!success) throw new Error("Repost result not good");

      setHasMirrored(true);
      toast.success("Reposted", { duration: 3000, id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed to repost", { id: toastId });
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

  const isCollect = useMemo(() => {
    const { payToCollect } = publication?.actions?.find(action => action.__typename === "SimpleCollectAction") || {};

    if (payToCollect) {
      setCollectAmount(payToCollect.amount?.value);
      return payToCollect.amount?.asset.contract.address === PROTOCOL_DEPLOYMENT.lens.Bonsai;
    }

    return false;
  }, [publication]);

  const onCollectButtonClick = async (e: React.MouseEvent) => {
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
      toast.success("Collected", { id: toastId, duration: 3000 });
      setHasCollected(true);
      setShowCollectModal(false);
      if (onCollectCallback) onCollectCallback();
    } catch (error) {
      console.log(error);
      toast.error("Failed to collect", { id: toastId });
    }

    setIsCollecting(false);
  }

  let PublicationType = HorizontalPublication;
  let minWidth = 'min-w-[450px]'
  if (publication?.metadata.__typename === "TextOnlyMetadata" && !publication?.metadata?.attributes?.find(attr => attr.key === "isCanvas")) {
    PublicationType = Publication;
  } else {
    PublicationType = sideBySideMode ? HorizontalPublication : Publication;
    if (sideBySideMode) {
      minWidth = 'min-w-[900px]'
    }
  }

  return (
    <div className={`mb-4 relative flex justify-center max-h-60vh ${minWidth}`}>
      <PublicationType
        key={publication?.isDecrypted ? `pub-${publication.id}-decrypted` : undefined}
        publicationId={publication?.id ? publication!.id : publicationId}
        publicationData={publication ? getPublicationDataPotentiallyEncrypted(publication) : undefined}
        theme={Theme.dark}
        environment={LENS_ENVIRONMENT}
        authenticatedProfile={authenticatedProfile || undefined}
        walletClient={walletClient || undefined}
        onClick={shouldGoToPublicationPage ? (e) => goToPublicationPage(e) : undefined}
        onProfileClick={!shouldGoToPublicationPage ? (e) => goToCreatorPage(e, publication?.author.username.localName) : undefined}
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
        // onActButtonClick={_onActButtonClick}
        // renderActButtonWithCTA={_renderActButtonWithCTA}
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
        nestedWidget={nestedWidget}
        updatedAt={sideBySideMode ? media?.updatedAt : undefined}
        // onCollectButtonClick={!hasCollected ? onCollectButtonClick : undefined}
      />
      {isCollect && sideBySideMode && (
        <div className="absolute right-4 top-2 z-20">
          <Button
            variant="accentBrand"
            size="md"
            className={`text-base font-bold rounded-xl gap-x-1 md:px-2 py-[10px] ${hasCollected ? 'cursor-default bg-dark-grey text-white hover:bg-dark-grey' : ''}`}
            onClick={(e) => { if (!hasCollected) onCollectButtonClick(e) }}
          >
            {!hasCollected ? (
              <>
                <BookmarkAddOutlined />
                Collect
              </>
            ): (
              <>
                <BookmarkOutlined />
                Joined
              </>
            )}
          </Button>
        </div>
      )}
      {sideBySideMode && (
        <div className="absolute top-2 left-1 right-4 flex justify-between z-10">
          {(media?.category || media?.template) && (
            <div className="rounded-full bg-dark-grey/80 text-white h-10 flex items-center px-2 w-10 hover:w-fit group transition-all duration-300 ease-in-out cursor-pointer">
              <span className="pointer-events-none">
                <SparkIcon color="#fff" height={16} />
              </span>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden mr-2">
                {media?.category && (
                  <span className="pointer-events-none text-sm ml-1">
                    {media.category.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                  </span>
                )}
                {media?.category && media?.template && (
                  <span className="text-white/60">•</span>
                )}
                {media?.template && (
                  <span className="pointer-events-none text-sm text-white/80">
                    {media.template.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`absolute ${sideBySideMode ? 'bottom-4 right-4' : 'bottom-3 right-10'}`}>
        <Button
          ref={dropdownButtonRef}
          variant="dark-grey"
          size="sm"
          className={`text-sm font-bold rounded-xl gap-x-1 md:px-1 focus:outline-none focus:ring-0 ${sideBySideMode ? 'py-[6px]' : 'py-[2px] scale-75'}`}
          onClick={(e) => { setShowDropdown(!showDropdown) }}
        >
          <MoreHoriz sx={{ color: '#fff', fontSize: sideBySideMode ? 24 : 20 }} />
        </Button>
      </div>

      <CollectModal
        onCollect={onCollect}
        bonsaiBalance={bonsaiBalance}
        collectAmount={collectAmount}
        anchorEl={collectAnchorElement}
        isCollecting={isCollecting}
        isMedia={media?.agentId}
        account={authenticatedProfile?.address}
        showCollectModal={showCollectModal}
        setShowCollectModal={setShowCollectModal}
      />

      <DropdownMenu
        showDropdown={showDropdown}
        setShowDropdown={setShowDropdown}
        anchorEl={dropdownButtonRef.current}
        placement="top-end"
        postId={publication.id}
        postSlug={publication.slug}
        isCreator={publication?.author.address === authenticatedProfile?.address}
        mediaUrl={publication.metadata.attributes?.find(({ key }) => key === "apiUrl")?.value}
      />

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




export default PublicationContainer;