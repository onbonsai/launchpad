import { useState, useEffect } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { groupBy } from "lodash/collection";
import { PostFragment } from "@lens-protocol/client";
import { useInView } from "react-intersection-observer";

import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { parsePublicationLink } from "@src/utils/utils";

import PublicationContainer, { PostFragmentPotentiallyDecrypted } from "./PublicationContainer";
import { useGetPostsByAuthor } from "@src/services/lens/posts";
const PublicationFeed = ({
  welcomePostUrl,
  isAuthenticated,
  creatorProfile,
  isProfileAdmin,
  returnToPage,
}) => {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [cursorPostsNext, setCursorPostsNext] = useState();
  const { data: getPostsResult, isLoading: isLoadingPosts } = useGetPostsByAuthor(creatorProfile.address);
  const { ref, inView } = useInView()

  const welcomePostPublicationId = welcomePostUrl
    ? parsePublicationLink(welcomePostUrl)
    : undefined;

  // const { data: welcomePost } = useGetPost(welcomePostPublicationId);

  useEffect(() => {
    if (!isLoadingPosts && getPostsResult?.length) {
      setAllPosts(getPostsResult);
    }
  }, [isLoadingPosts]);

  // TODO: enable pagination
  // useEffect(() => {
  //   if (inView && !isLoadingPosts && !!cursorPostsNext) {
  //     getGatedPostsWithNext(cursorPostsNext).then((data) => {
  //       setAllPosts([...allPosts!, ...data.allPosts!]);
  //       setCursorPostsNext(data.next!);
  //     });
  //   }
  // }, [inView, isLoadingPosts]);

  // if (isConnected && isAuthenticated && (isLoadingCanDecrypt || (isLoadingDecryptedGatedPosts && isAuthenticated) || isLoadingGatedPosts) && !decrypting) {
  //   return (
  //     <div className="flex justify-center pt-4">
  //       <Spinner customClasses="h-6 w-6" color="#E42101" />
  //     </div>
  //   )
  // }

  return (
    <div className="flex flex-col flex-grow overflow-y-auto h-[calc(100vh-290px)] lg:h-[calc(100vh-120px)]">
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

      {/* <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-y-4 mt-3">
        <h2 className="text-2xl font-sans tracking-[-0.01] font-bold leading-7">Feed</h2>
      </div> */}

      {!isLoadingPosts && allPosts?.length === 0 && (
        <h3 className="text-lg tracking-wide leading-6 mt-4">Nothing here.</h3>
      )}

      {!isLoadingPosts && allPosts?.length > 0 && (
        <>
          {allPosts?.map((publication: any) => (
            <PublicationContainer
              key={`pub-${publication.id}`}
              publication={publication}
              isProfileAdmin={isProfileAdmin}
              hasMintedBadge={''}
              shouldGoToPublicationPage={true}
              returnToPage={returnToPage}
            />
          ))}
          {/* {!!cursorPostsNext && !decrypting && allPostsWithEncrypted?.length > 0 && (
            <div ref={ref} className="flex justify-center pt-4">
              <Spinner customClasses="h-6 w-6" color="#E42101" />
            </div>
          )} */}
        </>
      )}
    </div>
  )
};

export default PublicationFeed;