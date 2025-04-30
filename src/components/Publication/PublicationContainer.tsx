import { useMemo, useState, ReactNode, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useWalletClient, useAccount, useReadContract } from "wagmi";
import { switchChain } from "viem/actions";
import dynamic from 'next/dynamic';
import { Theme } from "@madfi/widgets-react";
import { erc20Abi } from "viem";
import { BookmarkAddOutlined, BookmarkOutlined, MoreHoriz, SwapCalls } from "@mui/icons-material";

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
import { checkCollectAmount, collectPost } from "@src/services/lens/collect";
import { configureChainsConfig } from "@src/utils/wagmi";
import { SET_FEATURED_ADMINS, SmartMediaStatus, type SmartMedia } from "@src/services/madfi/studio";
import CollectModal from "./CollectModal";
import { Button } from "../Button";
import DropdownMenu from "./DropdownMenu";
import { sendRepost } from "@src/services/lens/posts";
import { SparkIcon } from "../Icons/SparkIcon";
import { formatNextUpdate } from "@src/utils/utils";
import { useGetCredits } from "@src/hooks/useGetCredits";
import useIsMounted from "@src/hooks/useIsMounted";
import { useTopUpModal } from "@src/context/TopUpContext";
import { EyeIcon } from "@heroicons/react/outline";

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
  mdMinWidth?: string;
  token?: {
    address: `0x${string}`;
    ticker: string;
  };
  enoughActivity?: boolean; // does the smart media have any new comments since the last time it was updated
  isPresenceConnected?: boolean; // are we connected to the websocket
  connectedAccounts?: any; // connected accounts on the websocket
};

export type PostFragmentPotentiallyDecrypted = any & {
  isDecrypted?: boolean;
};

// Lazy load the Publication components with loading states
const Publication = dynamic(
  () => import("@madfi/widgets-react").then(mod => mod.Publication),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-dark-grey/20 rounded-2xl h-[200px] w-full" />
    )
  }
);

