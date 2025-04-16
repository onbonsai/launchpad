import { NextPage } from "next";
import { useMemo, useState } from "react";

import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useIsMounted from "@src/hooks/useIsMounted";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { Modal } from "@src/components/Modal";
import BuyBonsaiModal from "@src/components/BuyBonsai/BuyBonsaiModal";
import { useClubs } from "@src/context/ClubsContext";
import { useGetExplorePosts } from "@src/services/lens/posts";
import { PostCollage } from "@pagesComponents/Dashboard/PostCollage";
import { Post } from "@lens-protocol/client";

// Define the type for the page data returned by useGetExplorePosts
interface ExplorePostPage {
  posts: Post[];
  postData: Record<string, any>;
  pageInfo: {
    next: string | null;
  };
  nextCursor: string | null;
}

const IndexPage: NextPage = () => {
  const isMounted = useIsMounted();
  const { filteredClubs, setFilteredClubs, filterBy, setFilterBy, sortedBy, setSortedBy } = useClubs();
  const [openBuyModal, setOpenBuyModal] = useState(false);
  const { data: authenticatedProfile, isLoading: isLoadingAuthenticatedProfile } = useAuthenticatedLensProfile();
  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading: isLoadingPosts } = useGetExplorePosts({
    isLoadingAuthenticatedProfile,
    accountAddress: authenticatedProfile?.address
  });

  // Type assertion for data.pages
  const pages = data?.pages as ExplorePostPage[] || [];

  // Update the dependency array to include data instead of pages
  const posts = useMemo(() => pages.flatMap(page => page.posts) || [], [data]);
  const postData = useMemo(() => pages.reduce((acc, page) => ({ ...acc, ...page.postData }), {}) || {}, [data]);

  // fix hydration issues
  if (!isMounted) return null;
  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8 pt-6">
          <section aria-labelledby="dashboard-heading" className="pt-0 pb-24 max-w-full">
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-10 max-w-full">
              <div className="lg:col-span-10 max-w-full">
                {/* return the featured clubs asap, then load the rest */}
                {isLoadingPosts
                  ? <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>
                  : <PostCollage
                    posts={posts as Post[] ?? []}
                    postData={postData}
                    setFilteredPosts={setFilteredClubs}
                    filteredPosts={filteredClubs}
                    filterBy={filterBy}
                    setFilterBy={setFilterBy}
                    isLoading={isLoadingPosts || isFetchingNextPage}
                    hasMore={hasNextPage}
                    fetchNextPage={fetchNextPage}
                  // sortedBy={sortedBy}
                  // setSortedBy={setSortedBy}
                  />
                }
              </div>

            </div >
          </section >

          {/* Buy Bonsai Modal */}
          < Modal
            onClose={() => setOpenBuyModal(false)}
            open={openBuyModal}
            setOpen={setOpenBuyModal}
            panelClassnames="bg-black/70 w-screen h-screen md:h-full md:w-[30vw]"
          >
            <div className="p-4">
              <BuyBonsaiModal />
            </div>
          </Modal >
        </main >
      </div >
    </div >
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
