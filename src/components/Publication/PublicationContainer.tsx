import { useState } from "react";
import { LockClosedIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useWalletClient, useAccount } from "wagmi";
import { PostFragment, PublicationReactionType } from "@lens-protocol/client"
import { Publication, Theme } from "@madfi/widgets-react";

import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { Button } from "@src/components/Button";
import { MADFI_POST_URL, MADFI_BANNER_IMAGE_SMALL } from "@src/constants/constants";
import { LENS_ENVIRONMENT, lensClient } from "@src/services/lens/client";
import { createMirrorMomoka, createMirrorOnchain } from "@src/services/lens/createMirror";
import { ChainRpcs } from "@src/constants/chains";
import { pinFile, storjGatewayURL, pinJson } from "@src/utils/storj";
import publicationBody from "@src/services/lens/publicationBody";

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
}: PublicationContainerProps) => {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const {
    isAuthenticated,
    authenticatedProfile,
  } = useLensSignIn(walletClient);
  const [hasUpvoted, setHasUpvoted] = useState<boolean>(publication?.operations?.hasUpvoted || false);
  const [hasMirrored, setHasMirrored] = useState<boolean>(publication?.operations?.hasMirrored || false);

  if (!(publicationId || publication)) throw new Error('Need publicationId or publication');
  if (publication?.metadata.encryptedWith && !decryptGatedPosts) throw new Error('Encrypted publication needs fn decryptGatedPosts');

  const _publicationId = publication?.id || publicationId!;

  const onShareButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    navigator.clipboard.writeText(`${MADFI_POST_URL}/${_publicationId}`);

    toast("Link copied to clipboard", { position: "bottom-center", icon: "🔗", duration: 2000 });
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
    router.push(`/profile/${publication?.by?.handle?.localName}`);
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

    await lensClient.publication.reactions.add({
      for: _publicationId,
      reaction: PublicationReactionType.Upvote,
    });

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

  const handlePinMetadata = async (content, files): Promise<string> => {
    let toastId;
    let attachments: any[] = [];

    if (files.length > 0) {
      toastId = toast.loading("Uploading content...", { id: toastId });
      try {
        const cids = await Promise.all(
          files.map(async (file: any, idx: number) => ({
            item: `ipfs://${await pinFile(file)}`,
            type: file.type,
            altTag: file.name || `attachment_${idx}`,
          })),
        );
        attachments = attachments.concat(cids);
      } catch (error) {
        console.log(error);
        toast.dismiss(toastId);
        return '';
      }
    }

    const publicationMetadata = publicationBody(
      content,
      attachments,
      authenticatedProfile!.metadata?.displayName || authenticatedProfile!.handle!.suggestedFormatted.localName
    );

    const { data: postIpfsHash } = await pinJson(publicationMetadata);

    if (toastId) toast.dismiss(toastId);

    return storjGatewayURL(postIpfsHash);
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
        handlePinMetadata={handlePinMetadata}
        onActButtonClick={onActButtonClick}
        renderActButtonWithCTA={renderActButtonWithCTA}
      />
      {publication?.metadata.encryptedWith && decryptGatedPosts && (
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
      )}
    </div>
  )
};

export default PublicationContainer;