const HorizontalPublication = dynamic(
  () => import("@madfi/widgets-react").then(mod => mod.HorizontalPublication),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-dark-grey/20 rounded-2xl h-[200px] w-full" />
    )
  }
);

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
  mdMinWidth = 'md:min-w-[700px]',
  token,
  enoughActivity,
  isPresenceConnected,
  connectedAccounts,
}: PublicationContainerProps) => {
  const router = useRouter();
  const isMounted = useIsMounted();
  const referralAddress = router.query.ref as `0x${string}`;
  const { isConnected, chain, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const {
    isAuthenticated,
    authenticatedProfile,
    authenticatedProfileId,
  } = useLensSignIn(walletClient);
  const { data: isFollowedResponse } = useIsFollowed(authenticatedProfileId, publication?.by?.id);
  const { data: creatorCreditBalance } = useGetCredits(media?.creator as string, !!media?.creator);
  const { canFollow, isFollowed: _isFollowed } = isFollowedResponse || {};
  const [isFollowed, setIsFollowed] = useState(_isFollowed);
  const [hasUpvoted, setHasUpvoted] = useState<boolean>(publication?.operations?.hasUpvoted || false);
  const [hasMirrored, setHasMirrored] = useState<boolean>(!!publication?.operations?.hasReposted?.onchain || false);
  const [hasCollected, setHasCollected] = useState<boolean>(publication.operations?.hasSimpleCollected || false);
  const [isProcessing, setIsProcessing] = useState(media?.isProcessing || false);
  const [collectAmount, setCollectAmount] = useState<string>();
  const [isCollecting, setIsCollecting] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectAnchorElement, setCollectAnchorElement] = useState<EventTarget>();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const isCreator = publication?.author.address === authenticatedProfile?.address;
  const isAdmin = useMemo(() => address && SET_FEATURED_ADMINS.includes(address?.toLowerCase()), [address]);
  const { openTopUpModal } = useTopUpModal();

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

  // Move this function before the useMemo
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
  };

  // Add video loading state
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Optimize video data
  const optimizedPublicationData = useMemo(() => {
    if (!publication) return undefined;

    const data = getPublicationDataPotentiallyEncrypted(publication);

    // Only include video data if it's in view
    if (data.metadata?.video && !isVideoLoading) {
      data.metadata.video = {
        ...data.metadata.video,
        item: undefined // Don't load video data initially
      };
    }

    return data;
  }, [publication, isVideoLoading]);

  // Handle video loading
  useEffect(() => {
    if (publication?.metadata?.video) {
      setIsVideoLoading(true);
      // Simulate video loading
      const timer = setTimeout(() => {
        setIsVideoLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [publication?.metadata?.video]);

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
    router.replace(`/post/${_publicationId}`, undefined, { shallow: false });
  };

  const goToCreatorPage = (e: React.MouseEvent, username?: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.replace(`/profile/${username}`, undefined, { shallow: false });
  };

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

  const creatorInsufficientCredits = useMemo(() => {
    return media?.estimatedCost && creatorCreditBalance?.creditsRemaining
      ? media.estimatedCost > creatorCreditBalance.creditsRemaining
      : false;
  }, [media?.estimatedCost, creatorCreditBalance?.creditsRemaining]);

  const mediaUrl = useMemo(() => publication.metadata.attributes?.find(({ key }) => key === "apiUrl")?.value, [publication]);

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
    let toastId;
    try {
      if (LENS_CHAIN_ID !== chain?.id && switchChain) {
        try {
          await switchChain(configureChainsConfig, { chainId: LENS_CHAIN_ID });
        } catch (error) {
          console.log(error);
          toast.error("Please switch networks to collect", { id: toastId });
        }
        return;
      }
      const sessionClient = await resumeSession();
      if (!sessionClient) throw new Error("Not authenticated");

      toastId = toast.loading("Collecting post...");
      setIsCollecting(true);

      const amountNeeded = await checkCollectAmount(
        walletClient,
        collectAmount || "0",
        authenticatedProfile?.address as `0x${string}`,
        bonsaiBalance || BigInt(0)
      );

      if (amountNeeded > 0n) {
        openTopUpModal("topup", amountNeeded);
        toast("Add BONSAI to your Lens account wallet to collect", { id: toastId });
        setIsCollecting(false);
        return;
      }

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

  const renderPresenceIndicator = () => {
    if (!isPresenceConnected || !connectedAccounts.length || connectedAccounts.length === 1) return null;

    return (
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-dark-grey/80 text-white px-3 py-1 rounded-full text-sm z-10 flex items-center pointer-events-none select-none">
        <EyeIcon className="h-4 w-4" />
        <span className="ml-1">{connectedAccounts.length}</span>
      </div>
    );
  };

  let PublicationType = HorizontalPublication;
  if (publication?.metadata.__typename === "TextOnlyMetadata" && !publication?.metadata?.attributes?.find(attr => attr.key === "isCanvas")) {
    PublicationType = Publication;
    sideBySideMode = false;
  } else {
    PublicationType = sideBySideMode ? HorizontalPublication : Publication;
    if (sideBySideMode) {
      mdMinWidth = 'md:min-w-[900px]'
    }
  }

  return (
    <div className="relative">
      {isMounted && (
        <PublicationType
          key={publication?.isDecrypted ? `pub-${publication.id}-decrypted` : undefined}
          publicationId={publication?.id ? publication!.id : publicationId}
          publicationData={optimizedPublicationData}
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
          updatedAt={sideBySideMode && media?.updatedAt !== media?.createdAt ? media?.updatedAt : undefined}
          hideCollectButton={!!publication.root}
        />
      )}
      {isCollect && isAuthenticated && (
        <div className="absolute top-2 right-2 z-20">
          <Button
            variant={hasCollected ? "dark-grey" : "accentBrand"}
            size="md"
            className="text-base font-bold rounded-[12px] gap-x-1 md:px-2 py-[5px] max-w-[20px] sm:max-w-none"
            onClick={(e) => {
              if (!hasCollected) {
                onCollectButtonClick(e);
                return;
              }

              if (media?.agentId) router.push(`/studio/create?template=${media.template}&remix=${media.postId}&remixSource=${encodeURIComponent(mediaUrl || '')}`);
            }}
          >
            {!hasCollected ? (
              <>
                <BookmarkAddOutlined />
                <span className="hidden sm:block">Collect</span>
              </>
            ) : media?.agentId ? (
              <>
                <SwapCalls />
                <span className="hidden sm:block">Remix</span>
              </>
            ) : <BookmarkOutlined />}
          </Button>
        </div>
      )}
      {sideBySideMode && (
        <div className="absolute top-2 left-2 flex justify-between z-10">
          {(media?.category || media?.template) && (
            <div className="rounded-2xl bg-dark-grey/80 hover:shining-border text-white flex flex-col px-2 w-10 hover:w-fit group transition-all duration-300 ease-in-out cursor-pointer select-none">
              <div className="h-10 flex items-center overflow-hidden">
                <span className="pointer-events-none shrink-0">
                  <SparkIcon color={!isProcessing ? "#fff" : "#5be39d"} height={16} />
                </span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden ml-1 mr-2">
                  <span className="pointer-events-none text-sm">
                    {media.category.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                  </span>
                  <span className="text-white/60">•</span>
                  <span className="pointer-events-none text-sm text-white/80">
                    {media.template.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                  </span>
                  {media.status === SmartMediaStatus.ACTIVE && (
                    <>
                      <span className="text-white/60">•</span>
                      <span className={`pointer-events-none text-sm ${isProcessing ? 'text-brand-highlight' : 'text-white/80'}`}>
                        {
                          creatorInsufficientCredits
                            ? 'insufficient credits for today'
                            : isProcessing
                              ? `updating now`
                              : (enoughActivity ? `updating in ${formatNextUpdate(media.updatedAt)}` : 'no new activity')
                        }
                      </span>
                    </>
                  )}
                  {media.status === SmartMediaStatus.DISABLED && (
                    <>
                      <span className="text-white/60">•</span>
                      <span className={`pointer-events-none text-sm text-white/80`}>
                        media has been disabled
                      </span>
                    </>
                  )}
                  {/* helpful for admins to know of failures */}
                  {isAdmin && media.status === SmartMediaStatus.FAILED && (
                    <>
                      <span className="text-white/60">•</span>
                      <span className={`pointer-events-none text-sm text-bearish/80`}>
                        media update failed
                      </span>
                    </>
                  )}
                </div>
              </div>
              {media?.description && (
                <div className="w-0 h-0 group-hover:h-auto group-hover:w-fit max-w-[500px] opacity-0 group-hover:opacity-100 overflow-hidden transition-all duration-300 ease-in-out">
                  <span className="pointer-events-none text-sm block whitespace-normal break-words pb-2 ml-2">{media.description}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {renderPresenceIndicator()}

      {!!media?.agentId && isAuthenticated && (
        <div
          className={`absolute cursor-pointer ${sideBySideMode ? 'bottom-4 right-2' : 'bottom-3 right-10'}`}
          onClick={(e) => { setShowDropdown(!showDropdown) }}
        >
          <div
            ref={dropdownButtonRef}
            className={`bg-dark-grey hover:bg-dark-grey/80 text-sm font-bold rounded-[12px] flex items-center justify-center ${sideBySideMode ? 'p-[6px]' : 'p-[2px] scale-75'}`}
          >
            <MoreHoriz sx={{ color: '#fff', fontSize: sideBySideMode ? 24 : 20 }} />
          </div>
        </div>
      )}

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
        isCreator={isCreator}
        mediaUrl={mediaUrl}
        media={media}
        token={token}
        onRequestGeneration={() => setIsProcessing(true)}
        creditBalance={creatorCreditBalance}
        insufficientCredits={creatorInsufficientCredits}
      />

      {/* {publication?.metadata?.encryptedWith && decryptGatedPosts && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] md:w-[500px] w-250px rounded-lg">
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