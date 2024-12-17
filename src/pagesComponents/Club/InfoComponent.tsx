import clsx from 'clsx';
import { Subtitle, BodySemiBold } from "@src/styles/text";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import {
  useGetBuyPrice,
  useGetFeesEarned,
  useGetClubVolume,
  useGetClubLiquidity,
} from "@src/hooks/useMoneyClubs";
import {
  calculatePriceDelta,
  DECIMALS,
  USDC_DECIMALS,
} from "@src/services/madfi/moneyClubs";
import { roundedToFixed } from "@src/utils/utils";

export const InfoComponent = ({
  club,
  address,
  profile,
  isCreatorAdmin,
}) => {
  const { data: buyPriceResult } = useGetBuyPrice(address, club?.clubId, '1');
  const { data: creatorFeesEarned } = useGetFeesEarned(isCreatorAdmin, address);
  const { data: clubVolume, isLoading: isLoadingVolume } = useGetClubVolume(club?.clubId);
  const { data: clubLiquidity } = useGetClubLiquidity(club?.clubId);
  const [volume, setVolume] = useState<bigint>();

  const buyPriceFormatted = useMemo(() => {
    if (buyPriceResult?.buyPrice) {
      return roundedToFixed(parseFloat(formatUnits(BigInt(buyPriceResult.buyPrice.toString()), DECIMALS)), 2);
    }
  }, [buyPriceResult]);

  const buyPriceDelta = useMemo(() => {
    if (buyPriceResult?.buyPrice && !!club.prevTrade24Hr) {
      return calculatePriceDelta(buyPriceResult?.buyPrice, BigInt(club.prevTrade24Hr.prevPrice || 0n));
    }
  }, [buyPriceResult]);

  const creatorFeesFormatted = useMemo(() => {
    if (creatorFeesEarned) {
      return roundedToFixed(parseFloat(formatUnits(BigInt(creatorFeesEarned.toString()), 18)));
    }

    return '0';
  }, [creatorFeesEarned]);


  const InfoLine: React.FC<{ title: string; subtitle: ReactNode }> = ({ title, subtitle }) => (
    <div className={clsx("flex flex-col items-start justify-center gap-[2px]")}>
      <Subtitle>{title}</Subtitle>
      <BodySemiBold>{subtitle}</BodySemiBold>
    </div>
  );

  useEffect(() => {
    if (!isLoadingVolume) {
      setVolume(clubVolume!);
    }
  }, [isLoadingVolume, clubVolume]);

  if (!club?.createdAt) return null;

  return (
    <div className='flex flex-row items-center mt-3 w-full gap-[4vw]'>
      <InfoLine title='Token Price' subtitle={`\$${buyPriceFormatted ? `${buyPriceFormatted}` : '-'}`} />
      <InfoLine title='Market Cap' subtitle={`\$${clubLiquidity === undefined ? '-' : roundedToFixed(parseFloat(formatUnits(clubLiquidity, USDC_DECIMALS)), 2)}`} />
      <InfoLine title='Volume (24hr)' subtitle={`\$${volume === undefined ? ' -' : roundedToFixed(parseFloat(formatUnits(volume || 0n, USDC_DECIMALS)), 2)}`} />
      <InfoLine title='Holders' subtitle={`todo`} />
    </div>
  );
};