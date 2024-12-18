import { Subtitle, BodySemiBold } from "@src/styles/text";
import { useGetClubHoldings } from "@src/hooks/useMoneyClubs";
import { Button } from "@src/components/Button";
import BuySellModal from "./BuySellModal";
import { useMemo, useState } from "react";
import { MIN_LIQUIDITY_THRESHOLD, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { localizeNumber } from "@src/constants/utils";

export const BottomInfoComponent = ({ club, address }) => {
  const [buyClubModalOpen, setBuyClubModalOpen] = useState(false);
  const { data, isLoading, refetch } = useGetClubHoldings(club.id, 0);
  const balance = useMemo(() => {
    if (!data?.holdings || !club?.currentPrice || !address) return 0;

    const userHolding = data.holdings.find((holding) => holding.trader.id.toLowerCase() === address.toLowerCase());

    if (!userHolding) return 0;

    const amount = BigInt(userHolding.amount);
    const price = BigInt(club.currentPrice);
    // Convert to USDC value (divide by 1e6 for USDC decimals and 1e6 more for share decimals)
    return Number(amount * price) / 1e12;
  }, [data?.holdings, club?.currentPrice, address]);

  const bondingCurveProgress = useMemo(() => {
    const clubLiquidity = BigInt(club.liquidity);
    if (MIN_LIQUIDITY_THRESHOLD && clubLiquidity) {
      const scaledMinLiquidityThreshold = MIN_LIQUIDITY_THRESHOLD * BigInt(10 ** USDC_DECIMALS);
      const fraction = (clubLiquidity * BigInt(100)) / scaledMinLiquidityThreshold;
      return Math.min(parseInt(fraction.toString()), 100);
    }

    return 0;
  }, [club]);

  return (
    <div className="flex justify-center items-center mt-5 gap-1">
      <div className="bg-white min-w-[240px] h-[56px] rounded-[20px] p-[2px] relative">
        <div
          className="rounded-[20px] absolute top-[2px] bottom-[2px] left-[2px]"
          style={{
            width: `${bondingCurveProgress === 0 ? 0 : Math.min(Math.max(bondingCurveProgress, 14), 98)}%`,
            background: "linear-gradient(90deg, #FFD050 0%, #FF6400 171.13%)",
            zIndex: 1,
          }}
        />
        <div className="flex flex-col px-3 py-2 relative z-10">
          <Subtitle className="text-black/60">Bonding curve</Subtitle>
          <BodySemiBold className="text-black">{localizeNumber(bondingCurveProgress / 100, "percent")}</BodySemiBold>
        </div>
      </div>
      <div className="bg-white min-w-[240px] h-[56px] rounded-[20px] py-2 px-3 flex flex-row justify-between items-center">
        <div className="flex flex-col">
          <Subtitle className="text-black/60">Holding</Subtitle>
          <BodySemiBold className="text-black">{localizeNumber(balance)}</BodySemiBold>
        </div>
        <Button
          className="bg-bullish border-transparent max-w-[60px]"
          size="sm"
          onClick={() => setBuyClubModalOpen(true)}
        >
          Trade
        </Button>
        <BuySellModal
          club={club}
          address={address}
          open={buyClubModalOpen}
          onClose={() => setBuyClubModalOpen(false)}
        />
      </div>
    </div>
  );
};
