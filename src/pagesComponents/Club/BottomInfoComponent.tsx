import { Subtitle, BodySemiBold } from "@src/styles/text";
import { useGetClubBalance } from "@src/hooks/useMoneyClubs";
import { Button } from "@src/components/Button";
import BuySellModal from "./BuySellModal";
import { useEffect, useMemo, useState } from "react";
import { fetchTokenPrice, MIN_LIQUIDITY_THRESHOLD, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { localizeNumber } from "@src/constants/utils";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { roundedToFixed } from "@src/utils/utils";

export const BottomInfoComponent = ({ club, address }) => {
  const [buyClubModalOpen, setBuyClubModalOpen] = useState(false);
  const { data: clubBalance } = useGetClubBalance(club?.clubId, address);
  const [balance, setBalance] = useState<string>();

  useEffect(() => {
    const calculateBalance = async () => {
      if (!club?.currentPrice || !address || !clubBalance) {
        setBalance("0");
        return;
      }

      // converting to USDC value
      const _balance = localizeNumber(formatUnits(clubBalance * BigInt(club.currentPrice), 24));

      setBalance(_balance);
    };

    calculateBalance();
  }, [club?.currentPrice, address, clubBalance]);

  const bondingCurveProgress = useMemo(() => {
    const clubSupply = BigInt(club.supply);
    if (clubSupply) {
      const fraction = clubSupply / parseUnits("800000000", 18)
      return Math.min(parseInt(fraction.toString()), 100);
    }
    return 0;
  }, [club]);

  return (
    <div className="fixed bottom-8 md:bottom-0 py-4 left-4 right-4 md:right-auto md:left-1/4 z-50">
      <div className="col-span-3 flex justify-center w-full md:w-auto">
        <div className="flex gap-1 mt-5 w-full md:w-auto">
          {/* Bonding Curve Box */}
          <div className="bg-white w-full md:min-w-[240px] h-[56px] rounded-[20px] p-[2px] relative">
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
              <BodySemiBold className="text-black">
                {localizeNumber(bondingCurveProgress / 100, "percent")}
              </BodySemiBold>
            </div>
          </div>

          {/* Holding Box */}
          <div className="bg-white w-full md:min-w-[240px] h-[56px] rounded-[20px] py-2 px-3 flex flex-row justify-between items-center">
            <div className="flex flex-col">
              <Subtitle className="text-black/60">Holding</Subtitle>
              <BodySemiBold className="text-black">{balance ? balance : "-"}</BodySemiBold>
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
