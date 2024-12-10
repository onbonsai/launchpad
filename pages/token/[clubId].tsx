import { GetServerSideProps, NextPage } from "next";
import Script from "next/script";
import { useMemo, useState } from "react";
import { useAccount, useWalletClient, useReadContract } from "wagmi";
import { formatUnits, getAddress } from "viem";
import dynamic from "next/dynamic";
import { VideoCameraIcon } from "@heroicons/react/solid";
import { usePrivy } from "@privy-io/react-auth";
import { last } from "lodash/array";

import { Modal } from "@src/components/Modal";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { followProfile } from "@src/services/lens/follow";
import useLensSignIn from "@src/hooks/useLensSignIn";
import useIsMounted from "@src/hooks/useIsMounted";
import { LivestreamConfig } from "@src/components/Creators/CreatePost";
import { Feed } from "@src/pagesComponents/Club";
import LoginWithLensModal from "@src/components/Lens/LoginWithLensModal";
import { getRegisteredClubById, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { getClientWithClubs } from "@src/services/mongo/client";
import { Tabs, Trades, InfoComponent, TradeComponent, HolderDistribution } from "@src/pagesComponents/Club";
import { roundedToFixed } from "@src/utils/utils";

const CreateSpaceModal = dynamic(() => import("@src/components/Creators/CreateSpaceModal"));
const Chart = dynamic(() => import("@src/pagesComponents/Club/Chart"), { ssr: false });

type Token = {
  name: string;
  symbol: string;
  image: string;
};

type Club = {
  __typename: 'Club';
  id: string;
  creator: string;
  initialSupply: string;
  createdAt: string;
  supply: string;
  feesEarned: string;
  currentPrice: string;
  marketCap: string;
  prevTrade24Hr: object; // Replace 'object' with a more specific type if available
  clubId: number;
  profileId: string;
  strategy: string;
  handle: string;
  token: Token;
  pubId: string;
  featured: boolean;
  creatorFees: string;
};

interface TokenPageProps {
  club: Club;
  profile: any;
  creatorInfo: any;
  type: string // lens
}

const profileAddress = (profile, creatorInfoAddress?: string) =>
  creatorInfoAddress ||
  profile?.ownedBy?.address ||
  (profile?.userAssociatedAddresses?.length ? last(profile?.userAssociatedAddresses) : null) ||
  profile?.address;

const TokenPage: NextPage<TokenPageProps> = ({
  club,
  profile,
  creatorInfo,
  type,
}: TokenPageProps) => {
  const isMounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { ready } = usePrivy();
  const { authenticatedProfileId } = useLensSignIn(walletClient);

  const [createSpaceModal, setCreateSpaceModal] = useState(false);
  const [openSignInModal, setOpenSignInModal] = useState(false);
  const [openTab, setOpenTab] = useState<number>(type === "lens" ? 1 : 5);
  const [livestreamConfig, setLivestreamConfig] = useState<LivestreamConfig | undefined>();
  const [isScriptReady, setIsScriptReady] = useState(false);
  // const [canFollow, setCanFollow] = useState(false);
  // const [isFollowed, setIsFollowed] = useState(false);

  // for admin stuff unrelated to lens (ex: livestreams, claim fees)
  const isCreatorAdmin = useMemo(() => (
    address && getAddress(creatorInfo?.address) === getAddress(address)
  ), [creatorInfo, address]);

  // const onFollowClick = async (e: React.MouseEvent) => {
  //   e.preventDefault();

  //   if (type === "farcaster") {
  //     window.open(`https://warpcast.com/${profile.username}`, "_blank");
  //     return;
  //   }

  //   if (!isAuthenticated) return;

  //   const toastId = toast.loading("Following...");
  //   try {
  //     await followProfile(walletClient, (profile as ProfileFragment).id);
  //     setIsFollowed(true);
  //     toast.success("Followed", { id: toastId });
  //   } catch (error) {
  //     console.log(error);
  //     toast.error("Unable to follow", { id: toastId });
  //   }
  // };

  if (!isMounted) return null;

  if (!ready)
    return (
      <div className="bg-background text-secondary min-h-[50vh]">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-28 pb-4">
          <div className="flex justify-center">
            <Spinner customClasses="h-6 w-6" color="#E42101" />
          </div>
        </main>
      </div>
    );

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between border-b border-dark-grey pt-12 pb-4">
            <div className="flex items-center gap-x-4">
              <h1 className="text-3xl md:text-5xl font-bold font-owners tracking-wide">
                {`${club.token.name} ($${club.token.symbol})`}
              </h1>
              {club.featured && (
                <span className="text-2xl font-bold font-owners tracking-wide gradient-txt mt-4">
                  Featured
                </span>
              )}
            </div>

            {isCreatorAdmin && (
              <div className="flex flex-col md:flex-row md:items-start md:items-center md:justify-end md:w-auto items-end">
                <span className="text-2xl font-bold font-owners tracking-wide mt-4 gradient-txt">
                  {`Earnings: $${roundedToFixed(parseFloat(formatUnits(BigInt(club.creatorFees), USDC_DECIMALS)), 2)}`}
                </span>
              </div>
            )}

            {/* {isConnected && (
              <div className="flex flex-col md:flex-row items-start md:items-center md:justify-end md:w-auto">
                {isCreatorAdmin && (
                  <Button
                    variant="accent"
                    className="w-full mb-2 mr-4 md:mb-0 text-base"
                    onClick={() => setCreateSpaceModal(true)}
                  >
                    <VideoCameraIcon width={20} height={20} className="text-white inline-block mr-2" />
                    Go live
                  </Button>
                )}
              </div>
            )} */}
          </div>

          <section aria-labelledby="dashboard-heading" className="pt-4 max-w-full">
            <h2 id="dashboard-heading" className="sr-only">
              {profile?.metadata?.displayName}
            </h2>

            <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-6 max-w-full">
              <div className="lg:col-span-4 p-2">
                <div className="lg:col-span-3">
                  <Script
                    src="/static/datafeeds/udf/dist/bundle.js"
                    strategy="lazyOnload"
                    onReady={() => {
                      setIsScriptReady(true);
                    }}
                  />
                  <div className="rounded-md mt-4 p-4 w-full border-dark-grey border-2 shadow-lg">
                    {isScriptReady && <Chart symbol={club.token.symbol} />}
                  </div>
                </div>
                {/* Info, Trade */}
                <div className="rounded-md md:p-10 p-6 w-full border-dark-grey border-2 shadow-lg space-y-4 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-x-24">
                  <div>
                    <InfoComponent
                      club={club}
                      address={address}
                      profile={{}}
                      isCreatorAdmin={isCreatorAdmin}
                    />
                  </div>
                  <div>
                    <TradeComponent club={club} address={address} />
                  </div>
                </div>
                {/* TODO: creator admin panel to claim fees, create agent with handle if club.completed */}
              </div>

              <div className="lg:col-span-2">
                <div className="md:pr-6">
                  <Tabs openTab={openTab} setOpenTab={setOpenTab} />
                </div>
                {/* Feed - only show for Lens profiles atm */}
                {openTab === 1 && type === "lens" && (
                  <Feed pubId={club.pubId} />
                )}
                {openTab === 2 && (
                  <Trades clubId={club.clubId} />
                )}
                {openTab === 3 && (
                  <HolderDistribution clubId={club.clubId} supply={club.supply} creator={club.creator} />
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Create Space Modal */}
      <Modal
        onClose={() => setCreateSpaceModal(false)}
        open={createSpaceModal}
        setOpen={setCreateSpaceModal}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <CreateSpaceModal
          profile={profile}
          livestreamConfig={livestreamConfig}
          setLivestreamConfig={setLivestreamConfig}
          closeModal={() => setCreateSpaceModal(false)}
          moneyClubId={club?.id}
        />
      </Modal>

      {/* Login Modal */}
      <Modal
        onClose={() => setOpenSignInModal(false)}
        open={openSignInModal}
        setOpen={setOpenSignInModal}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <LoginWithLensModal closeModal={() => setOpenSignInModal(false)} />
      </Modal>
    </div>
  );
};

export default TokenPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    query: { clubId },
  } = context;

  if (!clubId) {
    return {
      redirect: {
        permanent: false,
        destination: "/dashboard",
      },
    };
  }

  const [_club, clubSocial] = await Promise.all([
    getRegisteredClubById(clubId! as string),
    (async () => {
      const { collection } = await getClientWithClubs();
      return await collection.findOne({ clubId: parseInt(clubId! as string) }, { projection: { _id: 0 } });
    })()
  ]);

  clubSocial.featured = !!clubSocial?.featureStartAt && (Date.now() / 1000) < (parseInt(clubSocial.featureStartAt) + 48 * 60 * 60);
  const club = JSON.parse(JSON.stringify({ ..._club, ...clubSocial }));

  return {
    props: {
      pageName: "token",
      club,
      profile: { id: club.profileId || "", ownedBy: club.creator },
      creatorInfo: { address: club.creator },
      type: "lens",
    }
  };
};
