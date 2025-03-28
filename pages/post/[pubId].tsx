import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import {
  Publications,
  Theme,
  ActionButton,
} from "@madfi/widgets-react";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-hot-toast";
import { useMemo, useState, useRef, useEffect } from "react";
import { MetadataLicenseType } from "@lens-protocol/metadata";

import { LENS_ENVIRONMENT, storageClient } from "@src/services/lens/client";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { pinFile, pinJson, storjGatewayURL } from "@src/utils/storj";
import { Button } from "@src/components/Button";
import { ConnectButton } from "@src/components/ConnectButton";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { GenericUploader } from "@src/components/ImageUploader/GenericUploader";
import useIsMounted from "@src/hooks/useIsMounted";
import { useGetComments } from "@src/hooks/useGetComments";
import PublicationContainer from "@src/components/Publication/PublicationContainer";
import useGetPublicationWithComments from "@src/hooks/useGetPublicationWithComments";
import { getPost } from "@src/services/lens/posts";
import { imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, publicationContainerStyleOverride, shareContainerStyleOverride, commentPublicationProfilePictureStyle, commentTextContainerStyleOverrides, commentReactionsContainerStyleOverride, commentProfileNameStyleOverride, commentDateStyleOverride } from "@src/components/Publication/PublicationStyleOverrides";
import { sendLike } from "@src/services/lens/getReactions";
import { postId, uri } from "@lens-protocol/client";
import { resumeSession } from "@src/hooks/useLensLogin";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { getProfileImage } from "@src/services/lens/utils";
import { resolveSmartMedia, SmartMedia } from "@src/services/madfi/studio";
import { createPost, uploadFile } from "@src/services/lens/createPost";
import { useRegisteredClubByToken } from "@src/hooks/useMoneyClubs";
import { TokenInfoComponent } from "@pagesComponents/Post/TokenInfoComponent";

