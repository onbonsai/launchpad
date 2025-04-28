import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic';
import { Theme } from "@madfi/widgets-react";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-hot-toast";
import { useEffect, useMemo, useState, useRef } from "react";
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
import { getPost } from "@src/services/lens/posts";
import { imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, publicationContainerStyleOverride, shareContainerStyleOverride, commentPublicationProfilePictureStyle, commentTextContainerStyleOverrides, commentReactionsContainerStyleOverride, commentProfileNameStyleOverride, commentDateStyleOverride } from "@src/components/Publication/PublicationStyleOverrides";
import { sendLike } from "@src/services/lens/getReactions";
import { resumeSession } from "@src/hooks/useLensLogin";
import { getProfileImage } from "@src/services/lens/utils";
import { resolveSmartMedia, SmartMedia } from "@src/services/madfi/studio";
import { createPost, uploadFile } from "@src/services/lens/createPost";
import { useRegisteredClubByToken } from "@src/hooks/useMoneyClubs";
import { TokenInfoComponent } from "@pagesComponents/Post/TokenInfoComponent";
import ChatWindowButton from "@pagesComponents/ChatWindow/components/ChatWindowButton";
import Chat from "@pagesComponents/ChatWindow/components/Chat";
import { useGetAgentInfo } from "@src/services/madfi/terminal";
import { LENS_CHAIN_ID } from "@src/services/madfi/utils";
import { configureChainsConfig } from "@src/utils/wagmi";
import { Post } from "@lens-protocol/client";

interface PublicationProps {
  media: SmartMedia | null;
  rootPostId: string;
  pageName?: string;
  image?: string | null;
  content?: string;
  handle?: string;
  postId: string;
}

// Lazy load the Publications component
const Publications = dynamic(
  () => import("@madfi/widgets-react").then(mod => mod.Publications),
  { ssr: false }
);

// Add the dynamic import for PublicationContainer with loading state
const PublicationContainer = dynamic(
  () => import("@src/components/Publication/PublicationContainer"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-dark-grey/20 rounded-2xl h-[200px] w-full" />
    )
  }
);

