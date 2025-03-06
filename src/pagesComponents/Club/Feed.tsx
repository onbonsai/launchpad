import { useRouter } from "next/router";
import {
  Publications,
  Theme,
  ActionButton,
} from "@madfi/widgets-react";
import { useAccount, useWalletClient, useSwitchChain } from "wagmi";
import { toast } from "react-hot-toast";
import { useMemo, useState, useRef, useEffect } from "react";
import { MetadataLicenseType } from "@lens-protocol/metadata";
import {
  PostFragment,
  uri,
} from "@lens-protocol/client";

import { LENS_ENVIRONMENT, lensClient, storageClient } from "@src/services/lens/client";
import useLensSignIn from "@src/hooks/useLensSignIn";
// import { useDecryptedGatedPosts } from "@src/hooks/useGetGatedPosts";
import { pinFile, pinJson, storjGatewayURL } from "@src/utils/storj";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { GenericUploader } from "@src/components/ImageUploader/GenericUploader";
import useIsMounted from "@src/hooks/useIsMounted";
import { createCommentMomoka, createCommentOnchain } from "@src/services/lens/createComment";
import { useGetComments } from "@src/hooks/useGetComments";
import PublicationContainer, {
  PostFragmentPotentiallyDecrypted,
} from "@src/components/Publication/PublicationContainer";
import useGetPublicationWithComments from "@src/hooks/useGetPublicationWithComments";
// import { actWithActionHandler } from "@src/services/madfi/rewardEngagementAction";
import { followProfile } from "@src/services/lens/follow";
import { polygon } from "viem/chains";
import clsx from "clsx";
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, publicationContainerStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides } from "@src/components/Publication/PublicationStyleOverrides";
import { resumeSession } from "@src/hooks/useLensLogin";
import { addReaction, post } from "@lens-protocol/client/actions";
import { postId as formatPostId } from "@lens-protocol/client";
import { sendLike } from "@src/services/lens/getReactions";
import { getProfileImage } from "@src/services/lens/utils";
import { handleOperationWith } from "@lens-protocol/client/viem";

