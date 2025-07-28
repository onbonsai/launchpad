import { useMemo, useState, ReactNode, useRef, useEffect, useContext, useCallback } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useWalletClient, useAccount, useReadContract } from "wagmi";
import { switchChain } from "viem/actions";
import { erc20Abi } from "viem";
import { MoreHoriz, SwapCalls } from "@mui/icons-material";
import { DownloadIcon } from '@heroicons/react/outline';
import { ChatSidebarContext } from "@src/components/Layouts/Layout/Layout";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { ShareIcon } from "@src/components/Icons/ShareIcon";
import { ThemeColor } from "./types";
import { sdk } from "@farcaster/miniapp-sdk";

import useLensSignIn from "@src/hooks/useLensSignIn";
import { MADFI_BANNER_IMAGE_SMALL } from "@src/constants/constants";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { followProfile } from "@src/services/lens/follow";
import useIsFollowed from "@src/hooks/useIsFollowed";
import {
  publicationProfilePictureStyle,
  textContainerStyleOverrides,
} from "./PublicationStyleOverrides";
import { resumeSession } from "@src/hooks/useLensLogin";
import { sendLike } from "@src/services/lens/getReactions";
import { LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { checkCollectAmount, collectPost } from "@src/services/lens/collect";
import { ELIZA_API_URL, SET_FEATURED_ADMINS, SmartMediaStatus, type SmartMedia } from "@src/services/madfi/studio";
import CollectModal from "./CollectModal";
import DropdownMenu from "./DropdownMenu";
import { sendRepost } from "@src/services/lens/posts";
import { SparkIcon } from "../Icons/SparkIcon";
import { formatNextUpdate } from "@src/utils/utils";
import { useGetCredits } from "@src/hooks/useGetCredits";
import useIsMounted from "@src/hooks/useIsMounted";
import { useTopUpModal } from "@src/context/TopUpContext";
import useIsMobile from "@src/hooks/useIsMobile";
import clsx from "clsx";
import { sharePost } from "@src/utils/webShare";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { Publication } from "./Publication";

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
  version?: number;
  showDownload?: boolean;
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
  mdMinWidth = 'md:min-w-[700px]',
  token,
  enoughActivity,
  isPresenceConnected,
  connectedAccounts,
  version,
  showDownload,
}: PublicationContainerProps) => {
  const router = useRouter();
  const { isMiniApp } = useIsMiniApp();
  const isMounted = useIsMounted();
  const isMobile = useIsMobile();
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
  const [showPulse, setShowPulse] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const { setIsChatOpen, setIsRemixing } = useContext(ChatSidebarContext);

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

  // Move this function before the useMemo and memoize it
  const getPublicationDataStable = useCallback((publication: PostFragmentPotentiallyDecrypted): any => {
    if (!publication.metadata?.encryptedWith || publication.isDecrypted) {
      return publication; // Return original object to maintain reference stability
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
  }, []);

  // Add video loading state
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // Optimize publication data with stable reference
  const optimizedPublicationData = useMemo(() => {
    if (!publication) return undefined;

    const data = getPublicationDataStable(publication);

    // Only modify if we need to remove video data
    if (data.metadata?.video && !isVideoLoading) {
      return {
        ...data,
        metadata: {
          ...data.metadata,
          video: {
            ...data.metadata.video,
            item: undefined // Don't load video data initially
          }
        }
      };
    }

    return data;
  }, [publication?.id, publication?.isDecrypted, isVideoLoading, getPublicationDataStable]);

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

  // Memoize operations object to prevent re-renders
  const stableOperations = useMemo(() => ({
    ...publication?.operations || {},
    hasUpvoted: publication?.operations?.hasUpvoted || hasUpvoted,
    hasMirrored: publication?.operations?.hasMirrored || hasMirrored,
    hasCollected: publication?.operations?.hasSimpleCollected || hasCollected,
    canComment: media?.agentId ? hasCollected : undefined,
  }), [
    publication?.operations?.hasUpvoted,
    publication?.operations?.hasMirrored,
    publication?.operations?.hasSimpleCollected,
    hasUpvoted,
    hasMirrored,
    hasCollected,
    media?.agentId
  ]);

  // Memoize stable key for the Publication component
  const publicationKey = useMemo(() => {
    return publication?.isDecrypted ? `pub-${publication.id}-decrypted` : undefined;
  }, [publication?.id, publication?.isDecrypted]);

  // Add effect to handle pulse animation when comment is submitted
  useEffect(() => {
    if (onCollectCallback && !hasCollected) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [onCollectCallback, hasCollected]);

  if (!(publicationId || publication)) throw new Error('Need publicationId or publication');
  if (publication?.metadata?.encryptedWith && !decryptGatedPosts) throw new Error('Encrypted publication needs fn decryptGatedPosts');

  const _publicationId = publication?.slug || publicationId!;

  const onShareButtonClick = async (e: React.MouseEvent) => {
    try {
      const postTitle = publication?.metadata?.content?.slice(0, 50) + (publication?.metadata?.content?.length > 50 ? '...' : '') || 'Check out this post on Bonsai';

      await sharePost(_publicationId, {
        title: postTitle,
        text: 'Check out this amazing content on Bonsai',
      });
    } catch (error) {
      console.error('Web share failed:', error);
    }
  };

  const goToPublicationPage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.replace(`/post/${_publicationId}`, undefined, { shallow: false });
  }, [router, _publicationId]);

  const goToCreatorPage = useCallback((e: React.MouseEvent, username?: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.replace(`/profile/${username}`, undefined, { shallow: false });
  }, [router]);

  const onLikeButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasUpvoted) return;

    await sendLike(publication.slug);

    setHasUpvoted(true);
    toast.success("Liked", { duration: 3000 });
  };

  const handleCommentButton = useCallback((e, actionModuleHandler?) => {
    if (shouldGoToPublicationPage) return goToPublicationPage(e);
    if (onCommentButtonClick && (!media || hasCollected)) onCommentButtonClick(e, publication?.id, publication?.author?.username?.localName);
  }, [shouldGoToPublicationPage, goToPublicationPage, onCommentButtonClick, media, hasCollected, publication?.id, publication?.author?.username?.localName]);

  const handleProfileClick = useCallback((e) => {
    goToCreatorPage(e, publication?.author?.username?.localName);
  }, [goToCreatorPage, publication?.author?.username?.localName]);

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

    if (LENS_CHAIN_ID !== chain?.id && walletClient) {
      try {
        await switchChain(walletClient, { id: LENS_CHAIN_ID });
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
    if (hasCollected) return;

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
      if (LENS_CHAIN_ID !== chain?.id && walletClient) {
        try {
          await switchChain(walletClient, { id: LENS_CHAIN_ID });
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

  // Download video with outro functionality
  const downloadVideoWithOutro = async (videoUrl: string, filename: string) => {
    const agentId = media?.agentId || 'publication';

    try {
      setIsProcessingVideo(true);
      toast.loading('Downloading video...', { id: `processing-${agentId}` });

      // Get video resolution to determine aspect ratio
      const video = document.createElement('video');
      video.src = videoUrl;

      const aspectRatio = await new Promise<string>((resolve) => {
        video.onloadedmetadata = () => {
          const ratio = video.videoWidth / video.videoHeight;
          resolve(ratio > 1 ? 'landscape' : 'portrait');
        };
      });

      const response = await fetch(ELIZA_API_URL + '/video/add-outro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          filename: filename.replace(/\.[^/.]+$/, '.mp4'),
          isBlob: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to process video');
      }

      // Get the processed video as blob
      const blob = await response.blob();

      // Download the processed video
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.replace(/\.[^/.]+$/, '.mp4');
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Video downloaded!', { id: `processing-${agentId}`, duration: 3000 });

    } catch (error) {
      console.error('Video processing failed:', error);
      toast.dismiss(`processing-${agentId}`);
      downloadVideoSimple(videoUrl, filename);
    } finally {
      setIsProcessingVideo(false);
    }
  };

  // Simple video download fallback
  const downloadVideoSimple = async (videoUrl: string, filename: string) => {
    try {
      filename = filename.replace(/\.[^/.]+$/, '.mp4');

      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Simple video download failed:', error);
      toast.error('Download failed');
    }
  };

  // Cast media function for mini app
  const castMedia = async () => {
    try {
      const videoUrl = publication?.metadata?.video?.item;
      const imageUrl = publication?.metadata?.image?.item;

      if (!videoUrl && !imageUrl) {
        throw new Error('No media to cast');
      }

      const embeds: string[] = [];
      if (videoUrl) embeds.push(videoUrl);
      else if (imageUrl) embeds.push(imageUrl);

      // const mediaUrl = `${window.location.origin}/media/${publication?.slug || publication?.id}`;
      // embeds.push(mediaUrl);

      await sdk.actions.composeCast({
        text: `Check out this ${videoUrl ? 'video' : 'image'}\n\nmade @onbonsai.eth`,
        embeds: embeds as any,
      });

      toast.success('Cast created successfully!');
    } catch (error) {
      console.error('Cast failed:', error);
      toast.error('Failed to create cast');
    }
  };

  // Main download function
  const downloadMedia = async () => {
    try {
      const videoUrl = publication?.metadata?.video?.item;
      const imageUrl = publication?.metadata?.image?.item;

      if (videoUrl) {
        const filename = `bonsai-${publication?.slug || 'video'}-${Date.now()}`;
        return downloadVideoWithOutro(videoUrl, filename);
      }

      if (imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `bonsai-${publication?.slug || 'image'}-${Date.now()}.jpg`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      throw new Error('No media to download');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  // Simplify the PublicationType logic since we now have a unified component
  const layout = useMemo(() => {
    if (publication?.metadata.__typename === "TextOnlyMetadata" && !publication?.metadata?.attributes?.find(attr => attr.key === "isCanvas")) {
      return "vertical";
    }
    return sideBySideMode ? "horizontal" : "vertical";
  }, [publication?.metadata.__typename, publication?.metadata?.attributes, sideBySideMode]);

  return (
    <div className="relative">
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          25% { transform: scale(1.2); }
          50% { transform: scale(1); }
          75% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .pulse-animation {
          animation: pulse 1s ease-in-out;
        }
      `}</style>
      {isMounted && (
        <Publication
          key={publicationKey}
          publicationId={publication?.id ? publication!.id : publicationId}
          publicationData={optimizedPublicationData}
          environment={LENS_ENVIRONMENT}
          authenticatedProfile={authenticatedProfile || undefined}
          onClick={shouldGoToPublicationPage ? (e) => goToPublicationPage(e) : undefined}
          onProfileClick={!shouldGoToPublicationPage ? handleProfileClick : undefined}
          onShareButtonClick={(e) => onShareButtonClick(e)}
          onCommentButtonClick={handleCommentButton}
          onLikeButtonClick={!hasUpvoted ? onLikeButtonClick : undefined}
          onMirrorButtonClick={!hasMirrored ? onMirrorButtonClick : undefined}
          operations={stableOperations}
          hideQuoteButton={hideQuoteButton}
          profilePictureStyleOverride={publicationProfilePictureStyle}
          containerBorderRadius={'24px'}
          containerPadding={'12px'}
          profilePadding={'0 0 0 0'}
          textContainerStyleOverride={textContainerStyleOverrides}
          backgroundColorOverride={'rgba(255,255,255, 0.08)'}
          markdownStyleBottomMargin={'0'}
          nestedWidget={nestedWidget}
          hideCollectButton={!!publication.root}
          presenceCount={connectedAccounts?.length}
          hideCommentButton
          onCollectButtonClick={onCollectButtonClick}
          layout={layout}
        />
      )}
      <div className={clsx(
        "absolute z-20 flex",
        isMobile ? "top-4 right-4" : "top-4 right-4"
      )}>
        <div className="flex">
          {!isMobile && media?.agentId && isConnected && (isMiniApp || isAuthenticated) && (
            <>
              <div
                className="min-w-[88px] flex items-center justify-center border border-card-light py-2.5 px-5 bg-card-light cursor-pointer hover:bg-white hover:text-black transition-colors duration-200 rounded-xl"
                onClick={() => {
                  setIsChatOpen(true);
                  setIsRemixing(true);
                }}
              >
                <SwapCalls className="h-5 w-5 mr-2" />
                REMIX
              </div>
            </>
          )}
        </div>
      </div>
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

      {/* Download/Cast button for media content (NOT showing in miniapp for now) */}
      {!!(publication?.metadata?.video?.item || publication?.metadata?.image?.item) && showDownload && !isMiniApp ? (
        <div
          className={`absolute cursor-pointer ${sideBySideMode ? `bottom-4 ${showDownload ? 'right-2' : 'right-14'}` : `bottom-3 ${showDownload ? 'right-3' : 'right-12'}`}`}
          onClick={(e) => {
            e.stopPropagation();
            if (isMiniApp) {
              castMedia();
            } else {
              downloadMedia();
            }
          }}
        >
          <div
            className={`bg-dark-grey hover:bg-dark-grey/80 text-sm font-bold rounded-[10px] flex items-center justify-center ${sideBySideMode ? 'p-[6px]' : '!mb-1 p-[4px] scale-77'} ${isProcessingVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessingVideo ? (
              <Spinner customClasses="h-4 w-4" color="#ffffff" />
            ) : isMiniApp ? (
              <ShareIcon color={ThemeColor.white} />
            ) : (
              <DownloadIcon className={`text-white ${sideBySideMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
            )}
          </div>
        </div>
      ) : null}

      {!!media?.agentId && isAuthenticated && (
        <div
          className={`absolute cursor-pointer ${sideBySideMode ? 'bottom-4 right-2' : 'bottom-5 right-3'}`}
          onClick={(e) => { setShowDropdown(!showDropdown) }}
        >
          <button
            ref={dropdownButtonRef}
            className={`bg-dark-grey hover:bg-dark-grey/80 text-sm font-bold rounded-[10px] flex items-center justify-center ${sideBySideMode ? 'p-[6px]' : '!mb-1 p-[2px] scale-77'}`}
          >
            <MoreHoriz sx={{ color: '#fff', fontSize: sideBySideMode ? 24 : 24 }} />
          </button>
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
        videoUrl={publication?.metadata?.video?.item}
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