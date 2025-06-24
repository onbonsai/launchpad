import { NextPage } from "next";
import { useEffect, useMemo, useState } from "react";

import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useIsMounted from "@src/hooks/useIsMounted";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { Modal } from "@src/components/Modal";
import BuyBonsaiModal from "@src/components/BuyBonsai/BuyBonsaiModal";
import { useClubs } from "@src/context/ClubsContext";
import { useGetExplorePosts, useGetPostsByAuthor, useGetTimeline } from "@src/services/lens/posts";
import { PostCollage } from "@pagesComponents/Dashboard/PostCollage";
import { Post, TimelineItem } from "@lens-protocol/client";
import { useGetFeaturedPosts } from "@src/services/madfi/studio";
import useScrollRestoration from "@src/hooks/useScrollRestoration";
import { PostsTabs, PostTabType } from "@src/components/Publication/PostsTabs";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { useWalletClient } from "wagmi";

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
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated } = useLensSignIn(walletClient);
  const { filteredClubs, setFilteredClubs, filterBy, setFilterBy, sortedBy, setSortedBy } = useClubs();
  const [openBuyModal, setOpenBuyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<PostTabType>(isAuthenticated ? PostTabType.FOR_YOU : PostTabType.EXPLORE);
  const { data: authenticatedProfile, isLoading: isLoadingAuthenticatedProfile } = useAuthenticatedLensProfile();

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

  const {
    data,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useGetPostsByAuthor(activeTab === PostTabType.COLLECTED, authenticatedProfile?.address, true, true);

  const { data: featuredData, isLoading: isLoadingFeaturedPosts } = useGetFeaturedPosts(activeTab === PostTabType.EXPLORE);

  // Type assertion for data.pages
  const pages = activeTab === PostTabType.EXPLORE ? exploreData?.pages as TimelinePosts[] || [] : timelineData?.pages as TimelinePosts[] || [];

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
    ...(activeTab === PostTabType.COLLECTED ? data?.pages?.reduce((acc: Record<string, any>, page) => ({ ...acc, ...(page as TimelinePosts).postData }), {}) ?? {} : {})
  }), [activeTab === PostTabType.EXPLORE ? exploreData : timelineData, featuredData, data]);

  useScrollRestoration('posts-page-scroll', isMounted && !isLoadingExplorePosts && !isLoadingTimelinePosts && !isLoadingFeaturedPosts && posts.length > 0, 50);

  useEffect(() => {
    if (isMounted && isAuthenticated && activeTab !== PostTabType.FOR_YOU) {
      setActiveTab(PostTabType.FOR_YOU);
    }
  }, [isAuthenticated, isMounted]);

  // fix hydration issues
  if (!isMounted) return null;
  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <main className="mx-auto max-w-full md:max-w-[100rem] px-2 sm:px-6 lg:px-8 md:pt-6 pt-4">
          <section aria-labelledby="dashboard-heading" className="pt-0 pb-24 max-w-full">
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-10 max-w-full">
              <div className="lg:col-span-10 max-w-full">
                <PostsTabs activeTab={activeTab} onTabChange={setActiveTab} isAuthenticated={isAuthenticated} />
                {(isLoadingExplorePosts || isLoadingTimelinePosts || isLoadingFeaturedPosts || isLoading || isLoadingAuthenticatedProfile)
                  ? <div className="flex justify-center pt-8"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>
                  : <PostCollage
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    posts={activeTab === PostTabType.COLLECTED
                      ? data?.pages?.flatMap(page => (page as TimelinePosts).posts) ?? []
                      : activeTab === PostTabType.EXPLORE
                        ? posts as Post[] ?? []
                        : posts as any[]}
                    postData={activeTab === PostTabType.COLLECTED
                      ? data?.pages?.reduce((acc: Record<string, any>, page) => ({ ...acc, ...(page as TimelinePosts).postData }), {}) ?? {}
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

          {/* Buy Bonsai Modal */}
          <Modal
            onClose={() => setOpenBuyModal(false)}
            open={openBuyModal}
            setOpen={setOpenBuyModal}
            panelClassnames="bg-black/70 w-screen h-screen md:h-full md:w-[30vw]"
          >
            <div className="p-4">
              <BuyBonsaiModal />
            </div>
          </Modal>
        </main>
      </div>
    </div>
  );
};

// OLD Profile code:
/* <div className="lg:col-span-3">

  {(!isConnected || !authenticatedProfile) && !isLoadingAuthenicatedProfile && <CreatorCopy isConnected={isConnected} isAuthenticatedProfile={!!authenticatedProfile} />}
  {isConnected && (
    <div className="bg-card rounded-lg p-4 hidden lg:block sticky top-24">
      {!!address &&
        <>
          <Holdings address={address} bonsaiAmount={bonsaiBalance ?? 0n} />
          <BonsaiNFTsSection nfts={bonsaiNFTs} onBuyBonsai={() => setOpenBuyModal(true)} />
        </>
      }
    </div>
  )}


  {!isConnected && (
    <div className="relative lg:col-span-3">
      <div className="rounded-lg p-6 w-full bg-card mt-1">
        <div className="flex justify-between flex-col gap-[2px]">
          <Header2>Bonsai NFT Perks</Header2>
          <Subtitle>
            Get an edge when creating or trading tokens
          </Subtitle>
        </div>
        <span className="text-base gap-2 flex flex-col mt-6">
          <ListItemCard items={[
            "0% fees on bonding curves",
            "0% fees on Uni v4 pools",
            <>
              Access to the{" "}<Link href="https://orb.club/c/bonsairooftop" passHref target="_blank">
                <span className="link link-hover">Rooftop Club</span>
              </Link>{" "}on Orb
            </>
          ]} />
        </span>
        <div className="bg-card-light rounded-lg px-3 py-[10px] flex flex-col gap-2 mt-8">
          <Subtitle>
            Requirements
          </Subtitle>
          <div className="flex gap-2">
            <CreatorButton text="100K $BONSAI" />
            <p>or</p>
            <CreatorButton text="1 BONSAI NFT" image={'nft-example.png'} />
          </div>
        </div>
      </div>
    </div>
  )}
</div> */

export default IndexPage;
