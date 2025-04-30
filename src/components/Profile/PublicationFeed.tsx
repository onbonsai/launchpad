import { useState, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import PublicationContainer from "../Publication/PublicationContainer";
import { useGetPostsByAuthor } from "@src/services/lens/posts";
import { Post } from "@lens-protocol/client";

const PublicationFeed = ({
  openTab,
  creatorProfile,
  isProfileAdmin,
  returnToPage,
}) => {
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const getPostsCollected = openTab === 2;
  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useGetPostsByAuthor(true, creatorProfile.address, getPostsCollected);
  const posts = useMemo(() => data?.pages.flatMap(page => page.posts) || [], [isLoading, getPostsCollected]);
  const { ref, inView } = useInView()

  useEffect(() => {
    if (!isLoading && posts?.length) {
      setAllPosts(posts as Post[]);
    }
  }, [isLoading, posts, getPostsCollected]);

  useEffect(() => {
    if (inView && !isLoading && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, isLoading, hasNextPage, fetchNextPage]);

  return (
    <div className="flex flex-col flex-grow overflow-y-auto h-[calc(100vh-290px)] lg:h-[calc(100vh-120px)] w-full">
      {isLoading && (
        <div className="flex flex-col items-center w-full bg-cardBackground rounded-3xl p-12">
          <Spinner customClasses="h-6 w-6" color="#5be39d" />
        </div>
      )}
      {!isLoading && allPosts?.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full w-full bg-cardBackground rounded-3xl p-8">
          <h3 className="text-lg tracking-wide leading-6">Nothing here yet.</h3>
        </div>
      )}

      {!isLoading && allPosts?.length > 0 && (
        <>
          {allPosts?.map((publication: any) => (
            <PublicationContainer
              key={`pub-${publication.id}`}
              publication={publication}
              isProfileAdmin={isProfileAdmin}
              shouldGoToPublicationPage={true}
              returnToPage={returnToPage}
            />
          ))}
          {hasNextPage && (
            <div ref={ref} className="flex justify-center pt-4">
              <Spinner customClasses="h-6 w-6" color="#5be39d" />
            </div>
          )}
        </>
      )}
    </div>
  )
};

export default PublicationFeed;