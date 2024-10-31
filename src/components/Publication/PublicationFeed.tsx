import { useState, useEffect } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { groupBy } from "lodash/collection";
import { PostFragment } from "@lens-protocol/client";
import { useInView } from "react-intersection-observer";

import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { parsePublicationLink } from "@src/utils/utils";
import { useDecryptedGatedPosts, useGetGatedPosts } from "@src/hooks/useGetGatedPosts";
import { getGatedPostsWithNext } from "@src/services/lens/getPosts";

import PublicationContainer, { PostFragmentPotentiallyDecrypted } from "./PublicationContainer";

const PublicationFeed = ({
  welcomePostUrl,
  isAuthenticated,
  creatorProfile,
  isProfileAdmin,
  returnToPage,
}) => {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [allPosts, setAllPosts] = useState();
  const [gatedPosts, setGatedPosts] = useState();
  const [cursorPostsNext, setCursorPostsNext] = useState();
  const { data: getGatedPostsResult, isLoading: isLoadingGatedPosts } = useGetGatedPosts(creatorProfile.id);
  const {
    isLoadingCanDecrypt,
    canDecrypt,
    query: {
      data: decryptedGatedPosts,
      isLoading: isLoadingDecryptedGatedPosts,
      refetch: decryptGatedPosts,
    },
  } = useDecryptedGatedPosts(walletClient, gatedPosts);

  const [decrypting, setDecrypting] = useState(false);
  const [allPostsWithEncrypted, setAllPostsWithEncrypted] = useState<PostFragmentPotentiallyDecrypted[]>([]);
  const { ref, inView } = useInView()

  const welcomePostPublicationId = welcomePostUrl
    ? parsePublicationLink(welcomePostUrl)
    : undefined;

  // const { data: welcomePost } = useGetPost(welcomePostPublicationId);

  useEffect(() => {
    if (!isLoadingGatedPosts && getGatedPostsResult?.allPosts?.length) {
      setAllPosts(getGatedPostsResult.allPosts);
      setGatedPosts(getGatedPostsResult.gatedPosts);
      setCursorPostsNext(getGatedPostsResult.next);
    }
  }, [isLoadingGatedPosts]);

  useEffect(() => {
    if ((decrypting || canDecrypt) && !isLoadingDecryptedGatedPosts && decryptedGatedPosts?.posts?.length) {
      const grouped = groupBy(decryptedGatedPosts!.posts, 'id');
      const newPosts: PostFragmentPotentiallyDecrypted[] = allPosts?.map((publication: PostFragment) => {
        if (publication.metadata?.encryptedWith) {
          if (grouped[publication.id]?.length && grouped[publication.id][0].metadata) {
            const final = { ...publication, metadata: grouped[publication.id][0].metadata, isDecrypted: true };
            delete final.metadata.encryptedWith; // no longer needed
            return final;
          }
        }

        return publication;
      }) || [];

      setAllPostsWithEncrypted(newPosts);
    } else if (!isConnected || !isAuthenticated || (!isLoadingCanDecrypt && !isLoadingDecryptedGatedPosts && !decryptedGatedPosts?.posts?.length && !canDecrypt)) {
      setAllPostsWithEncrypted(allPosts || []);
    } else if (decryptedGatedPosts?.posts?.length === 0 && !isLoadingDecryptedGatedPosts) { // TODO: this should be the catch-all when we could not decrypt any
      setAllPostsWithEncrypted(allPosts || []);
      setDecrypting(false);
    }
  }, [allPosts, decrypting, isLoadingDecryptedGatedPosts, isLoadingCanDecrypt, canDecrypt, decryptedGatedPosts]);

  useEffect(() => {
    if (inView && !isLoadingGatedPosts && !!cursorPostsNext) {
      getGatedPostsWithNext(cursorPostsNext).then((data) => {
        setAllPosts([...allPosts!, ...data.allPosts!]);
        setGatedPosts([...gatedPosts!, ...data.gatedPosts!]);
        setCursorPostsNext(data.next!);
      });
    }
  }, [inView, isLoadingGatedPosts]);

  const handleDecryptPosts = async () => {
    setDecrypting(true);
    await decryptGatedPosts();
  };

  // if (isConnected && isAuthenticated && (isLoadingCanDecrypt || (isLoadingDecryptedGatedPosts && isAuthenticated) || isLoadingGatedPosts) && !decrypting) {
  //   return (
  //     <div className="flex justify-center pt-4">
  //       <Spinner customClasses="h-6 w-6" color="#E42101" />
  //     </div>
  //   )
  // }

  return (
    <>
      {/* {welcomePost && (
        <>
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-y-4">
            <h2 className="text-2xl font-owners tracking-wide leading-6">Pinned</h2>
          </div>
          <div className="mb-8">
            <PublicationContainer
              publication={welcomePost!}
              shouldGoToPublicationPage={true}
              isProfileAdmin={isProfileAdmin}
              setSubscriptionOpenModal={() => setOpenModal(true)}
              hasMintedBadge={hasMintedBadgeWithTokenId}
              activeSubscription={activeSubscription}
              decryptGatedPosts={handleDecryptPosts}
              decrypting={decrypting}
            />
          </div>
          <div className="my-8 border-t border-b border-dark-grey w-[90%]"></div>
        </>
      )} */}

      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-y-4 mb-4">
        <h2 className="text-2xl font-owners tracking-wide leading-6">Feed</h2>
      </div>

      {!isLoadingGatedPosts && allPosts?.length === 0 && (
        <h3 className="text-lg tracking-wide leading-6 mt-4">Nothing here.</h3>
      )}

      {!isLoadingGatedPosts && (!isLoadingCanDecrypt || !canDecrypt) && (
        <>
          {allPostsWithEncrypted?.map((publication: PostFragment) => (
            <PublicationContainer
              key={`pub-${publication.id}`}
              publication={publication}
              isProfileAdmin={isProfileAdmin}
              hasMintedBadge={''}
              decryptGatedPosts={handleDecryptPosts}
              decrypting={isConnected && isAuthenticated && (isLoadingCanDecrypt || isLoadingDecryptedGatedPosts || decrypting)}
              shouldGoToPublicationPage={true}
              returnToPage={returnToPage}
            />
          ))}
          {!!cursorPostsNext && !decrypting && allPostsWithEncrypted?.length > 0 && (
            <div ref={ref} className="flex justify-center pt-4">
              <Spinner customClasses="h-6 w-6" color="#E42101" />
            </div>
          )}
        </>
      )}
    </>
  )
};

export default PublicationFeed;