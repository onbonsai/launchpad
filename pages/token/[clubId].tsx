import clsx from 'clsx';
import { GetServerSideProps, NextPage } from "next";
import Script from "next/script";
import { useMemo, useState, ReactNode } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { getAddress } from "viem";
import dynamic from "next/dynamic";
import { usePrivy } from "@privy-io/react-auth";
import { last } from "lodash/array";

import { Modal } from "@src/components/Modal";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useLensSignIn from "@src/hooks/useLensSignIn";
import useIsMounted from "@src/hooks/useIsMounted";
import { LivestreamConfig } from "@src/components/Creators/CreatePost";
import { Feed } from "@src/pagesComponents/Club";
import LoginWithLensModal from "@src/components/Lens/LoginWithLensModal";
import { BENEFITS_AUTO_FEATURE_HOURS, getRegisteredClubById} from "@src/services/madfi/moneyClubs";
import { getClientWithClubs } from "@src/services/mongo/client";
import { Tabs, Trades, InfoComponent, HolderDistribution } from "@src/pagesComponents/Club";
import { ActivityBanner } from "@src/components/Header";
import { Header2, Subtitle, BodySemiBold } from "@src/styles/text";
import { BottomInfoComponent } from '@pagesComponents/Club/BottomInfoComponent';
import { useGetTradingInfo } from '@src/hooks/useMoneyClubs';
import { localizeNumber } from '@src/constants/utils';

const CreateSpaceModal = dynamic(() => import("@src/components/Creators/CreateSpaceModal"));
const Chart = dynamic(() => import("@src/pagesComponents/Club/Chart"), { ssr: false });

type Token = {
  name: string;
  symbol: string;
  image: string;
};

export type Club = {
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
  const { data: tradingInfo } = useGetTradingInfo(club.clubId);

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

  const InfoCard: React.FC<{ title: string; subtitle: ReactNode, roundedLeft?: boolean, roundedRight?: boolean }> = ({ title, subtitle, roundedLeft, roundedRight }) => (
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

  const PriceChangeString: React.FC<{ period: PriceChangePeriod }> = ({ period }) => {
    const priceDelta = tradingInfo ? tradingInfo.priceDeltas[period] : "0";
    const textColor = priceDelta === "0" || priceDelta === "-0" ? 'text-white/60' : (priceDelta.includes("+") ? "text-bullish" : "text-bearish");
    return (
      <Subtitle className={clsx(textColor)}>
        {localizeNumber(Number(priceDelta) / 100, "percent")}
      </Subtitle>
    );
  }

  const infoCardRow = () => (
    <>
    <InfoCard title='5m' subtitle={
      <PriceChangeString period={PriceChangePeriod.fiveMinutes} />
    }
      roundedLeft
    />
    <InfoCard title='1h' subtitle={
      <PriceChangeString period={PriceChangePeriod.oneHour} />
    } />
    <InfoCard title='6h' subtitle={
      <PriceChangeString period={PriceChangePeriod.sixHours} />
    } />
    <InfoCard title='24h' subtitle={
      <PriceChangeString period={PriceChangePeriod.twentyFourHours} />
    }
      roundedRight
    />
    </>
  );

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <ActivityBanner />
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 md:px-4 sm:px-6 lg:px-8">
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

          <section aria-labelledby="dashboard-heading" className="pt-0 md:pt-4 max-w-full">
            <h2 id="dashboard-heading" className="sr-only">
              {profile?.metadata?.displayName}
            </h2>

            <div className="grid grid-cols-1 gap-x-7 gap-y-10 lg:grid-cols-4 max-w-full">
              {/* Chart */}
              <div className="md:col-span-3">
                <div className="relative w-full h-[168px] md:h-[84px] rounded-t-3xl bg-true-black overflow-hidden bg-clip-border">
                  <div className="absolute inset-0" style={{ filter: 'blur(40px)' }}>
                    <img
                      src={club.token.image}
                      alt={club.token.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-true-black to-transparent"></div>

                  <div className="relative z-10 p-3 pb-6 flex flex-col justify-between items-center">
                    <div className="flex flex-row justify-between items-center w-full">
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
                      <div className="flex-row items-center hidden md:flex">
                        {infoCardRow()}
                      </div>
                      </div>
                    </div>
                    <div className="flex-row pt-4 justify-end items-center flex md:hidden ">
                        {infoCardRow()}
                      </div>
                  </div>
                </div>
                <div className='px-0 md:px-3'>
                  <InfoComponent
                    club={club}
                    address={address}
                    tradingInfo={tradingInfo}
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
                      {isScriptReady && <Chart symbol={club.token.symbol} />}
                    </div>
                  </div>
                </div>
                <BottomInfoComponent club={club} address={address} />
              </div>

              {/* Feed/Trades/Holders */}
              <div className="md:col-span-1 max-h-[90vh] mb-[100px] md:mb-0 relative">
                <div className="mb-4">
                  <Tabs openTab={openTab} setOpenTab={setOpenTab} />
                </div>
                {/* Feed - only show for Lens profiles atm */}
                {openTab === 1 && type === "lens" && (
                  <Feed pubId={club.pubId} morePadding={true}/>
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
        panelClassnames="bg-card w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
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
        panelClassnames="bg-card w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
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

  clubSocial.featured = !!clubSocial?.featureStartAt && (Date.now() / 1000) < (parseInt(clubSocial.featureStartAt) + BENEFITS_AUTO_FEATURE_HOURS * 60 * 60);
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
