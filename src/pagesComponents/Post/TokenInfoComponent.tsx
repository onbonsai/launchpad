import clsx from 'clsx';
import { formatUnits } from "viem";
import { ReactNode, useState } from "react";
import { Subtitle, BodySemiBold, Header2 } from "@src/styles/text";
import { Club, DECIMALS, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { localizeNumber } from '@src/constants/utils';
import { useGetTradingInfo, useGetClubBalance } from "@src/hooks/useMoneyClubs";
import Link from 'next/link';
import { Button } from '@src/components/Button';
import { useAccount } from 'wagmi';
import { SmartMedia } from '@src/services/madfi/studio';
import { kFormatter } from '@src/utils/utils';
import { brandFont } from '@src/fonts/fonts';
import BuyUSDCWidget from '@pagesComponents/Club/BuyUSDCWidget';
import dynamic from 'next/dynamic';
import { sdk } from '@farcaster/frame-sdk';
import useIsMobile from '@src/hooks/useIsMobile';
import { SafeImage } from '@src/components/SafeImage/SafeImage';
import CoinPile from '@src/components/Icons/CoinPile';

const BuySellModal = dynamic(() => import('@pagesComponents/Club/BuySellModal'), { ssr: false });

enum PriceChangePeriod {
  twentyFourHours = '24h',
}

export const TokenInfoComponent = ({ club, media, remixPostId, postId }: { club: Club, media?: SmartMedia, remixPostId?: string, postId?: string }) => {
  const isMobile = useIsMobile();
  const { address, isConnected } = useAccount();
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyUSDCModalOpen, setBuyUSDCModalOpen] = useState(false);
  const [usdcBuyAmount, setUsdcBuyAmount] = useState<string>('');
  const [usdcAmountNeeded, setUsdcAmountNeeded] = useState<number | string>(0);
  const { data: tradingInfo } = useGetTradingInfo(club.clubId, club.chain);
  const { data: clubBalance } = useGetClubBalance(club.clubId.toString(), address as `0x${string}`, club.chain, club.complete, club.tokenAddress);
  const _DECIMALS = club.chain === "lens" ? DECIMALS : USDC_DECIMALS;

  const InfoCard: React.FC<{ title?: string; subtitle: ReactNode, roundedLeft?: boolean, roundedRight?: boolean, className?: string }> = ({ title, subtitle, roundedLeft, roundedRight, className }) => (
    <div className={clsx("min-w-[88px] flex flex-col items-center justify-center border border-card-light py-2 gap-y-1 px-4 bg-card-light", roundedLeft && 'rounded-l-xl', roundedRight && 'rounded-r-xl', className || "")}>
      {title ? (
        <>
          <Subtitle className="text-xs whitespace-nowrap">{title}</Subtitle>
          <span>{subtitle}</span>
        </>
      ) : (
        <div className="h-8 flex items-center">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );

  const ActionCard: React.FC<{ onClick: (e: any) => void }> = ({ onClick }) => {
    const handleClick = async (e: any) => {
      if (club.chain === "base" && club.complete) {
        if (await sdk.isInMiniApp()) {
          e.preventDefault();
          await sdk.actions.swapToken({
            sellToken: `eip155:8453/native`,
            buyToken: `eip155:8453/erc20:${club.tokenAddress}`,
            sellAmount: "10000000",
          });
        } else {
          window.location.href = `/token/${club.chain}/${club.tokenAddress}`;
        }
      } else {
        onClick(e);
      }
    };

    return (
      <div
        className={`min-w-[88px] md:min-w-[120px] flex flex-col items-center justify-center border border-card-light py-1.5 md:py-3 gap-y-1 px-3 md:px-6 transition-colors duration-200 ease-in-out flex-1 md:rounded-xl rounded-lg ${
          isConnected
            ? "bg-brand-highlight text-black hover:bg-brand-highlight/80 cursor-pointer"
            : "bg-dark-grey text-white/50 cursor-not-allowed"
        }`}
        onClick={(e) => (isConnected ? handleClick(e) : null)}
      >
        <div className="flex items-center gap-x-1.5 md:gap-x-3">
          <CoinPile color="text-black" className={`w-6 h-6 md:w-7 md:h-7 -mt-1 ${!isConnected ? "opacity-80" : ""}`} />
          <BodySemiBold className={`text-md md:text-md ${brandFont.className}`}>BUY</BodySemiBold>
        </div>
      </div>
    );
  };

  const PriceChangeString: React.FC<{ period: PriceChangePeriod }> = ({ period }) => {
    const priceDelta = tradingInfo && tradingInfo.priceDeltas?.[period] ? tradingInfo.priceDeltas[period] : "0";

    let textColorClass = 'text-white/60';
    if (priceDelta !== "0" && priceDelta !== "-0") {
      textColorClass = priceDelta.includes("+") ? "!text-bullish" : "!text-bearish";
    }

    return (
      <Subtitle className={textColorClass}>
        {localizeNumber(Number(priceDelta) / 100, "percent")}
      </Subtitle>
    );
  };

  return (
    <div className="md:col-span-3s rounded-3xl animate-fade-in-down">
      <div className="relative w-full h-auto min-h-[180px] md:min-h-[60px] rounded-t-3xl bg-true-black overflow-hidden bg-clip-border">
        <div className="absolute inset-0" style={{ filter: 'blur(40px)' }}>
          <SafeImage
            src={club.token.image}
            alt={club.token.name}
            className="w-full h-full object-cover"
            fill
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-true-black to-transparent" />

        <div className="relative z-10 p-2 flex flex-col">
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-center w-full">
            <div className="w-full flex justify-between">
                <div className='flex items-center gap-x-4 w-full'>
                  <SafeImage
                    src={club.token.image}
                    alt={club.token.name}
                    className="object-cover rounded-lg"
                    width={48}
                    height={48}
                  />
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-x-2">
                      <Header2 className="text-white text-md">${club.token.symbol}</Header2>
                      <Link href={`/token/${club.chain}/${club.tokenAddress}`}>
                        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors duration-200">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white/60 hover:text-white"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15,3 21,3 21,9"/>
                            <line x1="10" x2="21" y1="14" y2="3"/>
                          </svg>
                        </button>
                      </Link>
                    </div>
                    <BodySemiBold className="text-white/60 text-sm">{club.token.name}</BodySemiBold>
                  </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center w-full sm:w-auto gap-2 md:gap-0 md:space-x-2">
              <div className="flex flex-row items-center w-full">
                <InfoCard
                  title='Market Cap'
                  subtitle={<Subtitle>{!tradingInfo?.marketCap ? '-' : localizeNumber(parseFloat(formatUnits(BigInt(tradingInfo.marketCap), _DECIMALS)).toString(), 'currency', 2)}</Subtitle>}
                  roundedLeft
                  className="flex-1 border-r-0"
                />
                <InfoCard
                  title='24h'
                  subtitle={<PriceChangeString period={PriceChangePeriod.twentyFourHours} />}
                  className="flex-1 border-r-0"
                />
                <InfoCard
                  title='Balance'
                  subtitle={<Subtitle>{!clubBalance ? '-' : kFormatter(parseFloat(formatUnits(clubBalance, _DECIMALS)))}</Subtitle>}
                  roundedRight
                  className="flex-1"
                />
              </div>
              <div className={isMobile ? 'w-full' : 'hidden sm:block'}>
                <ActionCard onClick={(e) => setShowBuyModal(true)} />
              </div>
            </div>
          </div>
        </div>

        <BuySellModal
          club={club}
          address={address as string}
          open={showBuyModal}
          onClose={() => {
            setShowBuyModal(false);
          }}
          mediaProtocolFeeRecipient={media?.protocolFeeRecipient}
          useRemixReferral={!!remixPostId ? media?.creator : undefined}
          onBuyUSDC={(amount: string) => {
            setUsdcBuyAmount(amount)
            setUsdcAmountNeeded(amount)
            setShowBuyModal(false)
            setBuyUSDCModalOpen(true)
          }}
          postId={postId}
        />
        <BuyUSDCWidget
          open={buyUSDCModalOpen}
          buyAmount={usdcBuyAmount}
          onClose={() => {
            setBuyUSDCModalOpen(false);
            setShowBuyModal(true);
          }}
          chain={club.chain || "lens"}
        />
      </div>
    </div>
  );
};