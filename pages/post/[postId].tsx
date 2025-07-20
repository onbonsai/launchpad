import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic';
import { Theme } from "@madfi/widgets-react";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-hot-toast";
import { useEffect, useMemo, useState, useRef, useContext } from "react";
import Link from "next/link";
import { ArrowBack } from "@mui/icons-material";
import { switchChain } from "viem/actions";
import { LENS_ENVIRONMENT, storageClient } from "@src/services/lens/client";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { GenericUploader } from "@src/components/ImageUploader/GenericUploader";
import useIsMounted from "@src/hooks/useIsMounted";
import { useGetComments } from "@src/hooks/useGetComments";
import useGetPublicationWithComments from "@src/hooks/useGetPublicationWithComments";
import { getPost, getQuotes } from "@src/services/lens/posts";
import {
  imageContainerStyleOverride,
  mediaImageStyleOverride,
  publicationProfilePictureStyle,
  reactionContainerStyleOverride,
  reactionsContainerStyleOverride,
  textContainerStyleOverrides,
  publicationContainerStyleOverride,
  shareContainerStyleOverride,
} from "@src/components/Publication/PublicationStyleOverrides";
import { sendLike } from "@src/services/lens/getReactions";
import { resumeSession } from "@src/hooks/useLensLogin";
import { getProfileImage } from "@src/services/lens/utils";
import { fetchSmartMedia, resolveSmartMedia, SmartMedia } from "@src/services/madfi/studio";
import { createPost, uploadFile } from "@src/services/lens/createPost";
import { useRegisteredClubByToken } from "@src/hooks/useMoneyClubs";
import { TokenInfoComponent } from "@pagesComponents/Post/TokenInfoComponent";
import ChatWindowButton from "@pagesComponents/ChatWindow/components/ChatWindowButton";
import Chat from "@pagesComponents/ChatWindow/components/Chat";
import { useGetAgentInfo } from "@src/services/madfi/terminal";
import { LENS_CHAIN_ID } from "@src/services/madfi/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import usePostPresence from '@src/pagesComponents/Post/hooks/usePostPresence';
import { QuotePreviews } from '@src/pagesComponents/Post/QuotePreviews';
import { ChatSidebarContext } from "@src/components/Layouts/Layout/Layout";
import { generateSeededUUID, generateUUID } from "@pagesComponents/ChatWindow/utils";
import { TokenInfoExternal } from "@pagesComponents/Post/TokenInfoExternal";
import useIsMobile from "@src/hooks/useIsMobile";
import SendSvg from "@pagesComponents/ChatWindow/svg/SendSvg";
import { SafeImage } from "@src/components/SafeImage/SafeImage";
import formatRelativeDate from "@src/utils/formatRelativeDate";

interface PublicationProps {
  media: SmartMedia | null;
  rootPostId: string;
  pageName?: string;
  image?: string | null;
  content?: string;
  handle?: string;
  postId: string;
  quotes: any[];
}

// Lazy load the Publications component
const Publications = dynamic(
  () => import("@madfi/widgets-react").then(mod => mod.Publications),
  { ssr: false }
);

// Add the dynamic import for PublicationContainer with loading state
const PublicationContainer = dynamic(
  () => import("@src/components/Publication/PublicationContainer"),
  { ssr: false }
);

const COMMENT_SCORE_THRESHOLD = 500;

