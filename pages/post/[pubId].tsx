import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import {
  Publications,
  Theme,
  formatProfilePicture,
  ActionButton,
  fetchActionModuleHandlers
} from "@madfi/widgets-react";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-hot-toast";
import { useMemo, useState, useRef, useEffect } from "react";
import { MetadataLicenseType } from "@lens-protocol/metadata";
import {
  PostFragment,
  CommentBaseFragment,
  PublicationReactionType,
  PublicationOperationsFragment,
  production,
  development,
} from "@lens-protocol/client";

import { LENS_ENVIRONMENT, lensClient } from "@src/services/lens/client";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { useDecryptedGatedPosts } from "@src/hooks/useGetGatedPosts";
import { pinFile, pinJson, storjGatewayURL } from "@src/utils/storj";
import { Button } from "@src/components/Button";
import { ConnectButton } from "@src/components/ConnectButton";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { GenericUploader } from "@src/components/ImageUploader/GenericUploader";
import useIsMounted from "@src/hooks/useIsMounted";
import { createCommentMomoka, createCommentOnchain } from "@src/services/lens/createComment";
import { useGetComments } from "@src/hooks/useGetComments";
import publicationBody from "@src/services/lens/publicationBody";
import PublicationContainer, {
  PostFragmentPotentiallyDecrypted,
} from "@src/components/Publication/PublicationContainer";
import useGetPublicationWithComments from "@src/hooks/useGetPublicationWithComments";
import { getPost } from "@src/services/lens/getPost";
import { IS_PRODUCTION, ZERO_ADDRESS } from "@src/constants/constants";
import { ChainRpcs } from "@src/constants/chains";

