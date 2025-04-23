import clsx from 'clsx';
import { GetServerSideProps, NextPage } from "next";
import Script from "next/script";
import { useMemo, useState, ReactNode, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatUnits, getAddress, isAddress, zeroAddress } from "viem";
import dynamic from "next/dynamic";
import toast from 'react-hot-toast';
import { useSIWE } from 'connectkit';

import { Modal } from "@src/components/Modal";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useIsMounted from "@src/hooks/useIsMounted";
import { Feed } from "@src/pagesComponents/Club";
import LoginWithLensModal from "@src/components/Lens/LoginWithLensModal";
import { getRegisteredClubById, FLAT_THRESHOLD, WHITELISTED_UNI_HOOKS, type Club, V1_LAUNCHPAD_URL } from "@src/services/madfi/moneyClubs";
import { getClientWithClubs, getClientWithMedia } from "@src/services/mongo/client";
import { Tabs, Trades, InfoComponent, HolderDistribution } from "@src/pagesComponents/Club";
import { Header2, Subtitle, BodySemiBold, SmallSubtitle } from "@src/styles/text";
import { BottomInfoComponent } from '@pagesComponents/Club/BottomInfoComponent';
import { FairLaunchModeComponent } from '@pagesComponents/Club/FairLaunchModeComponent';
import { useGetAvailableBalance, useGetClubSupply, useGetTradingInfo } from '@src/hooks/useMoneyClubs';
import { releaseLiquidity as releaseLiquidityTransaction } from "@src/services/madfi/moneyClubs";
import { localizeNumber } from '@src/constants/utils';
import WalletButton from '@src/components/Creators/WalletButton';
import { Button } from '@src/components/Button';
import { ShareClub } from '@src/pagesComponents/Club';
import { capitalizeFirstLetter } from '@src/utils/utils';
import { useResolveSmartMedia } from '@src/services/madfi/studio';
import useGetPublicationWithComments from '@src/hooks/useGetPublicationWithComments';
import { IS_PRODUCTION } from '@src/services/madfi/utils';
import { SITE_URL } from '@src/constants/constants';

const Chart = dynamic(() => import("@src/pagesComponents/Club/Chart"), { ssr: false });

interface TokenPageProps {
  club: Club;
  profile: any;
  creatorInfo: any;
  type: string // lens
}

enum PriceChangePeriod {
  fiveMinutes = '5m',
  oneHour = '1h',
  sixHours = '6h',
  twentyFourHours = '24h',
}

// creates the ticking effect for vesting balances
const useVestingProgress = (
  availableBalance: bigint,
  vestingBalance: bigint,
  liquidityReleasedAt: number,
  vestingDuration: string
) => {
  const [current, setCurrent] = useState({
    available: availableBalance,
    vesting: vestingBalance
  });

  // Store the initial timestamp when the hook is first called
  const [initialTimestamp] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!liquidityReleasedAt) {
      return;
    }

    const calculateProgress = () => {
      const now = Math.floor(Date.now() / 1000);
      // Calculate time elapsed from when the hook was initialized
      const timeElapsed = now - initialTimestamp;
      const totalDuration = Number(vestingDuration);
      
      // Calculate remaining duration from when hook was initialized
      const remainingDuration = totalDuration - (initialTimestamp - liquidityReleasedAt);

      if (timeElapsed >= remainingDuration) {
        setCurrent({
          available: availableBalance + vestingBalance,
          vesting: 0n
        });
        return;
      }

      const progress = timeElapsed / remainingDuration;
      const additionalVestedAmount = vestingBalance * BigInt(Math.floor(progress * 1e18)) / BigInt(1e18);

      setCurrent({
        available: availableBalance + additionalVestedAmount,
        vesting: vestingBalance - additionalVestedAmount
      });
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 1000);
    return () => clearInterval(interval);
  }, [availableBalance, vestingBalance, liquidityReleasedAt, vestingDuration, initialTimestamp]);

  return current;
};

