import clsx from 'clsx';
import { Subtitle, BodySemiBold } from "@src/styles/text";
import { ReactNode, useMemo } from "react";
import { formatUnits } from "viem";
import { useGetBuyPrice } from "@src/hooks/useMoneyClubs";
import {
  DECIMALS,
  USDC_DECIMALS,
} from "@src/services/madfi/moneyClubs";
import { roundedToFixed } from "@src/utils/utils";
import { localizeNumber } from '@src/constants/utils';

export const InfoComponent = ({
  club,
  address,
  tradingInfo,
}) => {
  const { data: buyPriceResult } = useGetBuyPrice(address, club?.clubId, '1');

  const buyPriceFormatted = useMemo(() => {
    if (buyPriceResult?.buyPrice) {
      return roundedToFixed(parseFloat(formatUnits(BigInt(buyPriceResult.buyPrice.toString()), DECIMALS)), 2);
    }
  }, [buyPriceResult]);


  const InfoLine: React.FC<{ title: string; subtitle: ReactNode }> = ({ title, subtitle }) => (
    <div className={clsx("flex flex-col items-start justify-center gap-[2px]")}>
      <Subtitle>{title}</Subtitle>
      <BodySemiBold>{subtitle}</BodySemiBold>
    </div>
  );

  if (!club?.createdAt) return null;

  return (
    <div className='flex flex-row items-center mt-3 w-full gap-[4vw]'>
      <InfoLine title='Token Price' subtitle={`${buyPriceFormatted ? `${localizeNumber(buyPriceFormatted, 'currency', 2)}` : '-'}`} />
      <InfoLine title='Market Cap' subtitle={`${!tradingInfo?.marketCap ? '-' : localizeNumber(parseFloat(formatUnits(BigInt(tradingInfo.marketCap), USDC_DECIMALS)), 'currency', 2)}`} />
      <InfoLine title='Liquidity' subtitle={`${!tradingInfo?.liquidity ? '-' : localizeNumber(parseFloat(formatUnits(BigInt(tradingInfo.liquidity), USDC_DECIMALS)), 'currency', 2)}`} />
      <InfoLine title='Volume 24h' subtitle={`${!tradingInfo?.volume24Hr ? ' -' : localizeNumber(parseFloat(formatUnits(BigInt(tradingInfo.volume24Hr), USDC_DECIMALS)), 'currency', 2)}`} />
      <InfoLine title='Holders' subtitle={tradingInfo?.holders || "-"} />
    </div>
  );
};