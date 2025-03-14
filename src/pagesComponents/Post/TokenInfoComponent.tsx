import clsx from 'clsx';
import { formatUnits } from "viem";
import { ReactNode } from "react";
import { Subtitle, BodySemiBold, Header2 } from "@src/styles/text";
import { Club, DECIMALS, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { localizeNumber } from '@src/constants/utils';
import { useGetTradingInfo } from "@src/hooks/useMoneyClubs";
import { useAccount } from 'wagmi';
import Link from 'next/link';

enum PriceChangePeriod {
  twentyFourHours = '24h',
}

export const TokenInfoComponent = ({ club }: { club: Club }) => {
  const { data: tradingInfo } = useGetTradingInfo(club.clubId, club.chain);
  const _DECIMALS = club.chain === "lens" ? DECIMALS : USDC_DECIMALS;

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
    const textColor = priceDelta === "0" || priceDelta === "-0" ? 'text-white/60' : (priceDelta.includes("+") ? "text-bullish" : "text-bearish");
    return (
      <Subtitle className={clsx(textColor)}>
        {localizeNumber(Number(priceDelta) / 100, "percent")}
      </Subtitle>
    );
  };

  return (
    <div className="md:col-span-3 rounded-3xl">
      <div className="relative w-full h-[126px] md:h-[63px] rounded-t-3xl bg-true-black overflow-hidden bg-clip-border">
        <div className="absolute inset-0" style={{ filter: 'blur(40px)' }}>
          <img
            src={club.token.image}
            alt={club.token.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-true-black to-transparent" />

        <div className="relative z-10 p-2 pb-4 flex flex-col justify-between items-center">
          <div className="flex flex-row justify-between items-center w-full">
            <Link href={`/token/${club.chain}/${club.tokenAddress}`}>
              <div className='flex flex-row items-center'>
                <img
                  src={club.token.image}
                  alt={club.token.name}
                  className="w-[48px] h-[48px] object-cover rounded-xl"
                />
                <div className="flex flex-col ml-2">
                  <div className="flex flex-row justify-between gap-x-8 w-full">
                    <div className="flex flex-col">
                      <div className="flex flex-row space-x-4">
                        <Header2 className="text-white text-md">${club.token.symbol}</Header2>
                      </div>
                      <BodySemiBold className="text-white/60 text-sm">{club.token.name}</BodySemiBold>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            <div className="flex flex-row items-center mr-2">
              <InfoCard
                title='Market Cap'
                subtitle={<Subtitle>{!tradingInfo?.marketCap ? '-' : localizeNumber(parseFloat(formatUnits(BigInt(tradingInfo.marketCap), _DECIMALS)), 'currency', 2)}</Subtitle>}
                roundedLeft
              />
              <InfoCard
                title='24h'
                subtitle={<PriceChangeString period={PriceChangePeriod.twentyFourHours} />}
                roundedRight
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};