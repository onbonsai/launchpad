import { useState, useMemo, useEffect } from "react";
import { orderBy } from "lodash/collection";
import { get } from "lodash/object";
import { useInView } from "react-intersection-observer";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import DropDown from "@src/components/Icons/DropDown";
import { Publication, Theme } from "@madfi/widgets-react";
import Masonry from "react-masonry-css";
import { useRouter } from "next/router";
import { uniqBy } from "lodash/array";
import clsx from "clsx";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, shareContainerStyleOverride, postCollageTextContainerStyleOverrides } from "@src/components/Publication/PublicationStyleOverrides";
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

export const PostCollage = ({ posts, postData, filterBy, filteredPosts, setFilteredPosts, setFilterBy, isLoading, hasMore, fetchNextPage, sortedBy, setSortedBy }) => {
  const { data: walletClient } = useWalletClient();
  const { ref, inView } = useInView();
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeCollectModal, setActiveCollectModal] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  const router = useRouter();
  const {
    isAuthenticated,
    authenticatedProfile,
  } = useLensSignIn(walletClient);

  const categories = useMemo(() => {
    const _categories = uniqBy(posts?.map((post) => post.metadata?.attributes?.find(({ key }) => key === "templateCategory")), 'value');
    return _categories.map((c) => ({
      key: c.value,
      label: c.value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
    }));
  }, [posts]);

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
    if (inView && !isLoading && hasMore) {
      fetchNextPage();
    }
  }, [inView, isLoading, hasMore, fetchNextPage]);

  const sortedPosts = useMemo(() => {
    const _posts = filterBy ? filteredPosts : posts;
    const direction = "desc";

    const filteredByCategory = !categoryFilter
      ? _posts
      : _posts.filter(post => {
        const templateCategory = post.metadata?.attributes?.find(attr => attr.key === "templateCategory")?.value;
        return templateCategory === categoryFilter;
      });

    const orderedPosts = orderBy(filteredByCategory, [post => {
      const value = get(post, sortedBy);
      if (sortedBy === 'timestamp') {
        return value ? new Date(value).getTime() : 0;
      }
      return value ? BigInt(value) : 0;
    }], [direction]);
    const featuredPosts = orderedPosts.filter((post) => post.featured);
    const nonFeaturedPosts = orderedPosts.filter((post) => !post.featured);

    return [...featuredPosts, ...nonFeaturedPosts];
  }, [sortedBy, filterBy, filteredPosts, posts, showCompleted, categoryFilter]);

  const onShareButtonClick = (postSlug: string) => {
    navigator.clipboard.writeText(`${BONSAI_POST_URL}/${postSlug}`);
    toast.success("Copied", { position: "bottom-center", duration: 2000 });
  };

  const SortIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.6 14.6958L17.1095 12.5445L17.8905 13.4555L14.3908 16.4558L14.0003 16.7906L13.6098 16.4558L10.1095 13.4555L10.8905 12.5444L13.4 14.6955L13.4 3.99998H14.6L14.6 14.6958ZM2.50004 5.39976L10.5 5.4L10.5 6.6L2.5 6.59976L2.50004 5.39976ZM2.50002 9.4H9.00002V10.6H2.50002V9.4ZM7.50002 13.4H2.50002V14.6H7.50002V13.4Z" fill="white" fillOpacity="0.6" />
    </svg>
  );

  return (
    <div className="bg-background text-secondary font-sf-pro-text">
      <main className="mx-auto max-w-full">
        {/* FILTER */}
        <div className="flex justify-between items-center relative max-w-full">
          <div className="flex-1">
            <CategoryScroll
              categories={categories}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
            />
          </div>
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
              <span className="mt-[12px] ml-2">
                <SortIcon />
              </span>
              <select
                id="sort-select"
                className={`block appearance-none w-full bg-white border-transparent text-secondary rounded-[10px] text-[16px] focus:ring-transparent focus:border-transparent shadow-sm focus:outline-none md:pl-1 md:pr-8 pr-10 ${brandFont.className}`}
                onChange={(e) => setSortedBy(e.target.value)}
                style={{ background: "none" }}
              >
                <option value="stats.collects">Collects</option>
                <option value="timestamp">Age</option>
                {/* <option value="stats.comments">Comments</option> */}
              </select>
              <DropDown />
            </div>
          </div>
        </div>

        <section aria-labelledby="table-heading" className="max-w-full mt-6">
          <div className="lg:col-span-3 max-w-full">
            <Masonry
              breakpointCols={{
                default: 4,
                1280: 4,
                1024: 3,
                768: 2,
                640: 2,
              }}
              className="flex w-auto -ml-4"
              columnClassName="pl-4 bg-clip-padding"
            >
              {sortedPosts.map((post, idx) => (
                <div key={`post-${post.slug}`} className={`mb-4 relative group ${brandFont.className}`}>
                  <Publication
                    key={`preview-${post.slug}`}
                    publicationData={{
                      author: post.author,
                      timestamp: post.timestamp,
                      metadata: {
                        __typename: post.metadata?.image
                          ? "ImageMetadata"
                          : (post.metadata?.video ? "VideoMetadata" : "TextOnlyMetadata"),
                        content: getPostContentSubstring(post.metadata?.content ?? '', post.metadata.__typename === "TextOnlyMetadata" ? 230 : 100),
                        image: post.metadata?.image
                          ? { item: typeof post.metadata.image === 'string' ? post.metadata.image : post.metadata.image.item }
                          : undefined,
                        video: post.metadata?.video
                          ? { item: post.metadata.video.item }
                          : undefined
                      }
                    }}
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
                  />
                  <div className={clsx(
                    "opacity-0 transition-opacity duration-200 z-30",
                    "group-hover:opacity-100",
                    (activeDropdown === post.slug || activeCollectModal === post.slug) && "!opacity-100"
                  )}>
                    <CardOverlay
                      authenticatedProfile={authenticatedProfile}
                      bonsaiBalance={bonsaiBalance}
                      post={post}
                      postData={postData[post.slug]}
                      onShare={() => onShareButtonClick(post.slug)}
                      onClick={() => {
                        const encodedPost = encodeURIComponent(JSON.stringify(post));
                        router.push({
                          pathname: `/post/${post.slug}`,
                          query: {
                            returnTo: '/',
                            postData: encodedPost
                          }
                        });
                      }}
                      className={clsx(
                        "opacity-0 transition-all duration-300 ease-in-out z-30",
                        "group-hover:opacity-100",
                        (activeDropdown === post.slug || activeCollectModal === post.slug) && "!opacity-100"
                      )}
                      showDropdown={activeDropdown === post.slug}
                      setShowDropdown={(show) => setActiveDropdown(show ? post.slug : null)}
                      showCollectModal={activeCollectModal === post.slug}
                      setShowCollectModal={(show) => setActiveCollectModal(show ? post.slug : null)}
                    />
                  </div>
                </div>
              ))}
            </Masonry>
            {hasMore && (
              <div ref={ref} className="flex justify-center pt-4">
                <Spinner customClasses="h-6 w-6" color="#E42101" />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};