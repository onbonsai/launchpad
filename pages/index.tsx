import { NextPage } from "next";
import { useEffect, useMemo, useState, useRef } from "react";

import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useIsMounted from "@src/hooks/useIsMounted";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { useClubs } from "@src/context/ClubsContext";
import { useGetExplorePosts, useGetPostsByAuthor, useGetTimeline } from "@src/services/lens/posts";
import { PostCollage } from "@pagesComponents/Dashboard/PostCollage";
import { Post, TimelineItem } from "@lens-protocol/client";
import { useGetFeaturedPosts } from "@src/services/madfi/studio";
import useScrollRestoration from "@src/hooks/useScrollRestoration";
import { PostsTabs, PostTabType } from "@src/components/Publication/PostsTabs";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { useAccount, useWalletClient } from "wagmi";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import ZoraCoinsList from "@src/components/ZoraCoins";
import { useTopBaseCoins } from "@src/services/farcaster/zora";

interface TimelinePosts {
  posts: Post[];
  postData: Record<string, any>;
  pageInfo: {
    next: string | null;
  };
  nextCursor: string | null;
}

const IndexPage: NextPage = () => {
  const isMounted = useIsMounted();
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated } = useLensSignIn(walletClient);
  const { filteredClubs, setFilteredClubs, filterBy, setFilterBy, sortedBy, setSortedBy } = useClubs();
  const { isMiniApp } = useIsMiniApp();
  const hasCheckedAuth = useRef(false);

  // Initialize activeTab from localStorage or default to EXPLORE
  const [activeTab, setActiveTab] = useState<PostTabType>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('selectedPostTab');
      if (savedTab && Object.values(PostTabType).includes(savedTab as PostTabType)) {
        return savedTab as PostTabType;
      }
    }
    return isMiniApp ? PostTabType.BASE : PostTabType.EXPLORE;
  });

  const { data: authenticatedProfile, isLoading: isLoadingAuthenticatedProfile } = useAuthenticatedLensProfile();

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedPostTab', activeTab);
    }
  }, [activeTab]);

  // Check if saved tab requires authentication on mount (only once)
  useEffect(() => {
    if (isMounted && !isLoadingAuthenticatedProfile && !hasCheckedAuth.current) {
      const requiresAuth = activeTab === PostTabType.FOR_YOU || activeTab === PostTabType.COLLECTED;
      if (requiresAuth && !isAuthenticated) {
        setActiveTab(PostTabType.EXPLORE);
      }
      hasCheckedAuth.current = true;
    }
  }, [isMounted, isAuthenticated, isLoadingAuthenticatedProfile]);

  const { data: exploreData, fetchNextPage: fetchNextExplorePage, isFetchingNextPage: isFetchingNextExplorePage, hasNextPage: hasNextExplorePage, isLoading: isLoadingExplorePosts } = useGetExplorePosts({
    isLoadingAuthenticatedProfile,
    accountAddress: authenticatedProfile?.address,
    enabled: activeTab === PostTabType.EXPLORE
  });

  const { data: timelineData, fetchNextPage: fetchNextTimelinePage, isFetchingNextPage: isFetchingNextTimelinePage, hasNextPage: hasNextTimelinePage, isLoading: isLoadingTimelinePosts } = useGetTimeline({
    isLoadingAuthenticatedProfile,
    accountAddress: authenticatedProfile?.address,
    enabled: activeTab === PostTabType.FOR_YOU
  });

  const { data: baseCoins, isLoading: isLoadingBaseCoins } = useTopBaseCoins(activeTab === PostTabType.BASE);
  console.log(baseCoins)

  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useGetPostsByAuthor(activeTab === PostTabType.COLLECTED, authenticatedProfile?.address, true, true);

  const { data: featuredData, isLoading: isLoadingFeaturedPosts } = useGetFeaturedPosts(activeTab === PostTabType.EXPLORE);

  // Type assertion for data.pages
  const pages = activeTab === PostTabType.EXPLORE ? (exploreData?.pages as any) as TimelinePosts[] || [] : (timelineData?.pages as any) as TimelinePosts[] || [];

  // Update the dependency array to include data instead of pages, putting featured posts first
  const posts = useMemo(() => {
    if (activeTab !== PostTabType.EXPLORE) return pages.flatMap(page => page.posts);
    const featuredPosts = featuredData?.posts || [];
    const featuredSlugs = new Set(featuredPosts.map(post => post.slug));
    const explorePosts = pages.flatMap(page =>
      page.posts.filter(post => !featuredSlugs.has(post.slug))
    ) || [];
    return [...featuredPosts, ...explorePosts];
  }, [activeTab, activeTab === PostTabType.EXPLORE ? exploreData : timelineData, featuredData]);

  const postData = useMemo(() => ({
    ...(featuredData?.postData || {}),
    ...pages.reduce((acc, page) => ({ ...acc, ...page.postData }), {}),
    ...(activeTab === PostTabType.COLLECTED ? data?.pages?.reduce((acc: Record<string, any>, page) => ({ ...acc, ...(page as any as TimelinePosts).postData }), {}) ?? {} : {})
  }), [activeTab === PostTabType.EXPLORE ? exploreData : timelineData, featuredData, data]);

  useScrollRestoration('posts-page-scroll', isMounted && !isLoadingExplorePosts && !isLoadingTimelinePosts && !isLoadingFeaturedPosts && posts.length > 0, 50);

  // fix hydration issues
  if (!isMounted) return null;
  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <main className="mx-auto max-w-full md:max-w-[100rem] px-2 sm:px-6 lg:px-8 md:pt-6 pt-4">
          <section aria-labelledby="dashboard-heading" className="pt-0 pb-24 max-w-full">
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-10 max-w-full">
              <div className="lg:col-span-10 max-w-full">
                {!isMiniApp && (
                  <PostsTabs activeTab={activeTab} onTabChange={setActiveTab} isAuthenticated={isAuthenticated} />
                )}
                {/* Render top zora coins */}
                {isMiniApp && (
                  <div className="mb-6">
                    <ZoraCoinsList />
                  </div>
                )}
                {(isLoadingExplorePosts || isLoadingTimelinePosts || isLoadingFeaturedPosts || isLoading || isLoadingAuthenticatedProfile)
                  ? <div className="flex justify-center pt-8"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>
                  : <PostCollage
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    posts={activeTab === PostTabType.COLLECTED
                      ? data?.pages?.flatMap(page => (page as any as TimelinePosts).posts) ?? []
                      : activeTab === PostTabType.EXPLORE
                        ? posts as Post[] ?? []
                        : posts as any[]}
                    postData={activeTab === PostTabType.COLLECTED
                      ? data?.pages?.reduce((acc: Record<string, any>, page) => ({ ...acc, ...(page as any as TimelinePosts).postData }), {}) ?? {}
                      : postData}
                    setFilteredPosts={setFilteredClubs}
                    filteredPosts={filteredClubs}
                    filterBy={filterBy}
                    setFilterBy={setFilterBy}
                    isLoading={isLoadingExplorePosts || isLoadingTimelinePosts || isFetchingNextExplorePage || isFetchingNextTimelinePage || isLoading || isFetchingNextPage || isLoadingAuthenticatedProfile}
                    hasMore={activeTab === PostTabType.COLLECTED
                      ? hasNextPage
                      : activeTab === PostTabType.EXPLORE
                        ? hasNextExplorePage
                        : hasNextTimelinePage}
                    fetchNextPage={activeTab === PostTabType.COLLECTED
                      ? fetchNextPage
                      : activeTab === PostTabType.EXPLORE
                        ? fetchNextExplorePage
                        : fetchNextTimelinePage}
                    isLoadingForYou={isLoadingTimelinePosts}
                    isLoadingExplore={isLoadingExplorePosts}
                    isLoadingCollected={isLoading}
                  />
                }
              </div>
            </div>
          </section>


        </main>
      </div>
    </div>
  );
};

export default IndexPage;