const SinglePublicationPage: NextPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { pubId, returnTo } = router.query;
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { signInWithLens, signingIn, isAuthenticated, authenticatedProfileId, authenticatedProfile } =
    useLensSignIn(walletClient);
  const { data: publicationWithComments, isLoading } = useGetPublicationWithComments(pubId as string);
  const { publication, comments } =
    publicationWithComments || ({} as { publication: PostFragment; comments: CommentBaseFragment[] });
  const { data: freshComments, refetch: fetchComments } = useGetComments(pubId as string, false);
  const {
    isLoadingCanDecrypt,
    canDecrypt,
    query: { data: decryptedGatedPosts, isLoading: isLoadingDecryptedGatedPosts, refetch: decryptGatedPosts },
  } = useDecryptedGatedPosts(walletClient, publication?.metadata?.encryptedWith ? [publication] : []);
  const creatorPageRoute = `/profile/${publication?.by.handle!.localName}`;
  const lensBountyRoute = `/bounties/lens/${publication?.id}`;

  const [isCommenting, setIsCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [isInputFocused, setInputFocused] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [decrypting, setDecrypting] = useState(false);
  const [publicationWithEncrypted, setPublicationWithEncrypted] = useState<
    PostFragmentPotentiallyDecrypted | undefined
  >(publication);
  const [contentURI, setContentURI] = useState("");
  const [localHasUpvoted, setLocalHasUpvoted] = useState<Set<string>>(new Set());

  const commentInputRef = useRef<HTMLInputElement>(null);
  const scrollPaddingRef = useRef<HTMLInputElement>(null);

  const goToCreatorPage = () => {
    if (returnTo === "bounty") {
      router.push(lensBountyRoute);
    } else {
      router.push(creatorPageRoute);
    }
  };

  const hasUpvotedComment = (publicationId: string): boolean => {
    const comment = (freshComments || comments).find(({ id }) => id === publicationId);
    return comment?.operations?.hasUpvoted || localHasUpvoted.has(publicationId) || false;
  };

  const getOperationsFor = (publicationId: string): PublicationOperationsFragment | undefined => {
    const comment = (freshComments || comments).find(({ id }) => id === publicationId);
    if (!comment) return;

    return {
      ...comment?.operations,
      hasUpvoted: localHasUpvoted.has(publicationId) || comment?.operations?.hasUpvoted,
    };
  };

  const isLoadingPage = useMemo(() => {
    return isLoading && (!isConnected || !isLoadingCanDecrypt);
  }, [isLoading, isConnected, isLoadingCanDecrypt]);

  const profilePictureUrl = useMemo(() => {
    if (authenticatedProfile) {
      return formatProfilePicture(authenticatedProfile).metadata.picture.url;
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

  useEffect(() => {
    if ((decrypting || canDecrypt) && decryptedGatedPosts?.posts?.length) {
      const decryptedPublication = decryptedGatedPosts.posts[0];
      const final = { ...publication, metadata: decryptedPublication.metadata, isDecrypted: true };
      delete final.metadata.encryptedWith; // no longer needed

      setDecrypting(false);
      setPublicationWithEncrypted(final);
    } else if (!decryptedGatedPosts?.posts?.length) {
      setPublicationWithEncrypted(publication);
    }
  }, [publication, decryptedGatedPosts, decrypting]);

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
          item: `ipfs://${await pinFile(file)}`,
          type: file.type,
          license: MetadataLicenseType.CCO,
          altTag: file.name ?? "MadFi",
        };
      }

      const publicationMetadata = publicationBody(
        comment,
        [attachment],
        authenticatedProfile.metadata?.displayName || authenticatedProfile.handle!.localName,
      );
      const { data: postIpfsHash } = await pinJson(publicationMetadata);

      // // handle as act() if necessary
      // if (isRewardAction) {
      //   // handle this mirror as an act to get the points (should've been a ref module :shrug:)
      //   const handler = new RewardEngagementAction(LENS_ENVIRONMENT, publication?.by?.id, publication?.id.split("-")[1], authenticatedProfile?.id);
      //   const { hasClaimed } = await handler.fetchActionModuleData({ authenticatedProfileId: authenticatedProfile?.id, connectedWalletAddress: address });
      //   // TODO: add check for limit reached (once enabled in the composer)
      //   if (!hasClaimed && handler.publicationRewarded?.actionType === "COMMENT") {
      //     await actWithActionHandler(handler, walletClient, authenticatedProfile, `ipfs://${postIpfsHash}`);
      //     setComment("");
      //     setFiles([]);

      //     toast.success("Commented", { id: toastId, duration: 3000 });

      //     setTimeout(fetchComments, 6000); // give the api some time
      //     return;
      //   }
      // }

      if (publication?.momoka) {
        await createCommentMomoka(
          walletClient,
          publication?.id,
          storjGatewayURL(`ipfs://${postIpfsHash}`), // momoka requires fast resolving
          authenticatedProfile,
        );
      } else {
        await createCommentOnchain(walletClient, publication?.id, `ipfs://${postIpfsHash}`, authenticatedProfile);
      }

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
    decryptGatedPosts();
  };

  const onLikeButtonClick = async (e: React.MouseEvent, publicationId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || hasUpvotedComment(publicationId)) return;

    await lensClient.publication.reactions.add({
      for: publicationId,
      reaction: PublicationReactionType.Upvote,
    });

    setLocalHasUpvoted(new Set([...localHasUpvoted, publicationId]));
    toast.success("Liked", { duration: 2000 });
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
    <div className="bg-background text-secondary min-h-[50vh]">
      <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <span onClick={() => goToCreatorPage()} className="link link-hover mb-4">
          ← Back
        </span>
        <section aria-labelledby="dashboard-heading" className="max-w-full md:flex justify-center">
          <div className="flex flex-col gap-y-4">
            <div className="min-w-[500px]">
              {isConnected && (canDecrypt || isLoadingCanDecrypt) && isLoadingDecryptedGatedPosts && !decrypting ? (
                <div className="flex justify-center pt-8 pb-8">
                  <Spinner customClasses="h-6 w-6" color="#E42101" />
                </div>
              ) : publicationWithEncrypted ? (
                <PublicationContainer
                  publication={publicationWithEncrypted}
                  onCommentButtonClick={onCommentButtonClick}
                  decryptGatedPosts={handleDecryptPosts}
                  decrypting={decrypting}
                  shouldGoToPublicationPage={false}
                  isProfileAdmin={isProfileAdmin}
                  setSubscriptionOpenModal={() => {}}
                />
              ) : null}
            </div>
            <div>
              <Publications
                publications={sortedComments}
                theme={Theme.dark}
                environment={LENS_ENVIRONMENT}
                authenticatedProfile={authenticatedProfile}
                hideCommentButton={true}
                hideQuoteButton={true}
                hideShareButton={true}
                hasUpvotedComment={hasUpvotedComment}
                onLikeButtonClick={onLikeButtonClick}
                getOperationsFor={getOperationsFor}
              />
            </div>
            {(!isConnected || !walletClient) && (
              <div className="flex justify-center">
                <ConnectButton className="md:px-12 mb-16" />
              </div>
            )}
            {isConnected && walletClient && !isAuthenticated && (
              <div className="flex justify-center">
                <Button className="md:px-12 mb-16" onClick={onSignInWithLensClick} disabled={signingIn}>
                  Login with Lens
                </Button>
              </div>
            )}
            {isConnected && isAuthenticated && (
              <>
                <div className="flex items-center gap-x-6 mt-4">
                  <img src={profilePictureUrl} alt="profile" className="w-12 h-12 rounded-full" />
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-8 pt-4 pb-4 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                    placeholder="Add a comment"
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                  />
                </div>
                <div className="flex justify-between gap-y-2 -mt-4">
                  <div className="ml-[72px]">
                    <GenericUploader files={files} setFiles={setFiles} />
                  </div>
                  <div className="mt-3">
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
                <div className="h-14" ref={scrollPaddingRef}></div>
              </>
            )}
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
  } catch {}

  if (!post) return { notFound: true };

  // get action module data for a hey portal
  let openActionData = null;
  if (post.openActionModules?.length) {
    const environment = IS_PRODUCTION ? production : development;
    const handlers = await fetchActionModuleHandlers(environment, post.openActionModules);
    if (handlers?.length) {
      const ActionModuleHandler = handlers[0].handler;
      const handler = new ActionModuleHandler(environment, post.by.id, pubId.split("-")[1], undefined, ChainRpcs);
      await handler.fetchActionModuleData({ connectedWalletAddress: ZERO_ADDRESS });
      openActionData = handler.getActionModuleConfig();

      // TODO: more gracefully
      if (handler.collectionId) {
        openActionData.custom = {
          collectionId: handler.collectionId.toString(),
          handle: post.by.handle.localName,
          image: handler.mintableNFTMetadata.image
        };
      }

      // console.log(openActionData)
    }
  }

  return {
    props: {
      pubId,
      handle: post?.by.handle?.localName,
      content: post?.metadata?.content,
      pageName: "singlePublication",
      openActionData,
    },
  };
};
