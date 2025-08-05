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
import { useTopBaseCoins } from "@src/services/farcaster/zora";
import ChatWindowButton from "@src/pagesComponents/ChatWindow/components/ChatWindowButton";
import Chat from "@src/pagesComponents/ChatWindow/components/Chat";
import { Coin } from "@src/services/farcaster/tbd";
import { SmartMedia } from "@src/services/madfi/studio";
import { Header, Header2, Subtitle } from "@src/styles/text";
import { Modal } from "@src/components/Modal";
import { brandFont } from "@src/fonts/fonts";
import Link from "next/link";
import { routesApp } from "@src/constants/routesApp";
import clsx from "clsx";

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
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated } = useLensSignIn(walletClient);
  const { filteredClubs, setFilteredClubs, filterBy, setFilterBy, sortedBy, setSortedBy } = useClubs();
  const { isMiniApp, context } = useIsMiniApp();
  const hasCheckedAuth = useRef(false);
  const [openHelpModal, setOpenHelpModal] = useState(false);

  const [activeTab, setActiveTab] = useState<PostTabType>(() => {
    if (isMiniApp) return PostTabType.BASE;
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('selectedPostTab');
      if (savedTab && Object.values(PostTabType).includes(savedTab as PostTabType)) {
        return savedTab as PostTabType;
      }
    }
    return PostTabType.EXPLORE;
  });

  useEffect(() => {
    if (isMiniApp && activeTab !== PostTabType.BASE) setActiveTab(PostTabType.BASE);
  }, [isMiniApp, activeTab]);

  const { data: authenticatedProfile, isLoading: isLoadingAuthenticatedProfile } = useAuthenticatedLensProfile();

  // Chat window state for Base coin remixing
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);

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

  // Function to convert Coin to SmartMedia format
  const coinToSmartMedia = (coin: Coin): SmartMedia | undefined => {
    if (!coin.media_image && !coin.media_animationUrl && !coin.media_contentUri) {
      return undefined;
    }

    // Determine if this is a video or image to set the correct template
    const isVideo = coin.media_animationUrl ||
                   (coin.media_contentMime?.startsWith('video/')) ||
                   (coin.media_contentUri?.endsWith('.m3u8')) ||
                   (coin.media_animationUrl?.endsWith('.m3u8'));
    const template = isVideo ? "video" : "image";

    return {
      agentId: `coin-${coin.id}`, // Create a unique ID for the coin
      creator: coin.coin_creator_address as `0x${string}`,
      template: template,
      category: "social" as any,
      createdAt: parseInt(coin.coin_created_timestamp) || Date.now(),
      updatedAt: Date.now(),
      templateData: {
        coinSymbol: coin.symbol,
        coinName: coin.name,
        castText: coin.cast_text,
        // Structure media data the way ChatInput expects it
        image: isVideo ? undefined : (coin.media_image || coin.media_contentUri),
        video: isVideo ? (coin.media_animationUrl || coin.media_contentUri) : undefined,
        // Keep original fields for reference
        mediaImage: coin.media_image,
        mediaAnimationUrl: coin.media_animationUrl,
        mediaContentUri: coin.media_contentUri,
        mediaContentMime: coin.media_contentMime,
      },
      postId: coin.cast_cast_hash || `coin-${coin.id}`,
      maxStaleTime: 3600, // 1 hour
      uri: (coin.media_image || coin.media_contentUri || coin.media_animationUrl || "") as any,
      token: {
        chain: "base" as const,
        address: coin.coin as `0x${string}`,
        external: true,
        metadata: {
          symbol: coin.symbol,
          name: coin.name,
          image: coin.media_image,
        }
      },
      protocolFeeRecipient: coin.coin_creator_address as `0x${string}`,
      description: coin.cast_text || `Remix ${coin.symbol} coin`,
    };
  };

  // Function to handle coin selection for remixing
  const handleCoinSelect = (coin: Coin) => {
    setSelectedCoin(coin);
    setIsChatOpen(true);
  };

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
                <div className="pt-2 mb-4">
                  <Header className="!text-brand-highlight text-2xl inline">{activeTab === PostTabType.BASE ? 'Remix a trending Base post' : 'Remix a smart media post'}</Header>
                  <span
                    className="text-lg ml-4 text-secondary/60 cursor-pointer hover:text-secondary/90 transition-colors"
                    onClick={() => setOpenHelpModal(true)}
                  >
                    More info
                  </span>
                </div>
                {!isMiniApp && (
                  <PostsTabs activeTab={activeTab} onTabChange={setActiveTab} isAuthenticated={isAuthenticated} />
                )}
                {(isLoadingExplorePosts || isLoadingTimelinePosts || isLoadingFeaturedPosts || isLoading || isLoadingAuthenticatedProfile || isLoadingBaseCoins)
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
                    baseCoins={baseCoins}
                    onCoinSelect={handleCoinSelect}
                  />
                }
              </div>
            </div>
          </section>

          {/* Chat Window for Base Coin Remixing */}
          {selectedCoin && (
            <ChatWindowButton
              agentInfo={{
                agentId: `coin-${selectedCoin.id}`,
                info: {
                  wallets: [selectedCoin.coin_creator_address as `0x${string}`]
                },
                account: {
                  metadata: {
                    name: selectedCoin.name || selectedCoin.symbol
                  },
                  username: {
                    localName: selectedCoin.symbol
                  }
                }
              } as any}
              isOpen={isChatOpen}
              setIsOpen={setIsChatOpen}
              isRemixing={true}
              noBottomButton={true}
            >
              <Chat
                agentId={`coin-${selectedCoin.id}`}
                agentWallet={selectedCoin.coin_creator_address as `0x${string}`}
                agentName={`${selectedCoin.name || selectedCoin.symbol} (${selectedCoin.symbol})`}
                media={coinToSmartMedia(selectedCoin)}
                conversationId={`coin-remix-${context?.user?.fid || address}-${selectedCoin.id}`}
                post={{
                  id: selectedCoin.cast_cast_hash || `coin-${selectedCoin.id}`,
                  slug: `coin-${selectedCoin.id}`,
                  content: selectedCoin.cast_text || `Remix ${selectedCoin.symbol} coin`,
                  metadata: {
                    attributes: [
                      { key: "coinSymbol", value: selectedCoin.symbol },
                      { key: "coinName", value: selectedCoin.name }
                    ],
                    // Add media metadata as fallback
                    ...(() => {
                      const coinIsVideo = selectedCoin.media_animationUrl ||
                                         (selectedCoin.media_contentMime?.startsWith('video/')) ||
                                         (selectedCoin.media_contentUri?.endsWith('.m3u8')) ||
                                         (selectedCoin.media_animationUrl?.endsWith('.m3u8'));

                      if (coinIsVideo) {
                        const videoUrl = selectedCoin.media_animationUrl || selectedCoin.media_contentUri;
                        return videoUrl ? { video: { item: videoUrl } } : {};
                      } else {
                        const imageUrl = selectedCoin.media_image || selectedCoin.media_contentUri;
                        return imageUrl ? { image: { item: imageUrl } } : {};
                      }
                    })()
                  }
                } as any}
                isRemixing={true}
              />
            </ChatWindowButton>
          )}

        </main>
      </div>

      {/* Help Modal */}
      <Modal
        onClose={() => setOpenHelpModal(false)}
        open={openHelpModal}
        setOpen={setOpenHelpModal}
        panelClassnames={clsx(
          "text-md bg-card w-full p-4 md:w-[35vw] max-w-[2000px] lg:max-w-[500px] text-secondary md:mx-8",
          brandFont.className,
        )}
      >
        <Header2>Bonsai is the genAI remix engine for content coins</Header2>
        <p className="mt-4 text-secondary/70">
          With our {isMiniApp ? 'miniapp' : 'Studio app'}, you can generate media with AI by choosing an existing post as your starting point.
        </p>
        <p className="mt-4 text-secondary/70">
          Each media post has a coin associated - you can create a new one or import a clanker/zora coin. When others remix your media, they must swap into the coin to generate.
        </p>
        <p className="mt-2 text-secondary/70">
          At the core is our Smart Media Protocol (SMP): where media and actions are onchain, enabling open remix and co-creation culture.
        </p>

        <p className="mt-2 text-secondary/70">
          Staking $BONSAI earns you free daily generation credits. Head to the{" "}
          <Link href={routesApp.stake}>
            <span className="text-brand-highlight/80 link-hover cursor-pointer" onClick={() => setOpenHelpModal(false)}>
              staking page
            </span>
          </Link>{" "}
          to bridge or buy $BONSAI tokens.
        </p>

        <div className="mt-4 text-secondary/70" onClick={() => setOpenHelpModal(false)}>
          <Link href={routesApp.info}>
            <span className="text-brand-highlight/80 link-hover cursor-pointer">Learn more.</span>
          </Link>
        </div>
      </Modal>
    </div>
  );
};

export default IndexPage;