export const Feed = ({ postId, morePadding = false }) => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const { signInWithLens, signingIn, isAuthenticated, authenticatedProfileId, authenticatedProfile } =
    useLensSignIn(walletClient);
  const { data: publicationWithComments, isLoading } = useGetPublicationWithComments(postId as string);
  const { publication, comments } =
    publicationWithComments || ({} as { publication: any; comments: any[] });
  const { data: freshComments, refetch: fetchComments } = useGetComments(postId as string, false);
  // const {
  //   isLoadingCanDecrypt,
  //   canDecrypt,
  //   query: { data: decryptedGatedPosts, isLoading: isLoadingDecryptedGatedPosts, refetch: decryptGatedPosts },
  // } = useDecryptedGatedPosts(walletClient, publication?.metadata?.encryptedWith ? [publication] : []);

  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [isInputFocused, setInputFocused] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [decrypting, setDecrypting] = useState(false);
  // const [publicationWithEncrypted, setPublicationWithEncrypted] = useState<
  //   PostFragmentPotentiallyDecrypted | undefined
  // >(publication);
  const [contentURI, setContentURI] = useState("");
  const [localHasUpvoted, setLocalHasUpvoted] = useState<Set<string>>(new Set());

  const commentInputRef = useRef<HTMLInputElement>(null);
  const scrollPaddingRef = useRef<HTMLInputElement>(null);

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

  const isLoadingPage = useMemo(() => {
    return isLoading && (!isConnected);
  }, [isLoading, isConnected]);

  const profilePictureUrl = useMemo(() => {
    if (authenticatedProfile) {
      return getProfileImage(authenticatedProfile)
    }
  }, [authenticatedProfile]);

  const goToProfile = (e: React.MouseEvent, handleLocalName: string) => {
    e.preventDefault();
    e.stopPropagation();
    // router.push(`/post/${_publicationId}${returnToPage ? `?returnTo=${encodeURIComponent(returnToPage!) }` : ''}`);
    router.push(`/profile/${handleLocalName}`);
  };

  const sortedComments = useMemo(() => {
    return (freshComments || comments || []).slice().sort((a, b) => {
      // Sort by upvoteReactions descending
      if (b.stats.upvoteReactions !== a.stats.upvoteReactions) {
        return b.stats.upvoteReactions - a.stats.upvoteReactions;
      }

      // If upvoteReactions are equal, sort by createdAt ascending
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }, [freshComments, comments]);

  // useEffect(() => {
  //   if ((decrypting || canDecrypt) && decryptedGatedPosts?.posts?.length) {
  //     const decryptedPublication = decryptedGatedPosts.posts[0];
  //     const final = { ...publication, metadata: decryptedPublication.metadata, isDecrypted: true };
  //     delete final.metadata.encryptedWith; // no longer needed

  //     setDecrypting(false);
  //     setPublicationWithEncrypted(final);
  //   } else if (!decryptedGatedPosts?.posts?.length) {
  //     setPublicationWithEncrypted(publication);
  //   }
  // }, [publication, decryptedGatedPosts, decrypting]);

  // TODO: any new modules
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

  const onCommentButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isInputFocused) return;

    if (commentInputRef.current) commentInputRef.current.focus();
    if (scrollPaddingRef.current) scrollPaddingRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!authenticatedProfile) throw new Error("no authenticated profile!");

    setIsCommenting(true);

    const toastId = toast.loading("Preparing comment...");
    try {
      let attachment;
      if (files?.length) {
        // can only be one
        const file = files[0];
        attachment = {
          item: storjGatewayURL(await pinFile(file)),
          type: file.type,
          license: MetadataLicenseType.CCO,
          altTag: file.name ?? "comment_img",
        };
      }

      const metadata = publicationBody(
        comment,
        [attachment],
        authenticatedProfile.username.localName
      );
      const { uri: contentUri } = await storageClient.uploadAsJson(metadata);

      const sessionClient = await resumeSession();
      if (!sessionClient) return;

      const result = await post(sessionClient, {
        contentUri: uri(contentUri),
        commentOn: {
          post: postId(publication.slug),
        },
      }).andThen(handleOperationWith(walletClient));

      setComment("");
      setFiles([]);

      toast.success("Commented", { id: toastId, duration: 3000 });

      setTimeout(fetchComments, 6000); // give the api some time
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

  const handleDecryptPosts = () => {
    setDecrypting(true);
    // decryptGatedPosts();
  };

  const onLikeButtonClick = async (e: React.MouseEvent, publicationId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasUpvotedComment(publicationId)) return;

    const sessionClient = await resumeSession();
    if (!sessionClient) return;

    await sendLike(publication.slug);

    setLocalHasUpvoted(new Set([...localHasUpvoted, publicationId]));
    toast.success("Liked", { duration: 2000 });
  };

  // TODO: only for lens profiles
  const onFollowClick = async (e: React.MouseEvent, profileId: string) => {
    e.preventDefault();

    if (!isAuthenticated) return;

    if (chainId !== polygon.id && switchChain) {
      try {
        await switchChain({ chainId: polygon.id });
      } catch {
        toast.error("Please switch networks");
      }
      return;
    }

    const toastId = toast.loading("Following...");
    try {
      await followProfile(walletClient, profileId);

      // TODO: update state for the comment

      toast.success("Followed", { id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed", { id: toastId });
    }
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

  return (
    <div className="flex flex-col items-center relative h-full w-full">
      <div className="flex flex-col items-center gap-y-1 overflow-y-auto h-full w-full md:pb-0">
        <div className="w-full max-w-[500px]">
          {isConnected && isLoading ? (
            <div className="flex justify-center pt-8 pb-8">
              <Spinner customClasses="h-6 w-6" color="#E42101" />
            </div>
          ) : publication ? (
            <PublicationContainer
              publication={publication}
              onCommentButtonClick={onCommentButtonClick}
              decryptGatedPosts={handleDecryptPosts}
              decrypting={decrypting}
              shouldGoToPublicationPage={false}
              isProfileAdmin={isProfileAdmin}
              setSubscriptionOpenModal={() => { }}
              hideQuoteButton
              hideFollowButton={false}
            />
          ) : null}
        </div>
        <div className="w-full max-w-[500px] space-y-1">
          <Publications
            publications={sortedComments}
            theme={Theme.dark}
            environment={LENS_ENVIRONMENT}
            authenticatedProfile={authenticatedProfile}
            hideCommentButton={true}
            hideQuoteButton={true}
            hideShareButton={true}
            hideFollowButton={false}
            hasUpvotedComment={hasUpvotedComment}
            onLikeButtonClick={onLikeButtonClick}
            getOperationsFor={getOperationsFor}
            followButtonDisabled={!isConnected}
            onFollowPress={onFollowClick}
            onProfileClick={goToProfile}
            profilePictureStyleOverride={publicationProfilePictureStyle}
            containerBorderRadius={'24px'}
            containerPadding={'12px 12px 0 12px'}
            profilePadding={'0 0 0 0'}
            textContainerStyleOverride={textContainerStyleOverrides}
            backgroundColorOverride={'rgba(255,255,255, 0.08)'}
            mediaImageStyleOverride={mediaImageStyleOverride}
            imageContainerStyleOverride={imageContainerStyleOverride}
            reactionsContainerStyleOverride={reactionsContainerStyleOverride}
            reactionContainerStyleOverride={reactionContainerStyleOverride}
            publicationContainerStyleOverride={publicationContainerStyleOverride}
            shareContainerStyleOverride={shareContainerStyleOverride}
            markdownStyleBottomMargin={'0'}
            heartIconOverride={true}
            messageIconOverride={true}
            shareIconOverride={true}
          />
        </div>

        {/* {isConnected && isAuthenticated && publicationWithEncrypted && (
          <div className={clsx("w-full max-w-[500px] pt-4 bg-background  md:pb-2")}>
            <div className="flex items-center gap-x-6 w-full relative">
              <img src={profilePictureUrl} alt="profile" className="w-12 h-12 rounded-full" />
              <textarea
                ref={commentInputRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="block w-full resize-none rounded-xl bg-card text-secondary placeholder:text-secondary/70 border-transparent pr-8 pt-4 pb-4 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                placeholder="Add a comment"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
              <div className="absolute right-2 top-2">
                <GenericUploader files={files} setFiles={setFiles} />
              </div>
            </div>
            <div className="flex justify-between gap-y-2 -mt-4">
              <div className="mt-4">
                <ActionButton
                  label="Comment"
                  disabled={isCommenting || !comment}
                  onClick={submitComment}
                  theme={Theme.dark}
                  backgroundColor={comment ? "#EEEDED" : "transparent"}
                  textColor={comment ? undefined : "#EEEDED"}
                />
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};