const SinglePublicationPage: NextPage<{ media: SmartMedia }> = ({ media }) => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { pubId, returnTo } = router.query;
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { signInWithLens, signingIn, isAuthenticated, authenticatedProfileId, authenticatedProfile } =
    useLensSignIn(walletClient);
  const { data: publicationWithComments, isLoading } = useGetPublicationWithComments(pubId as string);
  const { publication, comments } =
    publicationWithComments || ({} as { publication: any; comments: any[] });
  const { data: club } = useRegisteredClubByToken(media?.token?.address, media?.token?.chain);
  const { data: freshComments, refetch: fetchComments } = useGetComments(pubId as string, false);
  const creatorPageRoute = `/profile/${publication?.author.username.localName}`;

  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [isInputFocused, setInputFocused] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [localHasUpvoted, setLocalHasUpvoted] = useState<Set<string>>(new Set());
  const [canComment, setCanComment] = useState(publication?.operations?.hasSimpleCollected);
  const [replyingToComment, setReplyingToComment] = useState<string | null>(null);
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(null);

  const commentInputRef = useRef<HTMLInputElement>(null);
  const scrollPaddingRef = useRef<HTMLInputElement>(null);

  const goToPage = () => {
    router.push(returnTo ? returnTo as string : creatorPageRoute);
  };

  const hasUpvotedComment = (publicationId: string): boolean => {
    const comment = (freshComments || comments).find(({ id }) => id === publicationId);
    return comment?.operations?.hasUpvoted || localHasUpvoted.has(publicationId) || false;
  };

  const getOperationsFor = (publicationId: string): any | undefined => {
    const comment = (freshComments || comments).find(({ id }) => id === publicationId);
    if (!comment) return;

    return {
      ...comment?.operations,
      hasUpvoted: localHasUpvoted.has(publicationId) || comment?.operations?.hasUpvoted,
    };
  };

  useEffect(() => {
    setCanComment(publication?.operations?.hasSimpleCollected);
  }, [publication]);

  const isLoadingPage = useMemo(() => {
    return isLoading
  }, [isLoading, isConnected]);

  const profilePictureUrl = useMemo(() => {
    if (authenticatedProfile) {
      return getProfileImage(authenticatedProfile)
    }
  }, [authenticatedProfile]);

  const sortedComments = useMemo(() => {
    return (freshComments || comments || []).slice().sort((a, b) => {
      // Sort by upvoteReactions descending
      if (b.stats.upvoteReactions !== a.stats.upvoteReactions) {
        return b.stats.upvoteReactions - a.stats.upvoteReactions;
      }

      // If upvoteReactions are equal, sort by createdAt ascending
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [freshComments, comments]);

  // TODO: handle our other modules
  // const isRewardAction = useMemo(() => {
  //   let rewardAction;
  //   if (publication?.__typename === "Post") {
  //     rewardAction = publication?.openActionModules?.find(
  //       ({ contract }) => contract.address.toLowerCase() === REWARD_ENGAGEMENT_ACTION_MODULE.toLowerCase(),
  //     );
  //   }

  //   return rewardAction ? true : false;
  // }, [publication]);

  const isProfileAdmin = useMemo(() => {
    if (!(publication?.by && authenticatedProfileId)) return false;

    return publication?.by.id === authenticatedProfileId;
  }, [publication, authenticatedProfileId]);

  const onCommentButtonClick = (e: React.MouseEvent, commentId?: string, username?: string) => {
    e.preventDefault();

    // if (isInputFocused) return;

    setReplyingToComment(commentId || null);
    setReplyingToUsername(username || null);
    if (commentInputRef.current) commentInputRef.current.focus();
    if (scrollPaddingRef.current) scrollPaddingRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!authenticatedProfile) throw new Error("no authenticated profile!");

    setIsCommenting(true);

    const toastId = toast.loading("Sending reply...");
    try {
      let asset = {};
      if (files?.length) {
        asset = await uploadFile(files[0]);
      }

      const sessionClient = await resumeSession();
      if (!sessionClient) return;

      await createPost(
        sessionClient,
        walletClient,
        { text: comment, ...asset },
        replyingToComment || pubId as string
      );

      setComment("");
      setFiles([]);
      setReplyingToComment(null);

      toast.success("Sent", { id: toastId, duration: 3000 });

      setTimeout(fetchComments, 3000);
    } catch (error) {
      console.log(error);
      toast.error("Comment failed", { duration: 5000, id: toastId });
    }

    setIsCommenting(false);
  };

  const onSignInWithLensClick = async (e) => {
    e.preventDefault();

    signInWithLens();
  };

  const onLikeButtonClick = async (e: React.MouseEvent, publicationId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasUpvotedComment(publicationId)) return;

    await sendLike(publication.slug);

    setLocalHasUpvoted(new Set([...localHasUpvoted, publicationId]));
    toast.success("Liked", { duration: 2000 });
  };

  const goToCreatorPage = (e: React.MouseEvent, username?: string) => {
    e.preventDefault();
    e.stopPropagation();
    // router.push(`/post/${_publicationId}${returnToPage ? `?returnTo=${encodeURIComponent(returnToPage!) }` : ''}`);
    router.push(`/profile/${username}`);
  };

  if (!isMounted) return null;

  if (isLoadingPage)
    return (
      <div className="bg-background text-secondary min-h-[50vh]">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-28 pb-4">
          <div className="flex justify-center">
            <Spinner customClasses="h-6 w-6" color="#E42101" />
          </div>
        </main>
      </div>
    );

  const CommentBox = () => {
    return (<>
      {
        (!isConnected || !walletClient) && (
          <div className="flex justify-center">
            <ConnectButton className="md:px-12 mb-16" />
          </div>
        )
      }
      {
        isConnected && walletClient && !isAuthenticated && (
          <div className="flex justify-center">
            <Button className="md:px-12 mb-16" onClick={onSignInWithLensClick} disabled={signingIn}>
              Login with Lens
            </Button>
          </div>
        )
      }
      {
        isConnected && isAuthenticated && (
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
              <div className="relative w-full">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 pt-4 pb-4 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                  placeholder={canComment ? "Participate by replying" : "Collect the post to participate"}
                  disabled={!canComment}
                  onFocus={() => setInputFocused(true)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setInputFocused(false);
                    }
                  }}
                  autoFocus={isInputFocused}
                />
                {canComment && (
                  <div className="absolute right-2 -top-2">
                    <GenericUploader files={files} setFiles={setFiles} contained />
                  </div>
                )}
              </div>
            </div>
            {canComment && (
              <>
                <div className="flex justify-end gap-y-2">
                  <div className="mt-3">
                    <Button
                      disabled={isCommenting || !comment || !canComment}
                      onClick={submitComment}
                      variant="accentBrand"
                      size="sm"
                    >
                      Reply
                    </Button>
                  </div>
                </div>
                <div className="h-14" ref={scrollPaddingRef}></div>
              </>
            )}
          </>
        )
      }
    </>);
  }

  return (
    <div className="bg-background text-secondary min-h-[50vh] max-h-[100%] overflow-hidden h-full">
      <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-8 pb-4 h-full">
        <span onClick={goToPage} className="link link-hover mb-4">
          ← Back
        </span>
        <section aria-labelledby="dashboard-heading" className="max-w-full md:flex justify-center h-full">
          <div className="flex flex-col gap-2 h-full">
            {club?.tokenAddress && <TokenInfoComponent club={club} media={media} />}
            <div className="overflow-y-hidden h-full">
              {isConnected && isLoading ? (
                <div className="flex justify-center pt-8 pb-8">
                  <Spinner customClasses="h-6 w-6" color="#E42101" />
                </div>
              ) : (
                publication ? <>
                  <div className="hidden sm:block">
                    <PublicationContainer
                      publication={publication}
                      onCommentButtonClick={onCommentButtonClick}
                      shouldGoToPublicationPage={false}
                      isProfileAdmin={isProfileAdmin}
                      media={media}
                      onCollectCallback={() => setCanComment(true)}
                      sideBySideMode={true}
                    //   nestedWidget={<div className=""><Publications
                    //     publications={sortedComments}
                    //     theme={Theme.dark}
                    //     environment={LENS_ENVIRONMENT}
                    //     authenticatedProfile={authenticatedProfile}
                    //     hideCommentButton={false}
                    //     hideQuoteButton={true}
                    //     hideShareButton={true}
                    //     hasUpvotedComment={hasUpvotedComment}
                    //     onLikeButtonClick={onLikeButtonClick}
                    //     getOperationsFor={getOperationsFor}
                    //     profilePictureStyleOverride={commentPublicationProfilePictureStyle}
                    //     containerBorderRadius={'24px'}
                    //     containerPadding={'12px'}
                    //     profilePadding={'0 0 0 0'}
                    //     textContainerStyleOverride={commentTextContainerStyleOverrides}
                    //     backgroundColorOverride={'rgba(255,255,255, 0.08)'}
                    //     mediaImageStyleOverride={mediaImageStyleOverride}
                    //     imageContainerStyleOverride={imageContainerStyleOverride}
                    //     reactionsContainerStyleOverride={commentReactionsContainerStyleOverride}
                    //     reactionContainerStyleOverride={reactionContainerStyleOverride}
                    //     publicationContainerStyleOverride={publicationContainerStyleOverride}
                    //     shareContainerStyleOverride={shareContainerStyleOverride}
                    //     profileNameStyleOverride={commentProfileNameStyleOverride}
                    //     dateNameStyleOverride={commentDateStyleOverride}
                    //     markdownStyleBottomMargin={'0px'}
                    //     heartIconOverride={true}
                    //     messageIconOverride={true}
                    //     shareIconOverride={true}
                    //     followButtonDisabled={true}
                    //   />
                    //   <CommentBox />
                    // </div>}
                    />
                  </div>
                  <div className="sm:hidden">
                    <PublicationContainer
                      publication={publication}
                      onCommentButtonClick={onCommentButtonClick}
                      shouldGoToPublicationPage={false}
                      isProfileAdmin={isProfileAdmin}
                      media={media}
                      onCollectCallback={() => setCanComment(true)}
                    />
                  </div>
                </> : <div className="flex justify-center pt-8 pb-8">
                  <Spinner customClasses="h-6 w-6" color="#E42101" />
                </div>
              )}
            </div>
            <div className="">
              <Publications
                onCommentButtonClick={onCommentButtonClick}
                publications={sortedComments}
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
              />
              <div className="mt-4">
                <CommentBox />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SinglePublicationPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const pubId = context.query.pubId!.toString();
  let post;
  try {
    post = await getPost(pubId);
  } catch { }

  if (!post) return { notFound: true };
  const media = await resolveSmartMedia(post.metadata.attributes, post.slug, false);


  const image =
    (post.metadata?.image?.item?.startsWith("lens://")
      ? await storageClient.resolve(post.metadata.image.item)
      : post.metadata?.image?.item) ?? null;

  return {
    props: {
      pubId,
      handle: post?.author.username.localName,
      content: post?.metadata?.content,
      image: image,
      pageName: "singlePublication",
      media: media,
    },
  };
};
