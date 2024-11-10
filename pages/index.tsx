import { NextPage } from "next";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Profile, Theme } from "@madfi/widgets-react";
import Link from "next/link";
import { erc20Abi, erc721Abi, formatEther } from "viem";

import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useIsMounted from "@src/hooks/useIsMounted";
import CreatorCopy from "@src/components/Lens/CreatorCopy";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { useGetRegisterdClubs } from "@src/hooks/useMoneyClubs";
import { ClubList, CreateClub, Holdings } from "@src/pagesComponents/Dashboard";
import { SearchClubs } from "@src/components/SearchApp/SearchClubs";
import { kFormatter } from "@src/utils/utils";
import { BONSAI_TOKEN_BASE_ADDRESS, BONSAI_NFT_BASE_ADDRESS, CONTRACT_CHAIN_ID } from "@src/services/madfi/moneyClubs";
import { Tooltip } from "@src/components/Tooltip";
import { Modal } from "@src/components/Modal";
import BuyBonsaiModal from "@src/components/BuyBonsai/BuyBonsaiModal";

const IndexPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const isMounted = useIsMounted();
  const [filteredClubs, setFilteredClubs] = useState<any[]>([]);
  const [filterBy, setFilterBy] = useState<string>("");
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

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between md:pt-6 md:pb-6 pt-2 pb-2 w-full gap-y-2">
            <div></div>

            <div className="flex-1 flex justify-center">
              <SearchClubs
                clubs={clubs}
                setFilteredClubs={setFilteredClubs}
                setFilterBy={setFilterBy}
              />
            </div>

            <div className="md:hidden">
              <CreateClub />
            </div>
          </div>

          <section aria-labelledby="dashboard-heading" className="pt-8 pb-24 max-w-full">
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-6 max-w-full">
              <div className="lg:col-span-2 overflow-auto">
                {/* Holdings */}
                <div>
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-y-4">
                    <h2 className="text-2xl font-owners tracking-wide leading-6">Holdings</h2>
                  </div>
                  <div className="rounded-md p-6 w-full border-dark-grey border-2 shadow-lg space-y-4 mt-4">
                    <Holdings address={address} />
                  </div>
                </div>

                {/* Profile */}
                {(!isConnected || !authenticatedProfile) && !isLoadingAuthenicatedProfile && <CreatorCopy />}
                {isConnected && authenticatedProfile && (
                  <div className="mt-8">
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
                {isConnected && (
                  <div className="relative lg:col-span-3 mt-8">
                    <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-y-4">
                      <h2 className="text-2xl font-owners tracking-wide leading-6 gradient-txt">Bonsai NFT Perks</h2>
                    </div>

                    <div className="rounded-md p-6 w-full border-dark-grey border-2 shadow-lg space-y-4 mt-4">
                      <div className="flex justify-between">
                        <p className="text-md opacity-30 mt-1">Balance on zkSync Era</p>
                        <Tooltip message="100k tokens = 1 NFT" direction="top">
                          <p className="text-2xl font-owners tracking-wide">
                            {bonsaiBalanceZkSync ? kFormatter(parseFloat(formatEther(BigInt(bonsaiBalanceZkSync.toString())))) : '-'}
                            {" | "}
                            {bonsaiNftZkSync ? `${bonsaiNftZkSync.toString()} NFT${parseInt(bonsaiNftZkSync.toString()) > 1 ? 's' : ''}` : '-'}
                          </p>
                        </Tooltip>
                      </div>
                      <ul className="text-md pl-2">
                        <li>✅ zero fees on creating and trading</li>
                        <li>✅ auto-feature after creating</li>
                        <li>✅ zero fees on uni v4 pools</li>
                        <li>✅ access to the{" "}
                          <Link href="https://orb.club/c/bonsairooftop" passHref target="_blank">
                            <span className="link link-hover mb-2">Rooftop Club</span>
                          </Link>
                        </li>
                      </ul>

                      <div className="flex justify-center text-sm">
                        <div className="absolute right-6 bottom-2">
                          <span
                            className="font-bold opacity-40 link link-hover mb-2"
                            onClick={() => setOpenBuyModal(true)}
                          >
                            Buy more
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="lg:col-span-4 max-w-full">
                {isLoadingClubs
                  ? <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#E42101" /></div>
                  : <ClubList
                    clubs={clubs}
                    setFilteredClubs={setFilteredClubs}
                    filteredClubs={filteredClubs}
                    filterBy={filterBy}
                    setFilterBy={setFilterBy}
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
