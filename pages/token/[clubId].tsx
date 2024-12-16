import clsx from 'clsx';
import { GetServerSideProps, NextPage } from "next";
import Script from "next/script";
import { useMemo, useState, ReactNode } from "react";
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
import { Header, Header2, Subtitle, BodySemiBold } from "@src/styles/text";

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

enum PriceChangePeriod {
  fiveMinutes = '5m',
  oneHour = '1h',
  sixHours = '6h',
  twentyFourHours = '24h',
}

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

  const InfoCard: React.FC<{ title: string; subtitle: ReactNode, roundedLeft: boolean, roundedRight: boolean }> = ({ title, subtitle, roundedLeft, roundedRight }) => (
    <div className={clsx("min-w-[88px] flex flex-col items-center justify-center border border-card-light py-2 px-4 bg-card-light", roundedLeft && 'rounded-l-xl', roundedRight && 'rounded-r-xl')}>
      <Subtitle className="text-xs">{title}</Subtitle>
      <span>{subtitle}</span>
    </div>
  );

  const InfoLine: React.FC<{ title: string; subtitle: ReactNode }> = ({ title, subtitle }) => (
    <div className={clsx("flex flex-col items-start justify-center gap-[2px]")}>
      <Subtitle>{title}</Subtitle>
      <BodySemiBold>{subtitle}</BodySemiBold>
    </div>
  );

  const tradeForPeriod = (period: PriceChangePeriod) => {
    // TODO: fetch trade data for rest of periods
    switch (period) {
      default:
        return club.prevTrade24Hr ?? [];
    }
  }

  const PriceChangeString: React.FC<{ period: PriceChangePeriod }> = ({ period }) => {
    const previousTrades = tradeForPeriod(period);
    const previousPrice = previousTrades.length > 0 ? previousTrades[0].price : 0;
    const priceDelta = previousTrades.length > 0 ? calculatePriceDelta(holding.club.currentPrice, previousPrice) : {valuePct: 0, positive: false};
    const percentChange = priceDelta.valuePct;
    const textColor = percentChange === 0 ? 'text-white/60' : (percentChange > 0 ? "text-bullish" : "text-bearish");
   return  (
   <Subtitle className={clsx(textColor)}>
      {percentChange}%
    </Subtitle>
   );
  }

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8">
          {/* <div className="flex flex-col md:flex-row md:items-baseline md:justify-between border-pt-12 pb-4">
            {/* <div className="flex items-center gap-x-4">
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
              <div className="flex flex-col md:flex-row md:items-center md:justify-end md:w-auto items-end">
                <span className="text-2xl font-bold font-owners tracking-wide mt-4 gradient-txt">
                  {`Earnings: $${roundedToFixed(parseFloat(formatUnits(BigInt(club.creatorFees), USDC_DECIMALS)), 2)}`}
                </span>
              </div>
            )}
          </div> */}

          <section aria-labelledby="dashboard-heading" className="pt-4 max-w-full">
            <h2 id="dashboard-heading" className="sr-only">
              {profile?.metadata?.displayName}
            </h2>

            <div className="grid grid-cols-1 gap-x-7 gap-y-10 lg:grid-cols-4 max-w-full">
                <div className="md:col-span-3">
                  <div className="relative w-full h-[84px] rounded-t-3xl bg-true-black overflow-hidden bg-clip-border">
                    <div className="absolute inset-0" style={{ filter: 'blur(40px)' }}>
                      <img
                        src={club.token.image}
                        alt={club.token.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-true-black to-transparent"></div>

                    <div className="relative z-10 p-3 pb-6 flex justify-between items-center">
                      <div className='flex flex-row items-center'>
                        <img
                          src={club.token.image}
                          alt={club.token.name}
                          className="w-[48px] h-[48px] object-cover rounded-xl"
                        />
                        <div className="flex flex-col ml-2">
                          <Header2 className="text-white">${club.token.symbol}</Header2>
                          <BodySemiBold className="text-white/60 font-medium">{club.token.name}</BodySemiBold>
                        </div>
                      </div>
                      <div className="flex flex-row items-center gap-2">
                        <InfoCard title='Network' subtitle={
                          <div className='flex gap-1 items-center'>
                            <img 
                              src='/base.png'
                              alt={'base'}
                              className="w-[12px] h-[12px]" 
                            />
                            <Subtitle className='text-white'>
                              Base
                              </Subtitle>
                              </div>
                          }
                          roundedRight
                          roundedLeft
                          />
                          <div className="flex flex-row items-center">
                      <InfoCard title='5m' subtitle={
                          <PriceChangeString period={PriceChangePeriod.fiveMinutes} />
                      }
                        roundedLeft
                      />
                      <InfoCard title='1h' subtitle={
                          <PriceChangeString period={PriceChangePeriod.oneHour} />
                      }/>
                      <InfoCard title='6h' subtitle={
                          <PriceChangeString period={PriceChangePeriod.sixHours} />
                      }/>
                        <InfoCard title='24h' subtitle={
                          <PriceChangeString period={PriceChangePeriod.twentyFourHours} />
                        } 
                        roundedRight
                        />
                      </div>
                      </div>
                    </div>
                  </div>
                  <div className='px-3'>
                  <InfoComponent
                      club={club}
                      address={address}
                      profile={{}}
                      isCreatorAdmin={isCreatorAdmin}
                    />
                  <Script
                    src="/static/datafeeds/udf/dist/bundle.js"
                    strategy="lazyOnload"
                    onReady={() => {
                      setIsScriptReady(true);
                    }}
                  />
                  <div className='border border-card bg-card-light rounded-2xl mt-5'>
                    <div className="rounded-2xl m-2 overflow-hidden">
                      {isScriptReady && <Chart height='500px' symbol={club.token.symbol} />}
                    </div>
                  </div>
                </div>
                <div className='flex justify-center items-center mt-5 gap-1'>
                  <div className='bg-white min-w-[240px] h-[56px] rounded-[20px] p-[2px]'>
                    <div className='p-[2px] h-full w-[80%] rounded-[20px] py-2 px-3 flex flex-col ' 
                      style={{
                        background: "linear-gradient(90deg, #FFD050 0%, #FF6400 171.13%)",
                      }}
                    >
                    <Subtitle className='text-black/60'>
                      Bonding curve
                    </Subtitle>
                    <BodySemiBold className='text-black'>
                        80%
                    </BodySemiBold>
                    </div>
                  </div>
                  <div className='bg-white min-w-[240px] h-[56px] rounded-[20px] p-2'>
                    Bonding curve
                  </div>
                  <div className='bg-white min-w-[240px] h-[56px] rounded-[20px] p-2'>
                    Bonding curve
                  </div>
                </div>
                {/* Info, Trade */}
                {/* <div className="rounded-md md:p-10 p-6 w-full border-dark-grey border-2 shadow-lg space-y-4 mt-4 grid grid-cols-1 lg:grid-cols-2 gap-x-24">
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

              <div className="md:col-span-1">
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
