import { NextPage } from "next";
import { ReactNode, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Profile, Theme } from "@madfi/widgets-react";
import Link from "next/link";
import { erc20Abi, erc721Abi, formatEther } from "viem";
import { HorizontalTicker } from "react-infinite-ticker";

import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useIsMounted from "@src/hooks/useIsMounted";
import CreatorCopy from "@src/components/Lens/CreatorCopy";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { useGetRegisterdClubs } from "@src/hooks/useMoneyClubs";
import { ClubList, CreateClub, Holdings } from "@src/pagesComponents/Dashboard";
import { kFormatter } from "@src/utils/utils";
import { BONSAI_TOKEN_BASE_ADDRESS, BONSAI_NFT_BASE_ADDRESS, CONTRACT_CHAIN_ID } from "@src/services/madfi/moneyClubs";
import { Tooltip } from "@src/components/Tooltip";
import { Modal } from "@src/components/Modal";
import BuyBonsaiModal from "@src/components/BuyBonsai/BuyBonsaiModal";
import { useClubs } from "@src/context/ClubsContext";
import Ticker1 from "@src/components/Ticker/Ticker";
import { Header2, Subtitle } from "@src/styles/text";
import { CheckIcon } from "@heroicons/react/outline";
import BulletCheck from "@src/components/Icons/BulletCheck";
import { Button } from "@src/components/Button";
import CreatorButton from "@src/components/Creators/CreatorButton";

const IndexPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const isMounted = useIsMounted();
  const { filteredClubs, setFilteredClubs, filterBy, setFilterBy } = useClubs();
  const [openBuyModal, setOpenBuyModal] = useState(false);
  const { data: authenticatedProfile, isLoading: isLoadingAuthenicatedProfile } = useAuthenticatedLensProfile();
  const { data: clubs, isLoading: isLoadingClubs } = useGetRegisterdClubs();

  // TODO: switch after zksync sepolia deployment
  const { data: bonsaiBalanceZkSync } = useReadContract({
    address: BONSAI_TOKEN_BASE_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address }
  });
  const { data: bonsaiNftZkSync } = useReadContract({
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

  const ListItem = (props: { children: ReactNode }) => {
    return <div className="flex items-center gap-[8px]"><BulletCheck />{props.children}</div>
  }
  const testStyle = "text-base leading-5 font-medium testStyle flex justify-center items-center h-10 min-w-[120px]";
  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <div className="w-full h-[40px] text-black mb-10" style={{
          background: "linear-gradient(90deg, var(--gradient-start) 0%, var(--gradient-end) 135.42%)"
        }}>
          <HorizontalTicker duration={40000}>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
            <p className={testStyle}>⾴ Bonsai time</p>
          </HorizontalTicker>
        </div>
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8">
          {/* <div className="flex flex-col md:flex-row items-center justify-between md:pt-6 md:pb-6 pt-2 pb-2 w-full gap-y-2">
            <div></div>

            <div className="md:hidden">
              <CreateClub />
            </div>
          </div> */}


          <section aria-labelledby="dashboard-heading" className="pt-8 pb-24 max-w-full">
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-10 max-w-full">
              <div className="lg:col-span-7 max-w-full">
                {isLoadingClubs
                  ? <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#E42101" /></div>
                  : <ClubList
                    clubs={[...clubs, ...clubs, ...clubs, ...clubs, ...clubs]}
                    setFilteredClubs={setFilteredClubs}
                    filteredClubs={filteredClubs}
                    filterBy={filterBy}
                    setFilterBy={setFilterBy}
                  />
                }
              </div>
              <div className="lg:col-span-3 overflow-auto">
                {/* Holdings
                <div>
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-y-4">
                    <h2 className="text-2xl font-owners tracking-wide leading-6">Holdings</h2>
                  </div>
                  <div className="rounded-md p-6 w-full border-dark-grey border-2 shadow-lg space-y-4 mt-4">
                    <Holdings address={address} />
                  </div>
                </div> */}

                {/* Profile */}
                {(!isConnected || !authenticatedProfile) && !isLoadingAuthenicatedProfile && <CreatorCopy />}
                {isConnected && authenticatedProfile && (
                  <div>
                    <div className="flex flex-col md:flex-row md:items-baseline md:justify-between">
                      <h2 className="text-2xl font-owners tracking-wide leading-6">Profile</h2>
                    </div>
                    <div className="mt-4">
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
                    </div>
                  </div>
                )}

                {/* Bonsai NFT Perks */}
                {!isConnected && (
                  <div className="relative lg:col-span-3">
                    <div className="rounded-xl p-6 w-full bg-card mt-1">
                      <div className="flex justify-between flex-col gap-[2px]">
                        <Header2>Bonsai benefits</Header2>
                        {/* <p className="text-md opacity-30 mt-1">Balance on zkSync Era</p>
                        <Tooltip message="100k tokens = 1 NFT" direction="top">
                          <p className="text-2xl font-owners tracking-wide">
                            {bonsaiBalanceZkSync !== undefined ? kFormatter(parseFloat(formatEther(BigInt(bonsaiBalanceZkSync.toString())))) : '-'}
                            {" | "}
                            {bonsaiNftZkSync !== undefined ? `${bonsaiNftZkSync.toString()} NFT${parseInt(bonsaiNftZkSync.toString()) > 1 ? 's' : ''}` : '-'}
                          </p>
                        </Tooltip> */}
                        <Subtitle>
                          Get an edge when creating or trading tokens
                        </Subtitle>
                      </div>
                      <span className="text-base gap-2 flex flex-col mt-6">
                        <ListItem>zero fees on creating and trading</ListItem>
                        <ListItem>auto-feature after creating</ListItem>
                        <ListItem>zero fees on uni v4 pools</ListItem>
                        <ListItem>access to the{" "}
                          <Link href="https://orb.club/c/bonsairooftop" passHref target="_blank">
                            <span className="link link-hover">Rooftop Club</span>
                          </Link>
                        </ListItem>
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
                      <Button
                        className="mt-6"
                        size="sm"
                        onClick={() => setOpenBuyModal(true)}
                      >
                        Buy $BONSAI
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </section>

          {/* Buy Bonsai Modal */}
          <Modal
            onClose={() => setOpenBuyModal(false)}
            open={openBuyModal}
            setOpen={setOpenBuyModal}
            panelClassnames="bg-background w-screen h-screen md:h-full md:w-[30vw]"
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

export default IndexPage;
