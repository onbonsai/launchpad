import clsx from 'clsx';
import { Subtitle, BodySemiBold } from "@src/styles/text";
import { ReactNode, useMemo } from "react";
import { formatUnits } from "viem";
import { useGetBuyPrice } from "@src/hooks/useMoneyClubs";
import { DECIMALS, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { roundedToFixed } from "@src/utils/utils";
import { localizeNumber } from '@src/constants/utils';

export const InfoComponent = ({
  club,
  address,
  tradingInfo,
  totalSupply,
}) => {
  const { data: buyPriceResult } = useGetBuyPrice(address, club?.clubId, '1', club.chain);

  const _DECIMALS = club.chain === "lens" ? DECIMALS : USDC_DECIMALS;

  const buyPriceFormatted = useMemo(() => {
    if (buyPriceResult?.buyPrice) {
      return roundedToFixed(parseFloat(formatUnits(BigInt(buyPriceResult.buyPrice.toString()), _DECIMALS)), 6);
    }
  }, [buyPriceResult]);


  const InfoLine: React.FC<{ title: string; subtitle: ReactNode }> = ({ title, subtitle }) => (
    <div className={clsx("flex flex-col items-start justify-center gap-[2px]")}>
      <Subtitle className="truncate max-w-full">{title}</Subtitle>
      <BodySemiBold>{subtitle}</BodySemiBold>
    </div>
  );

  if (!club?.createdAt) return null;

  return (
    <div className='flex flex-col md:flex-row items-center mt-4 w-full justify-center md:justify-start md:px-3'>
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-14 w-full md:w-auto">
        <div className='flex flex-row w-full gap-[4vw] justify-center md:justify-start'>
          <InfoLine title='Token Price' subtitle={`${buyPriceFormatted ? `${localizeNumber(buyPriceFormatted, "currency", 6, 6)}` : '-'}`} />
          <InfoLine title='Market Cap' subtitle={`${!tradingInfo?.marketCap ? '-' : localizeNumber(parseFloat(formatUnits(BigInt(tradingInfo.marketCap), _DECIMALS)), 'currency', 2)}`} />
          <InfoLine title='Liquidity' subtitle={`${!tradingInfo?.liquidity ? '-' : localizeNumber(parseFloat(formatUnits(BigInt(tradingInfo.liquidity), _DECIMALS)), 'currency', 2)}`} />
        </div>
        <div className='flex flex-row w-full gap-[4vw] justify-center md:justify-start'>
          <InfoLine title='Volume 24h' subtitle={`${!tradingInfo?.volume24Hr ? ' -' : localizeNumber(parseFloat(formatUnits(BigInt(tradingInfo.volume24Hr), _DECIMALS)), 'currency', 2)}`} />
          <InfoLine title='Holders' subtitle={tradingInfo?.holders || "-"} />
          <InfoLine title='Total Supply' subtitle={localizeNumber(Math.floor(Number(formatUnits(totalSupply || BigInt(club.supply), 18))), "decimal") || "-"} />
        </div>
      </div>
    </div>
  );
};