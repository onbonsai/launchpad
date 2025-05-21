import { useState, useEffect, useMemo, useRef } from "react";
import { useInView } from "react-intersection-observer";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import PublicationContainer from "../Publication/PublicationContainer";
import { useGetPostsByAuthor } from "@src/services/lens/posts";
import { Post } from "@lens-protocol/client";
import { Tabs } from "./Tabs";

const PublicationFeed = ({
  openTab,
  creatorProfile,
  isProfileAdmin,
  returnToPage,
  setOpenTab,
}) => {
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [showTabs, setShowTabs] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleScroll = () => {
      if (feedRef.current) {
        const scrollTop = feedRef.current.scrollTop;
        setShowTabs(scrollTop < 50);
      }
    };

    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (feedElement) {
        feedElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  return (
    <div className="flex flex-col flex-grow h-[calc(100vh-290px)] lg:h-[calc(100vh-120px)] w-full max-h-full">
      <div
        className={`lg:block transition-all duration-200 ease-in-out transform ${
          showTabs ? 'translate-y-0 opacity-100 h-auto mb-4' : '-translate-y-full opacity-0 h-0 mb-0'
        }`}
      >
        <Tabs openTab={openTab} setOpenTab={setOpenTab} />
      </div>
      <div
        ref={feedRef}
        className="flex flex-col flex-grow overflow-y-auto w-full max-h-full"
      >
        {isLoading && (
          <div className="flex flex-col items-center w-full bg-cardBackground rounded-3xl p-12">
            <Spinner customClasses="h-6 w-6" color="#5be39d" />
          </div>
        )}
        {!isLoading && allPosts?.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[200px] w-full bg-cardBackground rounded-3xl p-8">
            <h3 className="text-lg tracking-wide leading-6">Nothing here yet.</h3>
          </div>
        )}

        {!isLoading && allPosts?.length > 0 && (
          <div className="flex flex-col space-y-4">
            {allPosts?.map((publication: any) => (
              <PublicationContainer
                key={`pub-${publication.id}`}
                publication={publication}
                isProfileAdmin={isProfileAdmin}
                shouldGoToPublicationPage={true}
                returnToPage={returnToPage}
                mdMinWidth={'md:min-w-[200px]'}
              />
            ))}
            {hasNextPage && (
              <div ref={ref} className="flex justify-center py-4">
                <Spinner customClasses="h-6 w-6" color="#5be39d" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
};

export default PublicationFeed;