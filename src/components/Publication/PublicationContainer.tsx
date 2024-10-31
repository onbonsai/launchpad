import { useMemo, useState, ReactNode, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useWalletClient, useAccount, useReadContract } from "wagmi";
import { switchChain } from "viem/actions";
import { erc20Abi } from "viem";
import { MoreHoriz } from "@mui/icons-material";
import { DownloadIcon } from "@heroicons/react/outline";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { ShareIcon } from "@src/components/Icons/ShareIcon";
import { ThemeColor } from "./types";
import { sdk } from "@farcaster/miniapp-sdk";

import useLensSignIn from "@src/hooks/useLensSignIn";
import { MADFI_BANNER_IMAGE_SMALL, SITE_URL } from "@src/constants/constants";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { followProfile } from "@src/services/lens/follow";
import useIsFollowed from "@src/hooks/useIsFollowed";
import { publicationProfilePictureStyle, textContainerStyleOverrides } from "./PublicationStyleOverrides";
import { resumeSession } from "@src/hooks/useLensLogin";
import { sendLike } from "@src/services/lens/getReactions";
import { LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { checkCollectAmount, collectPost } from "@src/services/lens/collect";
import { type SmartMedia } from "@src/services/madfi/studio";
import CollectModal from "./CollectModal";
import DropdownMenu from "./DropdownMenu";
import { sendRepost } from "@src/services/lens/posts";
import useIsMounted from "@src/hooks/useIsMounted";
import { useTopUpModal } from "@src/context/TopUpContext";
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
  isMediaPage?: boolean;
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
  decryptGatedPosts,
  shouldGoToPublicationPage = false,
  onCommentButtonClick,
  onActButtonClick,
  hideQuoteButton = false,
  media,
  onCollectCallback,
  sideBySideMode,
  nestedWidget,
  token,
  connectedAccounts,
  isMediaPage,
}: PublicationContainerProps) => {
  const router = useRouter();
  const { isMiniApp } = useIsMiniApp();
  const isMounted = useIsMounted();
  const referralAddress = router.query.ref as `0x${string}`;
  const { chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated, authenticatedProfile, authenticatedProfileId } = useLensSignIn(walletClient);
  const { data: isFollowedResponse } = useIsFollowed(authenticatedProfileId, publication?.by?.id);
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
  const { openTopUpModal } = useTopUpModal();
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  // bonsai balance of Lens Account
  const { data: bonsaiBalance } = useReadContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: "balanceOf",
    args: [authenticatedProfile?.address as `0x${string}`],
    query: {
      refetchInterval: 10000,
      enabled: isAuthenticated && authenticatedProfile?.address,
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
          image: { raw: { uri: MADFI_BANNER_IMAGE_SMALL } },
        },
        encryptedWith: publication.metadata.encryptedWith,
      },
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
            item: undefined, // Don't load video data initially
          },
        },
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
  const stableOperations = useMemo(
    () => ({
      ...(publication?.operations || {}),
      hasUpvoted: publication?.operations?.hasUpvoted || hasUpvoted,
      hasMirrored: publication?.operations?.hasMirrored || hasMirrored,
      hasCollected: publication?.operations?.hasSimpleCollected || hasCollected,
      canComment: media?.agentId ? hasCollected : undefined,
    }),
    [
      publication?.operations?.hasUpvoted,
      publication?.operations?.hasMirrored,
      publication?.operations?.hasSimpleCollected,
      hasUpvoted,
      hasMirrored,
      hasCollected,
      media?.agentId,
    ],
  );

  // Memoize stable key for the Publication component
  const publicationKey = useMemo(() => {
    return publication?.isDecrypted ? `pub-${publication.id}-decrypted` : undefined;
  }, [publication?.id, publication?.isDecrypted]);

  if (!(publicationId || publication)) throw new Error("Need publicationId or publication");
  if (publication?.metadata?.encryptedWith && !decryptGatedPosts)
    throw new Error("Encrypted publication needs fn decryptGatedPosts");

  const _publicationId = publication?.slug || publicationId!;

  const onShareButtonClick = async (e: React.MouseEvent) => {
    try {
      const postTitle =
        publication?.metadata?.content?.slice(0, 50) + (publication?.metadata?.content?.length > 50 ? "..." : "") ||
        "Check out this post on Bonsai";

      await sharePost(_publicationId, {
        title: postTitle,
        text: "Check out this amazing content on Bonsai",
      });
    } catch (error) {
      console.error("Web share failed:", error);
    }
  };

  const goToPublicationPage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      router.replace(`/post/${_publicationId}`, undefined, { shallow: false });
    },
    [router, _publicationId],
  );

  const goToCreatorPage = useCallback(
    (e: React.MouseEvent, username?: string) => {
      e.preventDefault();
      e.stopPropagation();
      router.replace(`/profile/${username}`, undefined, { shallow: false });
    },
    [router],
  );

  const onLikeButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasUpvoted) return;

    await sendLike(publication.slug);

    setHasUpvoted(true);
    toast.success("Liked", { duration: 3000 });
  };

  const handleCommentButton = useCallback(
    (e, actionModuleHandler?) => {
      if (shouldGoToPublicationPage) return goToPublicationPage(e);
      if (onCommentButtonClick && (!media || hasCollected))
        onCommentButtonClick(e, publication?.id, publication?.author?.username?.localName);
    },
    [
      shouldGoToPublicationPage,
      goToPublicationPage,
      onCommentButtonClick,
      media,
      hasCollected,
      publication?.id,
      publication?.author?.username?.localName,
    ],
  );

  const handleProfileClick = useCallback(
    (e) => {
      goToCreatorPage(e, publication?.author?.username?.localName);
    },
    [goToCreatorPage, publication?.author?.username?.localName],
  );

  const onMirrorButtonClick = async (e: React.MouseEvent, actionModuleHandler?) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasMirrored) return;

    const toastId = toast.loading("Reposting");
    try {
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
    const { payToCollect } = publication?.actions?.find((action) => action.__typename === "SimpleCollectAction") || {};

    if (payToCollect) {
      setCollectAmount(payToCollect.amount?.value);
      return payToCollect.amount?.asset.contract.address === PROTOCOL_DEPLOYMENT.lens.Bonsai;
    }

    return false;
  }, [publication]);

  const mediaUrl = useMemo(
    () => publication.metadata.attributes?.find(({ key }) => key === "apiUrl")?.value,
    [publication],
  );

  const onCollectButtonClick = async (e: React.MouseEvent) => {
    if (hasCollected) return;

    if (!!collectAmount) {
      e.preventDefault();
      e.stopPropagation();

      setShowCollectModal(true);
      setCollectAnchorElement(e.target);
    }

    if (onActButtonClick) onActButtonClick(e);
  };

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
        bonsaiBalance || BigInt(0),
      );

      if (amountNeeded > 0n) {
        openTopUpModal("topup", amountNeeded);
        toast("Add BONSAI to your Lens account wallet to collect", { id: toastId });
        setIsCollecting(false);
        return;
      }

      const collected = await collectPost(sessionClient, walletClient, publication.id, referralAddress);

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
  };

  // Download video with outro functionality
  const downloadVideoWithOutro = async (videoUrl: string, filename: string) => {
    try {
      setIsProcessingVideo(true);
      downloadVideoSimple(videoUrl, filename);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsProcessingVideo(false);
    }
  };

  // Simple video download fallback
  const downloadVideoSimple = async (videoUrl: string, filename: string) => {
    try {
      filename = filename.replace(/\.[^/.]+$/, ".mp4");

      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Simple video download failed:", error);
      toast.error("Download failed");
    }
  };

  // Cast media function for mini app
  const castMedia = async () => {
    try {
      const videoUrl = publication?.metadata?.video?.item;
      const imageUrl = publication?.metadata?.image?.item;

      if (!videoUrl && !imageUrl) {
        throw new Error("No media to cast");
      }

      const embeds: string[] = [];
      // if (videoUrl) embeds.push(videoUrl);
      // else if (imageUrl) embeds.push(imageUrl);

      const mediaUrl = `${SITE_URL}/${isMediaPage ? "media" : "post"}/${
        isMediaPage ? publication?.id : publication?.slug
      }`;
      embeds.push(mediaUrl);

      await sdk.actions.composeCast({
        text: `Check out this ${videoUrl ? "video" : "image"}\n\nmade @onbonsai.eth`,
        embeds: embeds as any,
      });

      toast.success("Cast created successfully!");
    } catch (error) {
      console.error("Cast failed:", error);
      toast.error("Failed to create cast");
    }
  };

  // Main download function
  const downloadMedia = async () => {
    try {
      const videoUrl = publication?.metadata?.video?.item;
      const imageUrl = publication?.metadata?.image?.item;

      if (videoUrl) {
        const filename = `bonsai-${publication?.slug || "video"}-${Date.now()}`;
        return downloadVideoWithOutro(videoUrl, filename);
      }

      if (imageUrl) {
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `bonsai-${publication?.slug || "image"}-${Date.now()}.jpg`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      throw new Error("No media to download");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Download failed");
    }
  };

  // Simplify the PublicationType logic since we now have a unified component
  const layout = useMemo(() => {
    if (
      publication?.metadata.__typename === "TextOnlyMetadata" &&
      !publication?.metadata?.attributes?.find((attr) => attr.key === "isCanvas")
    ) {
      return "vertical";
    }
    return sideBySideMode ? "horizontal" : "vertical";
  }, [publication?.metadata.__typename, publication?.metadata?.attributes, sideBySideMode]);

  return (
    <div className="relative">
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.2);
          }
          50% {
            transform: scale(1);
          }
          75% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
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
          onLikeButtonClick={!hasUpvoted && !isMiniApp ? onLikeButtonClick : undefined}
          onMirrorButtonClick={!hasMirrored && !isMiniApp ? onMirrorButtonClick : undefined}
          operations={stableOperations}
          hideQuoteButton={hideQuoteButton || isMiniApp}
          profilePictureStyleOverride={publicationProfilePictureStyle}
          containerBorderRadius={"24px"}
          containerPadding={"12px"}
          profilePadding={"0 0 0 0"}
          textContainerStyleOverride={textContainerStyleOverrides}
          backgroundColorOverride={"rgba(255,255,255, 0.08)"}
          markdownStyleBottomMargin={"0"}
          nestedWidget={nestedWidget}
          hideCollectButton={!!publication.root || isMiniApp}
          hideLikeButton={isMiniApp}
          presenceCount={connectedAccounts?.length}
          hideCommentButton={isMiniApp}
          onCollectButtonClick={onCollectButtonClick}
          layout={layout}
        />
      )}

      {/* Download/Cast button for media content (NOT showing in miniapp for now) */}
      {!!(publication?.metadata?.video?.item || publication?.metadata?.image?.item) && isMediaPage && !isMiniApp ? (
        <div
          className={`absolute cursor-pointer ${
            sideBySideMode
              ? `bottom-4 ${isMediaPage ? "right-2" : "right-14"}`
              : `bottom-3 ${isMediaPage ? "right-3" : "right-12"}`
          }`}
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
            className={`bg-dark-grey hover:bg-dark-grey/80 text-sm font-bold rounded-[10px] flex items-center justify-center ${
              sideBySideMode ? "p-[6px]" : "!mb-1 p-[4px] scale-77"
            } ${isProcessingVideo ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isProcessingVideo ? (
              <Spinner customClasses="h-4 w-4" color="#ffffff" />
            ) : isMiniApp ? (
              <ShareIcon color={ThemeColor.white} />
            ) : (
              <DownloadIcon className={`text-white ${sideBySideMode ? "w-6 h-6" : "w-4 h-4"}`} />
            )}
          </div>
        </div>
      ) : null}

      {!!media?.agentId && isAuthenticated && (
        <div
          className={`absolute cursor-pointer ${sideBySideMode ? "bottom-4 right-2" : "bottom-5 right-3"}`}
          onClick={(e) => {
            setShowDropdown(!showDropdown);
          }}
        >
          <button
            ref={dropdownButtonRef}
            className={`bg-dark-grey hover:bg-dark-grey/80 text-sm font-bold rounded-[10px] flex items-center justify-center ${
              sideBySideMode ? "p-[6px]" : "!mb-1 p-[2px] scale-77"
            }`}
          >
            <MoreHoriz sx={{ color: "#fff", fontSize: sideBySideMode ? 24 : 24 }} />
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
        videoUrl={publication?.metadata?.video?.item}
      />
    </div>
  );
};

export default PublicationContainer;