const SinglePublicationPage: NextPage<PublicationProps> = ({ media, rootPostId }) => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { postId, returnTo } = router.query;
  const { isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated, authenticatedProfileId, authenticatedProfile } = useLensSignIn(walletClient);
  const { data: agentInfoSage, isLoading: isLoadingAgentInfo } = useGetAgentInfo();

  // Parse the post data if available from localStorage
  const passedPostData = useMemo(() => {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('tempPostData');
      if (storedData) {
        try {
          localStorage.removeItem('tempPostData');
          return JSON.parse(storedData);
        } catch (e) {
          console.error("Failed to parse stored post data:", e);
          return null;
        }
      }
    }
    return null;
  }, []);

  // Use router.query.postId instead of postId from destructuring
  const currentPostId = router.query.postId as string;

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
  const { data: club } = useRegisteredClubByToken(media?.token?.address, media?.token?.chain);
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
  const [comment, setComment] = useState("");
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [localHasUpvoted, setLocalHasUpvoted] = useState<Set<string>>(new Set());
  const [canComment, setCanComment] = useState<boolean>();
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [popperAnchor, setPopperAnchor] = useState<HTMLElement | null>(null);

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
    return isLoading;
  }, [isLoading, isConnected]);

  const remixPostId = useMemo(() => publication?.metadata?.attributes?.find(({ key }) => key === "remix")?.value, [publication]);

  const profilePictureUrl = useMemo(() => {
    if (authenticatedProfile) {
      return getProfileImage(authenticatedProfile);
    }
  }, [authenticatedProfile]);

  const sortedComments: Post[] = useMemo(() => {
    return (freshComments || comments || []).sort((a, b) => {
      // Sort by upvoteReactions descending
      if (b.stats.upvoteReactions !== a.stats.upvoteReactions) {
        return b.stats.upvoteReactions - a.stats.upvoteReactions;
      }
      // If upvoteReactions are equal, sort by createdAt ascending
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [freshComments, comments]);

  const isProfileAdmin = useMemo(() => {
    if (!(publication?.by && authenticatedProfileId)) return false;

    return publication?.by.id === authenticatedProfileId;
  }, [publication, authenticatedProfileId]);

  const enoughActivity = useMemo(() => {
    if (!sortedComments?.length || !media?.updatedAt) return false;

    return sortedComments.some(comment => {
      const commentTimestamp = Math.floor(new Date(comment.timestamp).getTime() / 1000);
      return commentTimestamp > media.updatedAt;
    });
  }, [sortedComments, media]);

  useEffect(() => {
    setCanComment(
      showRootPublication
        ? publication?.root.operations?.hasSimpleCollected
        : publication?.operations?.hasSimpleCollected
    );
  }, [publication]);

  const onCommentButtonClick = (e: React.MouseEvent, commentId?: string, username?: string, isThread?: boolean) => {
    e.preventDefault();
    setReplyingToComment(commentId || null);
    setReplyingToUsername(username || null);

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

    if (LENS_CHAIN_ID !== chain?.id) {
      try {
        await switchChain(configureChainsConfig, { chainId: LENS_CHAIN_ID });
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
        replyingToComment || currentPostId
      );
      if (!res?.postId) throw new Error("no resulting post id");

      toast.success("Sent", { id: toastId, duration: 3000 });
      setComment("");
      setFiles([]);
      setTimeout(fetchComments, 3000);
      setReplyingToComment(null);
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
    <div className="bg-background text-secondary min-h-[50vh] max-h-[100%] overflow-hidden h-full">
      <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-8 pb-4 h-full relative">
        {!isLoadingAgentInfo && !!agentInfoSage?.agentId && (
          <ChatWindowButton agentInfo={agentInfoSage}>
            <Chat
              // treating the postId as the agentId in the eliza backend
              agentId={currentPostId as string}
              agentWallet={agentInfoSage.info.wallets[0]}
              agentName={`${agentInfoSage.account?.metadata?.name} (${agentInfoSage.account?.username?.localName})`}
            />
          </ChatWindowButton>
        )}
        <section aria-labelledby="dashboard-heading" className="max-w-full md:flex items-start justify-center h-full gap-4">
          <Link
            href={returnTo ? returnTo as string : "/"}
            className="flex items-center justify-center text-secondary/60 hover:text-brand-highlight hover:bg-secondary/10 rounded-full transition-colors w-12 h-12 mt-2 md:mt-0 shrink-0"
          >
            <ArrowBack className="h-5 w-5" />
          </Link>
          <div className="flex flex-col gap-2 h-full">
            {club?.tokenAddress && <TokenInfoComponent club={club} media={safeMedia(media)} remixPostId={remixPostId} postId={publication?.id} />}
            <div className="overflow-y-hidden h-full">
              {isConnected && isLoading ? (
                <div className="flex justify-center pt-8 pb-8">
                  <Spinner customClasses="h-6 w-6" color="#5be39d" />
                </div>
              ) : (
                <>
                  {publication ? (
                    <>
                      <div className="hidden sm:block">
                        <PublicationContainer
                          publication={showRootPublication ? publication.root : publication}
                          onCommentButtonClick={onCommentButtonClick}
                          shouldGoToPublicationPage={showRootPublication}
                          isProfileAdmin={isProfileAdmin}
                          media={safeMedia(media)}
                          onCollectCallback={() => {
                            setCanComment(true);
                            refetch();
                            scrollToReplyInput();
                          }}
                          sideBySideMode={true}
                          token={{
                            address: club?.tokenAddress,
                            ticker: club?.symbol,
                          }}
                          enoughActivity={enoughActivity}
                        />
                      </div>
                      <div className="sm:hidden">
                        <PublicationContainer
                          publication={showRootPublication ? publication.root : publication}
                          onCommentButtonClick={onCommentButtonClick}
                          shouldGoToPublicationPage={showRootPublication}
                          isProfileAdmin={isProfileAdmin}
                          media={safeMedia(media)}
                          onCollectCallback={() => {
                            setCanComment(true);
                            refetch();
                            scrollToReplyInput();
                          }}
                          enoughActivity={enoughActivity}
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
                          <div className="flex items-center gap-x-2 mb-2 text-sm text-secondary/70">
                            <span>Replying to {replyingToUsername}</span>
                            <button
                              onClick={() => setReplyingToComment(null)}
                              className="text-secondary hover:text-secondary/80"
                            >
                              × Cancel
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-x-6 mt-4">
                          <img src={profilePictureUrl} alt="profile" className="w-12 h-12 rounded-full" />
                          <div className="flex items-center space-x-4 flex-1">
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
                                placeholder={canComment ? "Send a reply" : "Collect the post to participate"}
                                disabled={!canComment}
                                autoComplete="off"
                                className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 pt-4 pb-4 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                              />
                              {canComment && (
                                <div className="absolute right-2 -top-2">
                                  <GenericUploader files={files} setFiles={setFiles} contained />
                                </div>
                              )}
                            </div>
                            {canComment && (
                              <Button
                                disabled={isCommenting || !comment || !canComment}
                                onClick={submitComment}
                                variant="accentBrand"
                                size="sm"
                                className="!py-[12px]"
                              >
                                Reply
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="animate-fade-in-down">
                      {isMounted && (
                        <Publications
                          publications={showRootPublication ? [publication] : sortedComments}
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
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const postId = context.query.postId!.toString();
  let post;
  try {
    post = await getPost(postId);
  } catch { }

  if (!post) return { notFound: true };

  let media: SmartMedia | null = null;
  try {
    // Only attempt to resolve media if we have the necessary attributes
    const attributes = !post.root ? post.metadata.attributes : post.root.metadata.attributes;
    const slug = !post.root ? post.slug : post.root.slug;

    if (attributes?.some(attr => attr.key === 'template')) {
      media = await resolveSmartMedia(attributes, slug, true);
    }
  } catch {}

  const image =
    (post.metadata?.image?.item?.startsWith("lens://")
      ? await storageClient.resolve(post.metadata.image.item)
      : post.metadata?.image?.item) ?? null;

  return {
    props: {
      pageName: "singlePublication",
      media,
      image,
      rootPostId: post.root?.slug || postId,
      content: post?.metadata?.content,
      handle: post?.author.username.localName,
      postId,
    },
  };
};

export default SinglePublicationPage;