const TokenPage: NextPage<TokenPageProps> = ({
  club,
  profile,
  creatorInfo,
  type,
}: TokenPageProps) => {
  const postId = club.postId || club.pubId;
  const isMounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const { isReady: ready } = useSIWE();
  const { data: tradingInfo } = useGetTradingInfo(club.clubId, club.chain);
  const { data: vestingData } = useGetAvailableBalance(club.tokenAddress || zeroAddress, address, club.complete, club.chain)
  const { data: totalSupply, isLoading: isLoadingTotalSupply } = useGetClubSupply(club.tokenAddress, club.chain);
  const { data: publicationWithComments, isLoading } = useGetPublicationWithComments(postId as string);
  const { data: media } = useResolveSmartMedia(publicationWithComments?.publication?.metadata?.attributes, postId);

  console.log('vestingData', vestingData)

  const vestingProgress = useVestingProgress(
    vestingData?.availableBalance || 0n,
    vestingData?.vestingBalance || 0n,
    club.liquidityReleasedAt || 0,
    club.vestingDuration
  );

  const [openSignInModal, setOpenSignInModal] = useState(false);
  const [openTab, setOpenTab] = useState<number>(type === "lens" && !!postId ? 1 : 2);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const fairLaunchMode = !isLoadingTotalSupply && (totalSupply! < FLAT_THRESHOLD);

  const vestingInfo = useMemo(() => {
    const vestingDurationInHours = parseInt(club.vestingDuration) / 3600;
    const vestingDurationInDays = vestingDurationInHours / 24;
    const vestingDurationInWeeks = vestingDurationInDays / 7;

    let vestingDurationString = `${vestingDurationInHours} hours`;

    if (vestingDurationInWeeks >= 1) {
      vestingDurationString = `${vestingDurationInWeeks} weeks`;
    } else if (vestingDurationInDays >= 1) {
      vestingDurationString = `${vestingDurationInDays} days`;
    }

    return `${parseInt(club.cliffPercent) / 100}% cliff; linear vesting over ${vestingDurationString}`;
  }, [club]);

  const hookInfo = useMemo(() => {
    const defaultHookInfo = {
      name: 'No Hook',
      label: 'Standard trading enabled'
    };

    const hooks = Object.keys(WHITELISTED_UNI_HOOKS).reduce((acc, key) => {
      acc[WHITELISTED_UNI_HOOKS[key].contractAddress.toLowerCase()] = {
        ...WHITELISTED_UNI_HOOKS[key],
        name: key.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
      };
      return acc;
    }, {} as Record<string, any>);

    // Add handling for zero address and unknown hooks
    hooks[zeroAddress] = defaultHookInfo;

    return new Proxy(hooks, {
      get: (target, prop) => target[prop] || defaultHookInfo
    });
  }, [WHITELISTED_UNI_HOOKS]);

  if (!isMounted) return null;

  const releaseLiquidity = async () => {
    let toastId;
    setIsReleasing(true)

    try {
      toastId = toast.loading("Creating pool...");
      // also triggers token swap in the backend
      await releaseLiquidityTransaction(club.clubId.toString(), club.creator as `0x${string}`, club.tokenAddress as `0x${string}`, club.chain);
      toast.success('Pool created!', { id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed to create the pool", { id: toastId });
      setIsReleasing(false)
    }
    setIsReleasing(false)
  };

  if (!ready)
    return (
      <div className="bg-background text-secondary min-h-[50vh]">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-28 pb-4">
          <div className="flex justify-center">
            <Spinner customClasses="h-6 w-6" color="#5be39d" />
          </div>
        </main>
      </div>
    );

  const InfoCard: React.FC<{ title?: string; subtitle: ReactNode, roundedLeft?: boolean, roundedRight?: boolean, className?: string }> = ({ title, subtitle, roundedLeft, roundedRight, className }) => (
    <div className={clsx("min-w-[88px] flex flex-col items-center justify-center border border-card-light py-2 px-4 bg-card-light", roundedLeft && 'rounded-l-xl', roundedRight && 'rounded-r-xl', className || "")}>
      {title ? (
        <>
          <Subtitle className="text-xs">{title}</Subtitle>
          <span>{subtitle}</span>
        </>
      ) : (
        <div className="h-8 flex items-center">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );

  const PriceChangeString: React.FC<{ period: PriceChangePeriod }> = ({ period }) => {
    const priceDelta = tradingInfo ? tradingInfo.priceDeltas[period] : "0";
    const textColor = priceDelta === "0" || priceDelta === "-0" ? 'text-white/60' : (priceDelta.includes("+") ? "!text-bullish" : "!text-bearish");
    return (
      <Subtitle className={clsx(textColor)}>
        {localizeNumber(Number(priceDelta) / 100, "percent")}
      </Subtitle>
    );
  }

  const infoCardRow = () => {
    if (fairLaunchMode) return null;

    return (
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
    )
  }

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 md:px-4 sm:px-6 lg:px-8">
          <section aria-labelledby="dashboard-heading" className="pt-0 md:pt-4 max-w-full">
            <div className="grid grid-cols-1 gap-x-7 gap-y-10 lg:grid-cols-12 max-w-full">
              {/* Chart */}
              <div className={clsx("lg:col-span-8 rounded-3xl", club.featured && "animate-pulse")}>
                <div className={"relative w-full h-[168px] md:h-[84px] rounded-t-3xl bg-true-black overflow-hidden bg-clip-border"}>
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
                          className="w-[64px] h-[64px] object-cover rounded-lg"
                        />
                        <div className="flex flex-col ml-2">
                          <div className="flex flex-row justify-between gap-x-8 w-full">
                            <div className="flex flex-col">
                              <div className="flex flex-row space-x-4">
                                <Header2 className={"text-white"}>${club.token.symbol}</Header2>
                              </div>
                              <BodySemiBold className={`text-white/60 ${isConnected && "mt-1"}`}>{club.token.name}</BodySemiBold>
                            </div>
                            {!!club.liquidityReleasedAt && (
                              <div className="flex flex-col ml-20">
                                <a href={`https://kyberswap.com/swap/base/0x474f4cb764df9da079d94052fed39625c147c12c-to-${club.tokenAddress}`} target="_blank" rel="noopener noreferrer">
                                  <BodySemiBold className="text-white/60 font-medium">
                                    Kyberswap
                                  </BodySemiBold>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row items-center">
                        <InfoCard title='' subtitle={
                          <div className='flex gap-1 items-center'>
                            <ShareClub chain={club.chain} tokenAddress={club.tokenAddress} symbol={club.token.name} />
                          </div>
                        }
                          roundedLeft
                        />
                        <InfoCard title='Chain' subtitle={
                          <div className='flex gap-1 items-center'>
                            <img
                              src={`/${club.chain}.png`}
                              alt={club.chain}
                              className="h-[12px] opacity-75"
                            />
                            <Subtitle className='text-white'>
                              {capitalizeFirstLetter(club.chain)}
                            </Subtitle>
                          </div>
                        } />
                        <InfoCard title='CA' subtitle={
                          <div className='flex gap-1 items-center'>
                            <WalletButton wallet={club.tokenAddress!} />
                          </div>
                        }
                          roundedRight
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
                <div className='px-4 md:px-3 mt-2 space-y-1'>
                  <Subtitle className="items-start">{club.token.description}</Subtitle>
                  <SmallSubtitle className="items-start text-[12px]">{vestingInfo} | {`${hookInfo[club.hook].name}: ${hookInfo[club.hook].label}`}</SmallSubtitle>
                </div>
                <div className='px-0'>
                  <InfoComponent
                    club={club}
                    address={address}
                    tradingInfo={tradingInfo}
                    totalSupply={totalSupply}
                  />
                  {club.completedAt && club.liquidityReleasedAt ?
                    <div className="flex flex-col w-[100%] justify-center items-center mt-20">
                      <Header2 className="text-white font-medium">
                        ${club.token.symbol}/BONSAI pool is live
                      </Header2>
                      <a href={`https://kyberswap.com/swap/base/0x474f4cb764df9da079d94052fed39625c147c12c-to-${club.tokenAddress}`} target="_blank" rel="noopener noreferrer" className='my-4'>
                        <Button variant="accentBrand" className="text-white mt-4">
                          Trade on Kyberswap
                        </Button>
                      </a>
                      <p>{`${hookInfo[club.hook].name}: ${hookInfo[club.hook].label}`}</p>
                      <div className='mt-6 text-center'>
                        {club.liquidityReleasedAt && vestingData && (
                          <>
                            <div className='flex justify-center items-center space-x-2'>
                              <span className='text-xl'>Available balance:</span>
                              <span className='text-xl font-mono min-w-[120px] text-left'>
                                {localizeNumber(formatUnits(vestingProgress.available, 18), "decimal", 2)}
                              </span>
                            </div>
                            <div className='flex justify-center items-center space-x-2'>
                              <span className='text-xl'>Vesting balance:</span>
                              <span className='text-xl font-mono min-w-[120px] text-left'>
                                {localizeNumber(formatUnits(vestingProgress.vesting, 18), "decimal", 2)}
                              </span>
                            </div>
                            <div className='flex justify-center items-center space-x-2'>
                              <span className='text-xl'>Total balance:</span>
                              <span className='text-xl font-mono min-w-[120px] text-left'>
                                {localizeNumber(formatUnits(vestingData.totalBalance || 0n, 18), "decimal", 2)}
                              </span>
                            </div>
                            <hr className='my-4 opacity-70' />
                            <p className='mt-4 text-md'>Vesting Complete: {new Date((club.liquidityReleasedAt + Number(club.vestingDuration)) * 1000).toLocaleString()}</p>
                          </>
                        )}
                      </div>
                    </div>
                    : club.complete ?
                      <div className="flex flex-col w-[100%] justify-center items-center mt-20">
                        <Header2 className="text-white font-medium">
                          ${club.token.symbol} is ready to graduate!
                        </Header2>
                        <p className='mt-4 max-w-lg text-center'>${club.token.symbol} will be released shortly to Uniswap where it will be live for trading and existing token balances will begin to unlock.</p>
                        <Button variant="accentBrand" className="text-white mt-8 mb-4" onClick={releaseLiquidity} disabled={isReleasing}>
                          Release liquidity
                        </Button>

                        <div className='mt-6 text-center'>
                          <p className='text-xl mb-4'>Your balance: {localizeNumber(formatUnits(vestingData?.totalBalance || 0n, 18), "decimal")}</p>
                          <p>{Number(club.cliffPercent) / 100}% will be available immediately</p>
                          <p>The remainder will vest over {
                            Math.floor(Number(club.vestingDuration) / 86400) > 0
                              ? `${Math.floor(Number(club.vestingDuration) / 86400)} days and `
                              : ''
                          }{Math.floor((Number(club.vestingDuration) % 86400) / 3600)} hours</p>
                        </div>
                      </div>
                      : !fairLaunchMode ?
                        <>
                          <Script
                            src="/static/datafeeds/udf/dist/bundle.js"
                            strategy="lazyOnload"
                            onReady={() => {
                              setIsScriptReady(true);
                            }}
                          />
                          <div className='border border-card bg-card-light rounded-2xl mt-5'>
                            <div className="rounded-2xl m-2 overflow-hidden">
                              {isScriptReady && <Chart symbol={club.token.symbol} clubId={club.clubId} chain={club.chain} />}
                            </div>
                          </div>
                        </>
                        : <div className="flex flex-col w-[100%] justify-center items-center mt-20">
                          <Header2 className="text-white font-medium">
                            ${club.token.symbol} is still in Fair Launch!
                          </Header2>
                          <Subtitle className="mt-2">
                            Token price will not change until 200mil tokens are minted.
                          </Subtitle>
                          <FairLaunchModeComponent club={club} totalSupply={totalSupply} />
                        </div>
                  }
                </div>
                {!club.complete &&
                  <BottomInfoComponent
                    club={club}
                    address={address}
                    totalSupply={totalSupply}
                    media={media}
                  />
                }
              </div>

              {/* Feed/Trades/Holders */}
              <div className="lg:col-span-4 h-[calc(100vh-20px)] md:mb-0 relative w-full flex flex-col">
                <div className="mb-4">
                  <Tabs openTab={openTab} setOpenTab={setOpenTab} withFeed={!!postId} />
                </div>
                {/* Feed - only show for Lens profiles atm */}
                <div className="min-w-[450px] flex-1 overflow-y-auto">
                  {openTab === 1 && type === "lens" && (
                    <Feed
                      postId={postId}
                      isLoading={isLoading}
                      publicationWithComments={publicationWithComments}
                    />
                  )}
                  {openTab === 2 && (
                    <Trades clubId={club.clubId} chain={club.chain} />
                  )}
                  {openTab === 3 && (
                    <HolderDistribution clubId={club.clubId} supply={club.supply} creator={club.creator} chain={club.chain} />
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

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
    query: { chain, tokenAddress },
  } = context;

  if (!(chain && isAddress(tokenAddress as string))) {
    return {
      redirect: {
        permanent: false,
        destination: "/dashboard",
      },
    };
  }

  const [_club, dbRecord] = await Promise.all([
    getRegisteredClubById("", chain as string, tokenAddress as `0x${string}`),
    (async () => {
      if (chain === "base") {
        const { collection } = await getClientWithClubs();
        return await collection.findOne(
          { tokenAddress: getAddress(tokenAddress as string) },
          { projection: { _id: 0 } }
        );
      } else {
        const { collection } = await getClientWithMedia();
        return await collection.findOne(
          { "token.address": getAddress(tokenAddress as string) },
          { projection: { _id: 0, postId: 1 } }
        );
      }
    })()
  ]);

  // Redirect to v1 if clubId < 170 and IS_PRODUCTION is true
  if (IS_PRODUCTION && parseInt(_club.clubId as string) < 170 && _club.chain === "base") {
    return {
      redirect: {
        permanent: false,
        destination: `${V1_LAUNCHPAD_URL}/token/${_club.clubId}`,
      },
    };
  }

  const featured = !!dbRecord?.featureEndAt && (Date.now() / 1000) < parseInt(dbRecord.featureEndAt);

  if (!_club?.token?.name) {
    _club.token = {
      name: _club.name,
      symbol: _club.symbol,
      image: _club.uri
    };
  }

  const club = JSON.parse(JSON.stringify({ ..._club, ...dbRecord, featured }));

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
