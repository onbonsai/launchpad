import { useState, useMemo, useEffect } from "react";
import { orderBy } from "lodash/collection";
import { get } from "lodash/object";
import { useInView } from "react-intersection-observer";
import ClubCard from "./ClubCard";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import DropDown from "@src/components/Icons/DropDown";
import { Publication, Theme } from "@madfi/widgets-react";
import Masonry from "react-masonry-css";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, shareContainerStyleOverride, textContainerStyleOverrides } from "@src/components/Publication/PublicationStyleOverrides";
import { CardOverlay } from "@src/components/CardOverlay";

export const PostCollage = ({ posts, filterBy, filteredPosts, setFilteredPosts, setFilterBy, isLoading, hasMore, fetchNextPage, sortedBy, setSortedBy }) => {
  const { ref, inView } = useInView();
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (inView && !isLoading && hasMore) {
      fetchNextPage();
    }
  }, [inView, isLoading, hasMore, fetchNextPage]);

  const sortedPosts = useMemo(() => {
    const _posts = filterBy ? filteredPosts : posts;
    const direction = "desc";

    const orderedPosts = orderBy(_posts, [post => {
      const value = get(post, sortedBy);
      return value ? BigInt(value) : 0;
    }], [direction]);
    const featuredPosts = posts.filter((post) => post.featured);
    const nonFeaturedPosts = posts.filter((post) => !post.featured);

    return [...featuredPosts, ...nonFeaturedPosts];
  }, [sortedBy, filterBy, filteredPosts, posts, showCompleted]);

  const SortIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M14.6 14.6958L17.1095 12.5445L17.8905 13.4555L14.3908 16.4558L14.0003 16.7906L13.6098 16.4558L10.1095 13.4555L10.8905 12.5444L13.4 14.6955L13.4 3.99998H14.6L14.6 14.6958ZM2.50004 5.39976L10.5 5.4L10.5 6.6L2.5 6.59976L2.50004 5.39976ZM2.50002 9.4H9.00002V10.6H2.50002V9.4ZM7.50002 13.4H2.50002V14.6H7.50002V13.4Z" fill="white" fillOpacity="0.6" />
    </svg>
  );

  return (
    <div className="bg-background text-secondary">
      <main className="mx-auto max-w-full">
        {/* FILTER */}
        <div className="relative max-w-full">
          <div className="flex justify-end">
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
              <label className="mr-6 pl-4 flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-primary bg-gray-800 rounded border-gray-600 focus:ring-primary focus:ring-offset-gray-900"
                  aria-label="completed"
                />
                <span className="text-secondary text-sm">Graduated</span>
              </label>
              <div className="h-full flex align-center items-center mr-2">
                <div className="w-[2px] h-[calc(100%-16px)] bg-card-lightest" />
              </div>
              <span className="mt-[9px] ml-2">
                <SortIcon />
              </span>
              <select
                id="sort-select"
                className="block appearance-none w-full bg-white border-transparent text-secondary rounded-[10px] focus:ring-transparent focus:border-transparent shadow-sm focus:outline-none sm:text-sm md:pl-1 md:pr-8 pr-10"
                onChange={(e) => setSortedBy(e.target.value)}
                style={{ background: "none" }}
              >
                <option value="club.marketCap">Market Cap</option>
                <option value="club.createdAt">Age</option>
                {/* <option value="publication.stats.comments">Replies</option> */}
              </select>
              <DropDown />
            </div>
          </div>
        </div>

        <section aria-labelledby="table-heading" className="max-w-full mt-6">
          <div className="lg:col-span-3 max-w-full">
            <Masonry
              breakpointCols={{
                default: 5,
                1280: 4,
                1024: 3,
                768: 2,
                640: 2,
              }}
              className="flex w-auto -ml-4"
              columnClassName="pl-4 bg-clip-padding"
            >
              {sortedPosts.map((post, idx) => {
                if (idx === 0) return null;
                return (
                  <div key={`club-${idx}`} className="mb-4 relative group">
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 cursor-pointer" />
                    <Publication
                      key={`preview-${JSON.stringify(post)}`}
                      publicationData={{
                        author: post.author,
                        timestamp: post.timestamp,
                        metadata: {
                          __typename: post.metadata?.image
                            ? "ImageMetadata"
                            : (post.metadata?.video ? "VideoMetadata" : "TextOnlyMetadata"),
                          content: post.metadata?.content ?? '',
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
                      textContainerStyleOverride={textContainerStyleOverrides}
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
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30">
                      <CardOverlay
                        profileName={post.author.handle}
                        onSave={() => {/* handle save */}}
                        onShare={() => {/* handle share */}}
                        onHide={() => {/* handle hide */}}
                        onDownload={() => {/* handle download */}}
                        onReport={() => {/* handle report */}}
                      />
                    </div>
                  </div>
                );
              })}
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