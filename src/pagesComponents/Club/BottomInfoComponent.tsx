import { Subtitle, BodySemiBold } from "@src/styles/text";
import { useGetClubHoldings } from "@src/hooks/useMoneyClubs";
import { Button } from "@src/components/Button";
import BuySellModal from "./BuySellModal";
import { useMemo, useState } from "react";
import { MIN_LIQUIDITY_THRESHOLD, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";

export const BottomInfoComponent = ({ club, address }) => {
  const [buyClubModalOpen, setBuyClubModalOpen] = useState(false);
  const { data, isLoading, refetch } = useGetClubHoldings(club.id, address);
  console.log(JSON.stringify(data, null, 2));
  const balance = data?.holdings ? data.holdings.reduce((acc, h) => acc + h.balance, 0) : 0;

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
            width: `${Math.max(bondingCurveProgress, 14)}%`,
            background: "linear-gradient(90deg, #FFD050 0%, #FF6400 171.13%)",
            zIndex: 1,
          }}
        />
        <div className="flex flex-col px-3 py-2 relative z-10">
          <Subtitle className="text-black/60">Bonding curve</Subtitle>
          <BodySemiBold className="text-black">{bondingCurveProgress}%</BodySemiBold>
        </div>
      </div>
      <div className="bg-white min-w-[240px] h-[56px] rounded-[20px] py-2 px-3 flex flex-row justify-between items-center">
        <div className="flex flex-col">
          <Subtitle className="text-black/60">Holding</Subtitle>
          <BodySemiBold className="text-black">${balance}</BodySemiBold>
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