const SinglePublicationPage: NextPage<PublicationProps> = ({ media, rootPostId, quotes }) => {
  const isMounted = useIsMounted();
  const isMobile = useIsMobile();
  const router = useRouter();
  const { postId, v } = router.query;
  const { isConnected, chain, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated, authenticatedProfileId, authenticatedProfile } = useLensSignIn(walletClient);
  const { data: agentInfoSage, isLoading: isLoadingAgentInfo } = useGetAgentInfo();
  const { connectedAccounts, isConnected: isPresenceConnected } = usePostPresence({
    postId: rootPostId || postId as string,
    account: authenticatedProfile || null
  });
  const { isChatOpen, setIsChatOpen } = useContext(ChatSidebarContext);

  // TODO: fix this
  // Load version from URL query parameter when page loads
  // useEffect(() => {
  //   if (!isMounted || !media?.versions || !v) return;

  //   const versionIndex = parseInt(v as string);
  //   // Check if version is within bounds (0 to versions.length)
  //   if (versionIndex >= 0 && versionIndex < media.versions.length) {
  //     loadVersion(versionIndex);
  //   }
  // }, [isMounted, media?.versions, v]);

  // Use router.query.postId instead of postId from destructuring
  const currentPostId = router.query.postId as string;

  // Parse the post data if available from localStorage
  const passedPostData = useMemo(() => {
    if (!isMounted) return null;
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('tempPostData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          // Only use the stored data if it matches the current post ID
          if (parsedData?.id === currentPostId) {
            localStorage.removeItem('tempPostData');
            return parsedData;
          } else {
            // Clear the stored data if it doesn't match
            localStorage.removeItem('tempPostData');
          }
        } catch (e) {
          console.error("Failed to parse stored post data:", e);
          localStorage.removeItem('tempPostData');
          return null;
        }
      }
    }
    return null;
  }, [isMounted, currentPostId]);

  useEffect(() => {
    if (rootPostId) {
      fetchComments();
    }
  }, [rootPostId]);

  // Use the passed post data as initialData if available
  const { data: publicationWithComments, isLoading: isLoadingPublication, refetch } = useGetPublicationWithComments(
    currentPostId,
    passedPostData ? { initialData: { publication: passedPostData, comments: [] } } : undefined,
    authenticatedProfileId
  );

  const { publication, comments } = publicationWithComments || ({} as { publication: any; comments: any[] });
  const { data: club } = useRegisteredClubByToken({ ...media?.token });
  const { data: freshComments, refetch: fetchComments } = useGetComments(rootPostId as string, false);

  // Consider data as loaded if we have passed data, even if the hook is still loading
  const isLoading = isLoadingPublication && !passedPostData;

  const showRootPublication = !!publication?.root;

  // useEffect(() => {
  //   if (!isLoading && showRootPublication && currentPostId !== rootPostId) {
  //     setReplyingToComment(currentPostId);
  //     setReplyingToUsername(publication?.author?.username?.localName);
  //   }
  // }, [isLoading, currentPostId, rootPostId, publication?.author?.username?.localName]);

  const [isCommenting, setIsCommenting] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState<string | null>(null);
  const [replyingToFeed, setReplyingToFeed] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [localHasUpvoted, setLocalHasUpvoted] = useState<Set<string>>(new Set());
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [popperAnchor, setPopperAnchor] = useState<HTMLElement | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [currentVersionMetadata, setCurrentVersionMetadata] = useState<any>(null);
  const [showVersionIndicator, setShowVersionIndicator] = useState(false);
  const [isVersionIndicatorVisible, setIsVersionIndicatorVisible] = useState(false);
  const [showLowScoreComments, setShowLowScoreComments] = useState(false);

  const { highScoreComments, lowScoreComments } = useMemo(() => {
    const allComments = (freshComments || comments || []);
    return {
      highScoreComments: allComments.filter((comment: any) => (comment.author.score || 0) >= COMMENT_SCORE_THRESHOLD),
      lowScoreComments: allComments.filter((comment: any) => (comment.author.score || 0) < COMMENT_SCORE_THRESHOLD)
    };
  }, [freshComments, comments]);

  const sortedHighScoreComments = useMemo(() => {
    return highScoreComments.sort((a: any, b: any) => {
      // Sort by upvoteReactions descending
      if (b.stats.upvoteReactions !== a.stats.upvoteReactions) {
        return b.stats.upvoteReactions - a.stats.upvoteReactions;
      }
      // If upvoteReactions are equal, sort by createdAt ascending
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [highScoreComments]);

  const sortedLowScoreComments = useMemo(() => {
    return lowScoreComments.sort((a: any, b: any) => {
      // Sort by upvoteReactions descending
      if (b.stats.upvoteReactions !== a.stats.upvoteReactions) {
        return b.stats.upvoteReactions - a.stats.upvoteReactions;
      }
      // If upvoteReactions are equal, sort by createdAt ascending
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [lowScoreComments]);

  const isProfileAdmin = useMemo(() => {
    if (!(publication?.by && authenticatedProfileId)) return false;
    return publication?.by.id === authenticatedProfileId;
  }, [publication, authenticatedProfileId]);

  const hasUpvotedComment = (publicationId: string): boolean => {
    const comment = (freshComments || comments).find(({ id }) => id === publicationId);
    return localHasUpvoted.has(publicationId) || comment?.operations?.hasUpvoted || false;
  };

  const getOperationsFor = (publicationId: string): any | undefined => {
    const comment = (freshComments || comments).find(({ id }) => id === publicationId);
    if (!comment) return;

    return {
      ...comment?.operations,
      hasUpvoted: localHasUpvoted.has(publicationId) || comment?.operations?.hasUpvoted,
    };
  };

  const isLoadingPage = useMemo(() => {
    if (passedPostData) return false;
    if (isLoadingPublication) return true;
    if (isLoadingAgentInfo) return true;

    return false;
  }, [isLoadingPublication, isLoadingAgentInfo, passedPostData]);

  const conversationId = useMemo(() => {
    if (isMounted && !isLoadingPage)
      return media?.postId
        ? generateSeededUUID(`${media.postId}-${authenticatedProfile?.address || address}`)
        : generateUUID();
  }, [isMounted, isLoadingPage, authenticatedProfile, address, media]);

  const remixPostId = useMemo(() => publication?.metadata?.attributes?.find(({ key }) => key === "remix")?.value, [publication]);

  const profilePictureUrl = useMemo(() => {
    if (authenticatedProfile) {
      return getProfileImage(authenticatedProfile);
    }
  }, [authenticatedProfile]);

  const enoughActivity = useMemo(() => {
    if (!sortedHighScoreComments?.length || !media?.updatedAt) return false;

    return sortedHighScoreComments.some((comment: any) => {
      const commentTimestamp = Math.floor(new Date(comment.timestamp).getTime() / 1000);
      return commentTimestamp > media.updatedAt;
    });
  }, [sortedHighScoreComments, media]);

  const onCommentButtonClick = (e: React.MouseEvent, commentId?: string, username?: string, isThread?: boolean) => {
    e.preventDefault();
    setReplyingToComment(commentId || null);
    setReplyingToUsername(username || null);

    // Find the comment and set its feed address
    if (commentId) {
      const comment = (freshComments || comments).find(c => c.id === commentId);
      setReplyingToFeed(comment?.feed?.address || null);
    } else {
      setReplyingToFeed(null);
    }

    if (isThread) {
      setPopperAnchor(e.currentTarget as HTMLElement);
    }
  };

  const scrollToReplyInput = () => {
    commentInputRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const focusAndScrollToReplyInput = () => {
    scrollToReplyInput();
    const timer = setTimeout(() => {
      commentInputRef.current?.focus();
    }, 500);
    return timer;
  }

  useEffect(() => {
    if ((replyingToComment !== null) && commentInputRef.current && !popperAnchor) {
      const timer = focusAndScrollToReplyInput();
      return () => clearTimeout(timer);
    }
  }, [replyingToComment]);

  const submitComment = async () => {
    if (!authenticatedProfile) {
      console.log('No authenticated profile');
      return;
    }

    // Prevent double submission
    if (isCommenting) {
      console.log('Already submitting');
      return;
    }

    if (LENS_CHAIN_ID !== chain?.id && walletClient) {
      try {
        await switchChain(walletClient, { id: LENS_CHAIN_ID });
      } catch (error) {
        console.log(error);
        toast.error("Please switch networks to comment");
        return;
      }
    }

    setIsCommenting(true);
    const toastId = toast.loading("Sending reply...");
    try {
      let asset = {};
      if (files?.length) {
        asset = await uploadFile(files[0]);
      }

      const sessionClient = await resumeSession();
      if (!sessionClient) {
        console.log('No session client');
        return;
      }

      const res = await createPost(
        sessionClient,
        walletClient,
        { text: comment, ...asset },
        replyingToComment || currentPostId,
        undefined,
        replyingToFeed || publication?.feed?.address
      );
      if (!res?.postId) throw new Error("no resulting post id");

      const isCollected = showRootPublication
      ? publication?.root.operations?.hasSimpleCollected
      : publication?.operations?.hasSimpleCollected

      toast.success(
        isCollected
          ? "Sent! Your reply will be added to the next update."
          : "Sent. Collect the post to affect the next update.",
        { id: toastId, duration: 10000 },
      );
      setComment("");
      setFiles([]);
      setTimeout(fetchComments, 3000);
      setReplyingToComment(null);
      setReplyingToFeed(null);
    } catch (error) {
      toast.error("Comment failed", { duration: 5000, id: toastId });
    } finally {
      setIsCommenting(false);
    }
  };

  const onLikeButtonClick = async (e: React.MouseEvent, publicationId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasUpvotedComment(publicationId)) return;

    await sendLike(publicationId);

    setLocalHasUpvoted(new Set([...localHasUpvoted, publicationId]));
    toast.success("Liked", { duration: 2000 });
  };

  const goToCreatorPage = (e: React.MouseEvent, username?: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/profile/${username}`);
  };

  // Function to load a specific version
  const loadVersion = async (index: number) => {
    // If index is equal to versions.length, we're going to the current version
    if (index === media?.versions?.length) {
      setCurrentVersionMetadata(null);
      setCurrentVersionIndex(null);
      setShowVersionIndicator(true);
      setIsVersionIndicatorVisible(true);
      setTimeout(() => {
        setIsVersionIndicatorVisible(false);
        // Remove element after fade out animation completes
        setTimeout(() => setShowVersionIndicator(false), 300);
      }, 3000);
      return;
    }

    if (!media?.versions?.[index]) return;

    setIsLoadingVersion(true);
    try {
      const response = await fetch(media.versions[index]);
      const versionData = await response.json();
      setCurrentVersionMetadata(versionData.lens);
      setCurrentVersionIndex(index);
      setShowVersionIndicator(true);
      setIsVersionIndicatorVisible(true);
      setTimeout(() => {
        setIsVersionIndicatorVisible(false);
        // Remove element after fade out animation completes
        setTimeout(() => setShowVersionIndicator(false), 300);
      }, 2000);
    } catch (error) {
      console.error('Failed to load version:', error);
      toast.error('Failed to load version');
    } finally {
      setIsLoadingVersion(false);
    }
  };

  // Create the publication data with merged metadata when viewing a version
  const getPublicationData = useMemo(() => {
    if (currentVersionIndex === null) {
      return showRootPublication ? publication?.root : publication;
    }

    // Merge the current publication with the version's metadata
    const basePublication = showRootPublication ? publication?.root : publication;
    if (!basePublication || !currentVersionMetadata) return basePublication;
    
    return {
      ...basePublication,
      metadata: {
        ...currentVersionMetadata,
        // Preserve the __typename from the original publication metadata
        __typename: basePublication.metadata?.__typename
      },
      // Add a key to force re-render when version changes
      key: `version-${currentVersionIndex}`
    };
  }, [
    currentVersionIndex, 
    currentVersionMetadata?.content,
    currentVersionMetadata?.image,
    currentVersionMetadata?.video,
    publication?.id, 
    publication?.root?.id,
    showRootPublication,
    publication?.metadata?.__typename,
    publication?.root?.metadata?.__typename
  ]);

  if (!isMounted) return null;

  if (isLoadingPage) {
    return (
      <div className="bg-background text-secondary min-h-[50vh]">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-28 pb-4">
          <div className="flex justify-center">
            <Spinner customClasses="h-6 w-6" color="#5be39d" />
          </div>
        </main>
      </div>
    );
  }

  const safeMedia = (media: SmartMedia | null | undefined): SmartMedia | undefined => {
    return media || undefined;
  };

  return (
    <div className="bg-background text-secondary min-h-[50vh] max-h-[100%] overflow-hidden h-full relative">
      {/* Chat Sidebar, fixed and underneath main content */}
      {!isLoadingAgentInfo && !!agentInfoSage?.agentId && (
        <ChatWindowButton agentInfo={agentInfoSage} isOpen={isChatOpen} setIsOpen={setIsChatOpen}>
          <Chat
            agentId={currentPostId as string}
            agentWallet={agentInfoSage.info.wallets[0]}
            agentName={`${agentInfoSage.account?.metadata?.name} (${agentInfoSage.account?.username?.localName})`}
            media={safeMedia(media)}
            conversationId={conversationId}
            post={publication}
            remixVersionQuery={v as string}
          />
        </ChatWindowButton>
      )}
      <div className="h-full">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-2 sm:px-6 lg:px-8 md:pt-8 md:pb-4 h-full relative">
          <section aria-labelledby="dashboard-heading" className="max-w-full items-start justify-center h-full gap-4">
            <div className="flex flex-col md:gap-2 h-full relative pt-4">
              {(media as any)?.remixContest && (
                <div className="bg-brand-highlight text-black px-6 py-3 rounded-lg text-center font-medium mb-4">
                  🏆 Remix Contest: Win $10 - Create your own version of this post!
                </div>
              )}
              {club?.tokenAddress && <TokenInfoComponent club={club} media={safeMedia(media)} remixPostId={remixPostId} postId={publication?.id} />}
              {(!club && media?.token) && <TokenInfoExternal token={{ ...media.token }} />}
              <div className="overflow-y-hidden h-full">
                {isConnected && isLoading ? (
                  <div className="flex justify-center pt-8 pb-8">
                    <Spinner customClasses="h-6 w-6" color="#5be39d" />
                  </div>
                ) : (
                  <>
                    {publication ? (
                      <>
                        {/* Version Navigation Arrows - Only show if we have versions */}
                        {media?.versions && media.versions.length > 0 && (
                          <div className="absolute top-[50%] -translate-y-1/2 w-full flex justify-between z-10 px-2 sm:px-0" style={{ top: 'min(50%, 300px)' }}>
                            <button
                              onClick={() => loadVersion((currentVersionIndex ?? (media?.versions?.length ?? 0)) - 1)}
                              disabled={currentVersionIndex === 0 || isLoadingVersion}
                              className="transform sm:-translate-x-16 bg-dark-grey/80 hover:bg-dark-grey text-white rounded-full p-1 sm:p-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronLeftIcon className="h-8 w-6 sm:h-12 sm:w-8" />
                            </button>
                            <button
                              onClick={() => loadVersion((currentVersionIndex ?? -1) + 1)}
                              disabled={currentVersionIndex === null || isLoadingVersion}
                              className="transform sm:translate-x-16 bg-dark-grey/80 hover:bg-dark-grey text-white rounded-full p-1 sm:p-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronRightIcon className="h-8 w-6 sm:h-12 sm:w-8" />
                            </button>
                          </div>
                        )}
                        {/* Version Indicator - Only show if we're viewing a version */}
                        {media?.versions && showVersionIndicator && (
                          <div className={`absolute top-2 left-1/2 -translate-x-1/2 bg-dark-grey/80 text-white px-4 py-2 rounded-full text-md z-10 transition-opacity duration-300 ${isVersionIndicatorVisible ? 'opacity-100' : 'opacity-0'}`}>
                            {currentVersionIndex === null ? 'Current Version' : `Version ${currentVersionIndex + 1} of ${(media?.versions?.length ?? 0) + 1} (${formatRelativeDate(new Date(getPublicationData.timestamp))})`}
                          </div>
                        )}
                        <div className="hidden sm:block animate-fade-in-down">
                          <PublicationContainer
                            key={`pub-${getPublicationData.id}-v-${currentVersionIndex ?? 'current'}`}
                            publication={getPublicationData}
                            onCommentButtonClick={onCommentButtonClick}
                            shouldGoToPublicationPage={showRootPublication}
                            isProfileAdmin={isProfileAdmin}
                            media={safeMedia(media)}
                            onCollectCallback={() => {
                              refetch();
                              scrollToReplyInput();
                            }}
                            sideBySideMode={true}
                            token={{
                              address: club?.tokenAddress,
                              ticker: club?.symbol,
                            }}
                            enoughActivity={enoughActivity}
                            isPresenceConnected={isPresenceConnected}
                            connectedAccounts={connectedAccounts}
                            version={currentVersionIndex ?? media?.versions?.length ?? 0}
                          />
                        </div>
                        <div className="sm:hidden">
                          <PublicationContainer
                            key={`pub-mobile-${currentVersionIndex ?? 'current'}`}
                            publication={getPublicationData}
                            onCommentButtonClick={onCommentButtonClick}
                            shouldGoToPublicationPage={showRootPublication}
                            isProfileAdmin={isProfileAdmin}
                            media={safeMedia(media)}
                            onCollectCallback={() => {
                              refetch();
                              scrollToReplyInput();
                            }}
                            enoughActivity={enoughActivity}
                            isPresenceConnected={isPresenceConnected}
                            connectedAccounts={connectedAccounts}
                            version={currentVersionIndex ?? media?.versions?.length ?? 0}
                          />
                        </div>
                        <div className="min-w-0">
                          <QuotePreviews
                            quotes={quotes}
                            originalPost={publication?.quoteOf}
                            version={currentVersionIndex ?? media?.versions?.length ?? 0}
                            parentVersion={publication?.metadata.attributes?.find((attr: any) => attr.key === "remixVersion")?.value}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-center pt-8 pb-8">
                        <Spinner customClasses="h-6 w-6" color="#5be39d" />
                      </div>
                    )}
                    {/* Comment */}
                    <div className="space-y-6">
                      {isConnected && isAuthenticated && (
                        <>
                          {replyingToComment && (
                            <div className="flex items-center gap-x-2 mb-2 mt-4 text-sm text-secondary/70">
                              <span>Replying to {replyingToUsername}</span>
                              <button
                                onClick={() => setReplyingToComment(null)}
                                className="text-secondary hover:text-secondary/80"
                              >
                                × Cancel
                              </button>
                            </div>
                          )}
                          <div className={`flex items-center gap-x-3 md:gap-x-6 md:mt-4 ${!replyingToComment ? 'mt-6' : ''}`}>
                            <SafeImage src={profilePictureUrl} alt="profile" className="w-8 h-8 md:w-12 md:h-12 rounded-full" width={48} height={48} />
                            <div className="flex items-center space-x-2 md:space-x-4 flex-1">
                              <div className="relative flex-1">
                                <input
                                  ref={commentInputRef}
                                  type="text"
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      submitComment();
                                    }
                                  }}
                                  placeholder="Send a reply"
                                  autoComplete="off"
                                  className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 pt-2 pb-2 md:pt-4 md:pb-4 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                                />
                                <div className="absolute md:right-2 right-[0.5px] md:-top-2 -top-4">
                                  <GenericUploader files={files} setFiles={setFiles} contained />
                                </div>
                              </div>
                              <Button
                                disabled={isCommenting || !comment}
                                onClick={submitComment}
                                variant="accentBrand"
                                size={isMobile ? "xs" : "sm"}
                                className="!py-[8px] md:!py-[12px]"
                              >
                                <SendSvg />
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                      <div className="animate-fade-in-down pt-4">
                        {isMounted && (
                          <>
                            <Publications
                              publications={showRootPublication ? [publication] : sortedHighScoreComments}
                              theme={Theme.dark}
                              environment={LENS_ENVIRONMENT}
                              authenticatedProfile={authenticatedProfile}
                              hideCommentButton={false}
                              hideQuoteButton={true}
                              hideShareButton={true}
                              hasUpvotedComment={hasUpvotedComment}
                              onLikeButtonClick={onLikeButtonClick}
                              getOperationsFor={getOperationsFor}
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
                              publicationContainerStyleOverride={publicationContainerStyleOverride}
                              shareContainerStyleOverride={shareContainerStyleOverride}
                              markdownStyleBottomMargin={'0px'}
                              heartIconOverride={true}
                              messageIconOverride={true}
                              shareIconOverride={true}
                              followButtonDisabled={true}
                              onProfileClick={goToCreatorPage}
                              hideCollectButton={true}
                              onCommentButtonClick={(e, p, u) => onCommentButtonClick(e, p, u, true)}
                            />
                            {lowScoreComments.length > 0 && (
                              <>
                                <div className="flex justify-center mt-4 mb-4">
                                  <button
                                    onClick={() => setShowLowScoreComments(!showLowScoreComments)}
                                    className="px-4 py-2 text-sm text-secondary/70 hover:text-secondary bg-dark-grey/20 hover:bg-dark-grey/30 rounded-full transition-colors"
                                  >
                                    {showLowScoreComments ? 'Hide' : 'Show'} additional comments ({lowScoreComments.length})
                                  </button>
                                </div>
                                {showLowScoreComments && (
                                  <div className="mt-4 pt-4 border-t border-white/[0.03]">
                                    {/* <div className="text-sm text-secondary/50 mb-4 px-4">Low-score comments</div> */}
                                    <Publications
                                      publications={sortedLowScoreComments}
                                      theme={Theme.dark}
                                      environment={LENS_ENVIRONMENT}
                                      authenticatedProfile={authenticatedProfile}
                                      hideCommentButton={false}
                                      hideQuoteButton={true}
                                      hideShareButton={true}
                                      hasUpvotedComment={hasUpvotedComment}
                                      onLikeButtonClick={onLikeButtonClick}
                                      getOperationsFor={getOperationsFor}
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
                                      publicationContainerStyleOverride={publicationContainerStyleOverride}
                                      shareContainerStyleOverride={shareContainerStyleOverride}
                                      markdownStyleBottomMargin={'0px'}
                                      heartIconOverride={true}
                                      messageIconOverride={true}
                                      shareIconOverride={true}
                                      followButtonDisabled={true}
                                      onProfileClick={goToCreatorPage}
                                      hideCollectButton={true}
                                      onCommentButtonClick={(e, p, u) => onCommentButtonClick(e, p, u, true)}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const postId = context.query.postId!.toString();
  let post: any;
  let quotes: any;
  try {
    [post, quotes] = await Promise.all([
      getPost(postId),
      getQuotes(postId)
    ]);
  } catch { }

  if (!post) return { notFound: true };

  let media: SmartMedia | null = null;
  try {
    // Only attempt to resolve media if we have the necessary attributes
    const attributes = !post.root ? post.metadata.attributes : post.root.metadata.attributes;
    const slug = !post.root ? post.slug : post.root.slug;

    if (attributes?.some((attr: any) => attr.key === 'template')) {
      media = await resolveSmartMedia(attributes, slug, true);
    }
  } catch {
    console.log("error resolving media");
  }

  const image = post.metadata?.__typename === "VideoMetadata"
    ? (post.metadata?.video?.cover?.startsWith("lens://")
        ? await storageClient.resolve(post.metadata.video.cover)
        : post.metadata?.video?.cover) ?? null
    : (post.metadata?.image?.item?.startsWith("lens://")
        ? await storageClient.resolve(post.metadata.image.item)
        : post.metadata?.image?.item) ?? null;

  return {
    props: {
      pageName: "singlePublication",
      media,
      image,
      rootPostId: post.root?.slug || postId,
      content: post?.metadata?.content,
      handle: post?.author?.username?.localName || post.author.address,
      postId,
      quotes: quotes || [],
    },
  };
};

export default SinglePublicationPage;
