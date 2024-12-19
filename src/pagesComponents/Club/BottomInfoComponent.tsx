import { Subtitle, BodySemiBold } from "@src/styles/text";
import { useGetClubBalance } from "@src/hooks/useMoneyClubs";
import { Button } from "@src/components/Button";
import BuySellModal from "./BuySellModal";
import { useMemo, useState } from "react";
import { MIN_LIQUIDITY_THRESHOLD, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { localizeNumber } from "@src/constants/utils";
import { formatUnits, parseUnits } from "viem";

export const BottomInfoComponent = ({ club, address }) => {
  const [buyClubModalOpen, setBuyClubModalOpen] = useState(false);
  const { data: clubBalance } = useGetClubBalance(club?.clubId, address);

  const balance = useMemo(() => {
    if (!club?.currentPrice || !address || !clubBalance) return 0;

    // converting to USDC value
    return formatUnits((clubBalance * BigInt(club.currentPrice)), 12);
  }, [club?.currentPrice, address, clubBalance]);

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
    <div className="fixed left-0 right-0 bottom-0 w-full grid grid-cols-1 lg:grid-cols-4 py-4">
      <div className="col-span-3 flex justify-center">
        <div className="flex gap-1 mt-5">
          {/* Bonding Curve Box */}
          <div className="bg-white min-w-[240px] h-[56px] rounded-[20px] p-[2px] relative">
            <div
              className="rounded-[20px] absolute top-[2px] bottom-[2px] left-[2px]"
              style={{
                width: `${
                  bondingCurveProgress === 0
                    ? 0
                    : Math.min(Math.max(bondingCurveProgress, 14), 98)
                }%`,
                background: "linear-gradient(90deg, #FFD050 0%, #FF6400 171.13%)",
                zIndex: 1,
              }}
            />
            <div className="flex flex-col px-3 py-2 relative z-10">
              <Subtitle className="text-black/60">Bonding curve</Subtitle>
              <BodySemiBold className="text-black">
                {localizeNumber(bondingCurveProgress / 100, "percent")}
              </BodySemiBold>
            </div>
          </div>

          {/* Holding Box */}
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
      </div>
    </div>
  );
};