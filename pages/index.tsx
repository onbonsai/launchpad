import { NextPage } from "next";
import { ReactNode, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Profile, Theme } from "@madfi/widgets-react";
import Link from "next/link";
import { erc20Abi, erc721Abi, formatEther } from "viem";

import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useIsMounted from "@src/hooks/useIsMounted";
import CreatorCopy from "@src/components/Lens/CreatorCopy";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { useGetRegisteredClubs } from "@src/hooks/useMoneyClubs";
import { ClubList, CreateClub, Holdings } from "@src/pagesComponents/Dashboard";
import { BONSAI_TOKEN_BASE_ADDRESS, BONSAI_NFT_BASE_ADDRESS, CONTRACT_CHAIN_ID, BENEFITS_AUTO_FEATURE_HOURS } from "@src/services/madfi/moneyClubs";
import { Tooltip } from "@src/components/Tooltip";
import { Modal } from "@src/components/Modal";
import BuyBonsaiModal from "@src/components/BuyBonsai/BuyBonsaiModal";
import { useClubs } from "@src/context/ClubsContext";
import { Header, Header2, Subtitle } from "@src/styles/text";
import { CheckIcon } from "@heroicons/react/outline";
import BulletCheck from "@src/components/Icons/BulletCheck";
import { Button } from "@src/components/Button";
import CreatorButton from "@src/components/Creators/CreatorButton";
import BonsaiNFTsSection from "@pagesComponents/Dashboard/BonsaiNFTsSection";
import { useGetBonsaiNFTs } from "@src/hooks/useGetBonsaiNFTs";
import ListItemCard from "@src/components/Shared/ListItemCard";
import { ActivityBanner } from "@src/components/Header";

const IndexPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const isMounted = useIsMounted();
  const { filteredClubs, setFilteredClubs, filterBy, setFilterBy } = useClubs();
  const [openBuyModal, setOpenBuyModal] = useState(false);
  const [page, setPage] = useState(0);
  const { data: authenticatedProfile, isLoading: isLoadingAuthenicatedProfile } = useAuthenticatedLensProfile();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useGetRegisteredClubs();
  const { data: bonsaiNFTs } = useGetBonsaiNFTs(address);
  const clubs = data?.pages.flatMap(page => page.clubs) || [];

  const { data: bonsaiBalance } = useReadContract({
    address: BONSAI_TOKEN_BASE_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address }
  });
  const { data: bonsaiBalanceNFT, isLoading: isLoadingNFT } = useReadContract({
    address: BONSAI_NFT_BASE_ADDRESS,
    abi: erc721Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address }
  });

  // const isDesktopOrLaptop = useMediaQuery({
  //   query: "(min-width: 1024px)",
  // });

  // fix hydration issues
  if (!isMounted) return null;
  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <ActivityBanner />
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8">
          <section aria-labelledby="dashboard-heading" className="pt-0 pb-24 max-w-full">
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-10 max-w-full">
              <div className="lg:col-span-7 max-w-full">
                {isLoading
                  ? <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#E42101" /></div>
                  : <ClubList
                    clubs={clubs}
                    setFilteredClubs={setFilteredClubs}
                    filteredClubs={filteredClubs}
                    filterBy={filterBy}
                    setFilterBy={setFilterBy}
                    isLoading={isLoading || isFetchingNextPage}
                    hasMore={hasNextPage}
                    fetchNextPage={fetchNextPage}
                  />
                }
              </div>
              <div className="lg:col-span-3 overflow-auto">
                {/* Profile */}
                {(!isConnected || !authenticatedProfile) && !isLoadingAuthenicatedProfile && <CreatorCopy isConnected={isConnected} isAuthenticatedProfile={!!authenticatedProfile} />}
                {isConnected && (
                  <div className="bg-card rounded-xl p-4 hidden lg:block">
                    {!!address &&
                      <>
                        <Holdings address={address} bonsaiAmount={bonsaiBalance ?? 0n} />
                        <BonsaiNFTsSection nfts={bonsaiNFTs} onBuyBonsai={() => setOpenBuyModal(true)} />
                      </>
                    }
                    {/* <div className="mt-4">
                      <Link href={`/profile/${authenticatedProfile.handle?.localName}`} passHref legacyBehavior>
                        <a style={{ cursor: "pointer" }}>
                          <Profile
                            profileData={authenticatedProfile}
                            theme={Theme.dark}
                            onClick={() => { }}
                            environment={LENS_ENVIRONMENT}
                            hideFollowButton={true}
                            containerStyle={{ width: "100%" }}
                            followButtonDisabled={true}
                            renderMadFiBadge={false}
                            skipFetchFollowers={true}
                          />
                        </a>
                      </Link>
                    </div> */}
                  </div>
                )}

                {/* Bonsai NFT Perks */}
                {!isConnected && (
                  <div className="relative lg:col-span-3">
                    <div className="rounded-xl p-6 w-full bg-card mt-1">
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
                          `Created tokens are auto-featured for ${BENEFITS_AUTO_FEATURE_HOURS}h`,
                          <>
                            Access to the{" "}<Link href="https://orb.club/c/bonsairooftop" passHref target="_blank">
                              <span className="link link-hover">Rooftop Club</span>
                            </Link>{" "}on Orb
                          </>
                        ]} />
                      </span>
                      <div className="bg-card-light rounded-xl px-3 py-[10px] flex flex-col gap-2 mt-8">
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
