import { NextPage } from "next";
import { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import { erc20Abi } from "viem";

import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useIsMounted from "@src/hooks/useIsMounted";
import CreatorCopy from "@src/components/Lens/CreatorCopy";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { useGetRegisteredClubs, useGetFeaturedClubs } from "@src/hooks/useMoneyClubs";
import { ClubList, Holdings } from "@src/pagesComponents/Dashboard";
import { BONSAI_TOKEN_BASE_ADDRESS, CONTRACT_CHAIN_ID, BENEFITS_AUTO_FEATURE_HOURS } from "@src/services/madfi/moneyClubs";
import { Modal } from "@src/components/Modal";
import BuyBonsaiModal from "@src/components/BuyBonsai/BuyBonsaiModal";
import { useClubs } from "@src/context/ClubsContext";
import { Header2, Subtitle } from "@src/styles/text";
import CreatorButton from "@src/components/Creators/CreatorButton";
import BonsaiNFTsSection from "@pagesComponents/Dashboard/BonsaiNFTsSection";
import { useGetBonsaiNFTs } from "@src/hooks/useGetBonsaiNFTs";
import ListItemCard from "@src/components/Shared/ListItemCard";
// import { ActivityBanner } from "@src/components/Header";

const IndexPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const isMounted = useIsMounted();
  const { filteredClubs, setFilteredClubs, filterBy, setFilterBy, sortedBy, setSortedBy } = useClubs();
  const [openBuyModal, setOpenBuyModal] = useState(false);
  const { data: authenticatedProfile, isLoading: isLoadingAuthenicatedProfile } = useAuthenticatedLensProfile();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetRegisteredClubs(sortedBy);
  const { data: featuredClubs, isLoading: isLoadingFeaturedClubs } = useGetFeaturedClubs();
  const { data: bonsaiNFTs } = useGetBonsaiNFTs(address);
  const clubs = useMemo(() => [...(featuredClubs || []), ...(data?.pages.flatMap(page => page.clubs) || [])], [featuredClubs, data]);

  const { data: bonsaiBalance } = useReadContract({
    address: BONSAI_TOKEN_BASE_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address }
  });

  // fix hydration issues
  if (!isMounted) return null;
  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        {/* <ActivityBanner /> */}
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8 pt-6">
          <section aria-labelledby="dashboard-heading" className="pt-0 pb-24 max-w-full">
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-10 max-w-full">
              <div className="lg:col-span-7 max-w-full">
                {/* return the featured clubs asap, then load the rest */}
                {isLoadingFeaturedClubs
                  ? <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>
                  : <ClubList
                    clubs={clubs}
                    setFilteredClubs={setFilteredClubs}
                    filteredClubs={filteredClubs}
                    filterBy={filterBy}
                    setFilterBy={setFilterBy}
                    isLoading={isLoading || isFetchingNextPage}
                    hasMore={hasNextPage}
                    fetchNextPage={fetchNextPage}
                    sortedBy={sortedBy}
                    setSortedBy={setSortedBy}
                  />
                }
              </div>
              <div className="lg:col-span-3 overflow-auto">
                {/* Profile */}
                {(!isConnected || !authenticatedProfile) && !isLoadingAuthenicatedProfile && <CreatorCopy isConnected={isConnected} isAuthenticatedProfile={!!authenticatedProfile} />}
                {isConnected && (
                  <div className="bg-card rounded-lg p-4 hidden lg:block">
                    {!!address &&
                      <>
                        <Holdings address={address} bonsaiAmount={bonsaiBalance ?? 0n} />
                        <BonsaiNFTsSection nfts={bonsaiNFTs} onBuyBonsai={() => setOpenBuyModal(true)} />
                      </>
                    }
                  </div>
                )}

                {/* Bonsai NFT Perks */}
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
                      {/* <Button
                        className="mt-6"
                        size="sm"
                        onClick={() => setOpenBuyModal(true)}
                        disabled={!isConnected}
                      >
                        Buy $BONSAI
                      </Button> */}
                    </div>
                  </div>
                )}
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

export default IndexPage;