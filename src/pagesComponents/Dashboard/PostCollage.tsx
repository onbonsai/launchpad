import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import DropDown from "@src/components/Icons/DropDown";
import { Theme } from "@madfi/widgets-react";
import { Post, TimelineItem } from "@lens-protocol/client";
import { omit } from "lodash/object";
import Masonry from "react-masonry-css";
import { useRouter } from "next/router";
import { haptics } from "@src/utils/haptics";
import { sharePost, isWebShareSupported } from "@src/utils/webShare";
import { uniqBy } from "lodash/array";
import clsx from "clsx";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import {
  imageContainerStyleOverride,
  mediaImageStyleOverride,
  publicationProfilePictureStyle,
  reactionContainerStyleOverride,
  reactionsContainerStyleOverride,
  shareContainerStyleOverride,
  postCollageTextContainerStyleOverrides,
} from "@src/components/Publication/PublicationStyleOverrides";
import { CardOverlay } from "@src/components/CardOverlay";
import { BONSAI_POST_URL } from "@src/constants/constants";
import toast from "react-hot-toast";
import { useReadContract, useWalletClient } from "wagmi";
import { erc20Abi } from "viem";
import { LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { getPostContentSubstring } from "@src/utils/utils";
import { CategoryScroll } from "@pagesComponents/Dashboard/CategoryScroll";
import { brandFont } from "@src/fonts/fonts";
import useIsMobile from "@src/hooks/useIsMobile";
import { PostTabType } from "@src/components/Publication/PostsTabs";
import { TimelineItemInteractions } from '@src/components/Publication/TimelineItemInteractions';
import { Button } from "@src/components/Button";
import dynamic from "next/dynamic";
import { sendLike } from "@src/services/lens/getReactions";

const Publication = dynamic(
  () => import('@madfi/widgets-react').then(mod => mod.Publication),
  { ssr: false }
);

interface PostItemProps {
  post: any;
  timelineItem?: TimelineItem; // but without the primary as its `post`
  isMobile: boolean;
  onVisibilityChange: (slug: string, inView: boolean) => void;
  hoveredPostSlug: string | null;
  setHoveredPostSlug: (slug: string | null) => void;
  activeDropdown: string | null;
  setActiveDropdown: (slug: string | null) => void;
  activeCollectModal: string | null;
  setActiveCollectModal: (slug: string | null) => void;
  authenticatedProfile: any;
  bonsaiBalance: any;
  postData: any;
  onShareButtonClick: (slug: string) => void;
  router: any;
  isAuthenticated: boolean;
}

const PostItem = React.memo(({
  post,
  timelineItem,
  isMobile,
  onVisibilityChange,
  hoveredPostSlug,
  setHoveredPostSlug,
  activeDropdown,
  setActiveDropdown,
  activeCollectModal,
  setActiveCollectModal,
  authenticatedProfile,
  bonsaiBalance,
  postData,
  onShareButtonClick,
  router,
  isAuthenticated
}: PostItemProps) => {
  const { ref: postRef, inView: postInView } = useInView({
    threshold: 0.5,
    triggerOnce: false,
  });

  // Double-tap like functionality
  const lastTapRef = useRef<number>(0);
  const [showLikeHeart, setShowLikeHeart] = useState(false);
  const isDoubleTapping = useRef(false);

  useEffect(() => {
    if (isMobile) {
      onVisibilityChange(post.slug, postInView);
    }
  }, [postInView, post.slug, onVisibilityChange, isMobile]);

  // Memoize the publication data to prevent re-creation on every render
  const memoizedPublicationData = useMemo(() => ({
    author: post.author,
    timestamp: post.timestamp,
    metadata: {
      __typename: post.metadata?.image
        ? "ImageMetadata"
        : (post.metadata?.video ? "VideoMetadata" : "TextOnlyMetadata"),
      content: getPostContentSubstring(post.metadata?.content ?? '', post.metadata.__typename === "TextOnlyMetadata" ? 235 : 130),
      image: post.metadata?.image
        ? { item: typeof post.metadata.image === 'string' ? post.metadata.image : post.metadata.image.item }
        : undefined,
      video: post.metadata?.video
        ? { item: post.metadata.video.item }
        : undefined
    }
  }), [
    post.author?.id, 
    post.author?.username?.localName, 
    post.author?.metadata?.picture,
    post.timestamp,
    post.metadata?.__typename,
    post.metadata?.content,
    post.metadata?.image,
    post.metadata?.video
  ]);

  // Memoize the playVideo prop to prevent unnecessary re-renders
  const playVideo = useMemo(() => {
    return (isMobile && postInView) ||
           (!isMobile && hoveredPostSlug === post.slug) ||
           activeDropdown === post.slug;
  }, [isMobile, postInView, hoveredPostSlug, post.slug, activeDropdown]);

  // Handle double-tap to like
  const handleTouchStart = useCallback(async (e: React.TouchEvent) => {
    if (!isAuthenticated) return;
    
    const now = new Date().getTime();
    const timeDelta = now - lastTapRef.current;
    const DOUBLE_TAP_DELAY = 300; // milliseconds
    
    if (timeDelta < DOUBLE_TAP_DELAY && timeDelta > 0) {
      // Double tap detected
      e.preventDefault();
      e.stopPropagation();
      isDoubleTapping.current = true;
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isDoubleTapping.current = false;
      }, 500);
      
      try {
        await sendLike(post.slug);
        
        // Show heart animation
        setShowLikeHeart(true);
        setTimeout(() => setShowLikeHeart(false), 1000);
        
        // Haptic feedback
        if (isMobile) {
          haptics.light();
        }
        
        toast.success("Liked!", { duration: 1500 });
      } catch (error) {
        console.error('Error liking post:', error);
        toast.error("Failed to like post");
      }
    }
    
    lastTapRef.current = now;
  }, [isAuthenticated, post.slug, isMobile]);

  // Memoize the onClick handler to prevent re-creation
  const handleCardClick = useCallback(() => {
    // Don't navigate if we're in the middle of a double-tap
    if (isDoubleTapping.current) return;
    
    localStorage.setItem('tempPostData', JSON.stringify(post));
    router.push({ pathname: `/post/${post.slug}` });
  }, [post, router]);

  // Memoize the share handler
  const handleShare = useCallback(() => {
    onShareButtonClick(post.slug);
  }, [onShareButtonClick, post.slug]);

  return (
    <div
      ref={postRef}
      key={`post-${post.slug}`}
      className={`mb-4 mx-1 relative group ${brandFont.className} font-light
      transition-all duration-300 ease-out transform-gpu`}
      onMouseEnter={() => !isMobile && setHoveredPostSlug(post.slug)}
      onMouseLeave={() => !isMobile && setHoveredPostSlug(null)}
      onTouchStart={isMobile ? handleTouchStart : undefined}
    >
      {(timelineItem || postData?.presence) && (
        <TimelineItemInteractions
          reposts={timelineItem?.reposts}
          position="top"
          postData={postData}
        />
      )}
      <div className={clsx(
        "relative transition-transform duration-300 ease-out hover:scale-[1.02]",
        postData?.remixContest && "border-2 border-brand-highlight rounded-[24px] p-[2px]"
      )}>
        {postData?.remixContest && (
          <div className="absolute -top-6 left-6 bg-brand-highlight text-black px-3 py-1 rounded-t-lg rounded-b-none text-xs font-medium z-10 shadow-lg">
            Remix contest: win $10
          </div>
        )}
        <div className={clsx(
          "absolute inset-0 bg-gradient-to-br from-brand-highlight/10 to-transparent opacity-0",
          "group-hover:opacity-100 transition-opacity duration-300 rounded-[24px] -z-10 blur-xl",
          postData?.remixContest && "!opacity-100"
        )}></div>
        <Publication
          key={`preview-${post.slug}`}
          publicationData={memoizedPublicationData}
          theme={Theme.dark}
          followButtonDisabled={true}
          environment={LENS_ENVIRONMENT}
          profilePictureStyleOverride={publicationProfilePictureStyle}
          containerBorderRadius={'24px'}
          containerPadding={'12px'}
          profilePadding={'0 0 0 0'}
          textContainerStyleOverride={postCollageTextContainerStyleOverrides}
          backgroundColorOverride={'rgba(255,255,255, 0.08)'}
          mediaImageStyleOverride={mediaImageStyleOverride}
          imageContainerStyleOverride={imageContainerStyleOverride}
          reactionsContainerStyleOverride={reactionsContainerStyleOverride}
          reactionContainerStyleOverride={reactionContainerStyleOverride}
          shareContainerStyleOverride={shareContainerStyleOverride}
          markdownStyleBottomMargin={'0'}
          heartIconOverride={true}
          messageIconOverride={true}
          shareIconOverride={true}
          profileMaxWidth={'120px'}
          fullVideoHeight
          playVideo={playVideo}
          hideVideoControls
        />
        <div className={clsx(
          "opacity-0 transition-opacity duration-200 z-30",
          !isMobile && "group-hover:opacity-100",
          (activeDropdown === post.slug || activeCollectModal === post.slug) && "!opacity-100"
        )}>
          <CardOverlay
            authenticatedProfile={authenticatedProfile}
            bonsaiBalance={bonsaiBalance}
            post={post}
            postData={postData}
            onShare={handleShare}
            onClick={handleCardClick}
            className={clsx(
              "opacity-0 transition-all duration-300 ease-in-out z-30",
              !isMobile && "group-hover:opacity-100",
              (activeDropdown === post.slug || activeCollectModal === post.slug) && "!opacity-100"
            )}
            showDropdown={activeDropdown === post.slug}
            setShowDropdown={(show) => setActiveDropdown(show ? post.slug : null)}
            showCollectModal={activeCollectModal === post.slug}
            setShowCollectModal={(show) => setActiveCollectModal(show ? post.slug : null)}
          />
        </div>
      </div>
      {timelineItem && (
        <TimelineItemInteractions
          comments={timelineItem.comments}
          position="bottom"
        />
      )}
      
      {/* Double-tap like heart animation */}
      {showLikeHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="animate-ping">
            <div className="bg-red-500 rounded-full p-4 opacity-90 animate-pulse">
              <svg
                className="w-12 h-12 text-white fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PostItem.displayName = 'PostItem';

export const PostCollage = ({ activeTab, setActiveTab, posts, postData, filterBy, filteredPosts, setFilteredPosts, setFilterBy, isLoading, hasMore, fetchNextPage, isLoadingForYou, isLoadingExplore, isLoadingCollected }) => {
  const { data: walletClient } = useWalletClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeCollectModal, setActiveCollectModal] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [hoveredPostSlug, setHoveredPostSlug] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const isMobile = useIsMobile();

  const router = useRouter();
  const {
    isAuthenticated,
    authenticatedProfile,
  } = useLensSignIn(walletClient);

  const { ref, inView } = useInView({
    threshold: 0.5,
    rootMargin: '200px',
    triggerOnce: false,
  });

  // Process posts based on activeTab, filter out deleted posts
  const processedPosts = useMemo(() => {
    const _posts = posts.filter((p: Post) => !p.isDeleted);
    if (activeTab === PostTabType.EXPLORE) {
      return _posts as Post[];
    }

    // For FOR_YOU tab, we need to handle both Post and TimelineItem types
    return _posts.map((item: Post | TimelineItem) => {
      // Check if it's a TimelineItem by looking for the 'primary' property
      if ('primary' in item) {
        return {
          ...item,
          __typename: 'TimelineItem',
          // We'll handle the special rendering later
        };
      }
      return item as Post;
    });
  }, [posts, activeTab]);

  const categories = useMemo(() => {
    const _categories = uniqBy(processedPosts?.map((post) => {
      // Only process categories for Post type items
      if ('__typename' in post && post.__typename === 'TimelineItem') {
        return null;
      }
      return post.metadata?.attributes?.find(({ key }) => key === "templateCategory");
    }), 'value').filter(c => c);

    return _categories.map((c) => ({
      key: c.value,
      label: c.value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
    }));
  }, [processedPosts]);

  // bonsai balance of Lens Account
  const { data: bonsaiBalance } = useReadContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: "balanceOf",
    args: [authenticatedProfile?.address as `0x${string}`],
    query: {
      refetchInterval: 10000,
      enabled: isAuthenticated && authenticatedProfile?.address
    },
  });

  useEffect(() => {
    if (inView && !isLoading && hasMore && !isFetchingRef.current) {
      isFetchingRef.current = true;
      fetchNextPage();

      // Reset the fetching flag after a delay
      setTimeout(() => {
        isFetchingRef.current = false;
      }, 2000);
    }
  }, [inView, isLoading, hasMore, fetchNextPage]);

  const handleVisibilityChange = useCallback((slug: string, isInView: boolean) => {
    if (isInView) {
      setHoveredPostSlug(slug);
    } else {
      setHoveredPostSlug(prevSlug => (prevSlug === slug ? null : prevSlug));
    }
  }, []);

  // Memoize the onShareButtonClick to prevent re-renders
  const memoizedOnShareButtonClick = useCallback(async (postSlug: string) => {
    const success = await sharePost(postSlug, {
      title: 'Check out this post on Bonsai',
      text: 'Discover amazing content and trade tokens on Bonsai',
      url: `${BONSAI_POST_URL}/${postSlug}`
    });
    
    // Haptic feedback is handled in the webShare utility
    if (!success && !isWebShareSupported()) {
      // Fallback already handled in webShare utility
      console.log('Share completed via fallback');
    }
  }, []);

  const sortedPosts = useMemo(() => {
    if (activeTab === PostTabType.FOR_YOU) return processedPosts; // no sorting on for you
    const _posts = filterBy ? filteredPosts : processedPosts;
    const filteredByCategory = !categoryFilter
      ? _posts
      : _posts.filter(post => {
        // Only filter by category for Post type items
        if ('__typename' in post && post.__typename === 'TimelineItem') {
          return true;
        }
        const templateCategory = post.metadata?.attributes?.find(attr => attr.key === "templateCategory")?.value;
        return templateCategory === categoryFilter;
      });

    const featuredPosts = filteredByCategory.filter((post) => {
      // Only check featured for Post type items
      if ('__typename' in post && post.__typename === 'TimelineItem') {
        return false;
      }
      return post.featured;
    });
    const nonFeaturedPosts = filteredByCategory.filter((post) => {
      // Only check featured for Post type items
      if ('__typename' in post && post.__typename === 'TimelineItem') {
        return true;
      }
      return !post.featured;
    });

    return [...featuredPosts, ...nonFeaturedPosts];
  }, [filterBy, filteredPosts, processedPosts, showCompleted, categoryFilter, activeTab]);



  const SortIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.6 14.6958L17.1095 12.5445L17.8905 13.4555L14.3908 16.4558L14.0003 16.7906L13.6098 16.4558L10.1095 13.4555L10.8905 12.5444L13.4 14.6955L13.4 3.99998H14.6L14.6 14.6958ZM2.50004 5.39976L10.5 5.4L10.5 6.6L2.5 6.59976L2.50004 5.39976ZM2.50002 9.4H9.00002V10.6H2.50002V9.4ZM7.50002 13.4H2.50002V14.6H7.50002V13.4Z" fill="white" fillOpacity="0.6" />
    </svg>
  );

  const shouldShowEmptyState = useMemo(() => {
    // Don't show empty state while loading
    if (isLoading || isFetchingRef.current) return false;

    // Don't show empty state if we have posts
    if (sortedPosts.length > 0) return false;

    // Check specific loading states for each tab
    if (activeTab === PostTabType.FOR_YOU && isLoadingForYou) return false;
    if (activeTab === PostTabType.EXPLORE && isLoadingExplore) return false;
    if (activeTab === PostTabType.COLLECTED && isLoadingCollected) return false;

    return true;
  }, [isLoading, isFetchingRef.current, sortedPosts.length, activeTab, isLoadingForYou, isLoadingExplore, isLoadingCollected]);

  return (
    <div className="bg-background text-secondary font-sf-pro-text">
      <main className="mx-auto max-w-full overflow-hidden">
        {/* FILTER */}
        <div className="flex justify-between items-center relative max-w-full">
          {(activeTab === PostTabType.EXPLORE || activeTab === PostTabType.COLLECTED) && (
            <div className="flex-1 overflow-x-auto scrollbar-hide px-2 md:pt-2 pt-4">
              <CategoryScroll
                categories={categories}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
              />
            </div>
          )}
          <div className="flex items-center">
            {filterBy && (
              <div className="px-4 py-2 border-dark-grey border p-1 rounded-md flex items-center">
                <span className="text-secondary text-sm pr-4">{filterBy}</span>
                <button onClick={() => { setFilteredPosts([]); setFilterBy("") }} className="text-secondary inline-flex">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14.707 14.707a1 1 0 01-1.414 0L10 11.414l-3.293 3.293a1 1 0 01-1.414-1.414L8.586 10 5.293 6.707a1 1 0 011.414-1.414L10 8.586l3.293-3.293a1 1 0 011.414 1.414L11.414 10l3.293 3.293a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}
            <div className="relative bg-white/10 rounded-[10px] flex flex-row">
              {/* <label className="mr-6 pl-4 flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-brand-highlight bg-gray-800 rounded border-gray-600 focus:ring-brand-highlight focus:ring-offset-gray-900"
                  aria-label="completed"
                />
                <span className="text-secondary text-sm">Graduated</span>
              </label>
              <div className="h-full flex align-center items-center mr-2">
                <div className="w-[2px] h-[calc(100%-16px)] bg-card-lightest" />
              </div> */}
              {/* <span className="mt-[9px] ml-2">
                <SortIcon />
              </span>
              <select
                id="sort-select"
                className={`block appearance-none w-full bg-white border-transparent text-secondary rounded-[10px] text-sm focus:ring-transparent focus:border-transparent shadow-sm focus:outline-none md:pl-1 md:pr-8 pr-10 ${brandFont.className}`}
                onChange={(e) => setSortedBy(e.target.value)}
                style={{ background: "none" }}
              >
                <option value="stats.collects">Collects</option>
                <option value="timestamp">Age</option>
                <option value="stats.comments">Comments</option>
              </select>
              <DropDown /> */}
            </div>
          </div>
        </div>

        <section aria-labelledby="table-heading" className="max-w-full mt-6">
          <div className="lg:col-span-3 max-w-full">
            {shouldShowEmptyState ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-6 p-6 rounded-full bg-white/[0.04]">
                  <svg className="w-12 h-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                  </svg>
                </div>
                <p className="text-white text-xl font-medium mb-2">Nothing to see here... yet!</p>
                <p className="text-white/60 text-base max-w-sm">
                  {activeTab === PostTabType.FOR_YOU
                    ? "Follow some creators to see their posts in your feed"
                    : "Head over to the Explore tab to discover new content and connect with creators"}
                </p>
                {activeTab === PostTabType.FOR_YOU && (
                  <Button
                    variant="accentBrand"
                    size="md"
                    className="mt-6"
                    onClick={() => setActiveTab(PostTabType.EXPLORE)}
                  >
                    Explore Content
                  </Button>
                )}
              </div>
            ) : (
              <Masonry
                breakpointCols={{
                  default: 4,
                  1530: 3,
                  1145: 2,
                  768: 1,
                }}
                className="flex w-auto -ml-4"
                columnClassName="pl-4 bg-clip-padding"
              >
                {sortedPosts.map((post) => (
                  <PostItem
                    key={post.__typename === "TimelineItem" ? post.primary.slug : post.slug}
                    post={post.__typename === "TimelineItem" ? post.primary : post}
                    timelineItem={post.__typename === "TimelineItem" ? omit(post, 'primary') as TimelineItem : undefined}
                    isMobile={isMobile}
                    onVisibilityChange={handleVisibilityChange}
                    hoveredPostSlug={hoveredPostSlug}
                    setHoveredPostSlug={setHoveredPostSlug}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    activeCollectModal={activeCollectModal}
                    setActiveCollectModal={setActiveCollectModal}
                    authenticatedProfile={authenticatedProfile}
                    bonsaiBalance={bonsaiBalance}
                    postData={postData[post.__typename === "TimelineItem" ? post.primary.slug : post.slug]}
                    onShareButtonClick={memoizedOnShareButtonClick}
                    router={router}
                    isAuthenticated={isAuthenticated || false}
                  />
                ))}
              </Masonry>
            )}
            {hasMore && (
              <div ref={ref} className="flex justify-center pt-8 pb-4">
                <Spinner customClasses="h-8 w-8" color="#5be39d" />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};