import { Subtitle, BodySemiBold } from "@src/styles/text";
import { useGetClubBalance } from "@src/hooks/useMoneyClubs";
import { Button } from "@src/components/Button";
import BuySellModal from "./BuySellModal";
import { useEffect, useMemo, useState } from "react";
import { localizeNumber } from "@src/constants/utils";
import { formatEther, formatUnits } from "viem";
import { MAX_MINTABLE_SUPPLY } from "@src/services/madfi/moneyClubs";
import BuyUSDCWidget from "./BuyUSDCWidget";

export const BottomInfoComponent = ({ club, address, totalSupply, media }) => {
  const [buyClubModalOpen, setBuyClubModalOpen] = useState(false);
  const [BuyUSDCModalOpen, setBuyUSDCModalOpen] = useState(false);
  const [usdcBuyAmount, setUsdcBuyAmount] = useState<string>('');
  const [usdcAmountNeeded, setUsdcAmountNeeded] = useState<number>(0);

  const { data: clubBalance } = useGetClubBalance(club?.clubId, address, club.chain, club.complete, club.tokenAddress);
  const [balance, setBalance] = useState<string>();

  useEffect(() => {
    const calculateBalance = async () => {
      if (!club?.currentPrice || !address || !clubBalance) {
        setBalance("0");
        return;
      }

      // NOTE: as long as lens only uses wgho for quote token then the decimal factor is 36
      const decimalFactor = club.chain === "lens" ? 36 : 24;
      const _balance = localizeNumber(formatUnits(clubBalance * BigInt(club.currentPrice), decimalFactor), undefined, 2);

      setBalance(_balance);
    };

    calculateBalance();
  }, [club?.currentPrice, address, clubBalance]);

  const bondingCurveProgress = useMemo(() => {
    const clubSupply = Number(formatEther(totalSupply || BigInt(club.supply)));
    const fraction = clubSupply / Number(formatEther(MAX_MINTABLE_SUPPLY))
    return Math.round(fraction * 100 * 100) / 100
  }, [club, totalSupply]);

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
              onClose={() => {
                setBuyClubModalOpen(false);
                setUsdcBuyAmount('');
                setUsdcAmountNeeded(0);
              }}
              buyAmount={usdcBuyAmount}
              onBuyUSDC={(amount: string, amountNeeded: number) => {
                setUsdcBuyAmount(amount)
                setUsdcAmountNeeded(amountNeeded)
                setBuyClubModalOpen(false)
                setBuyUSDCModalOpen(true)
              }}
              mediaProtocolFeeRecipient={media?.protocolFeeRecipient}
            />
            <BuyUSDCWidget
              open={BuyUSDCModalOpen}
              buyAmount={usdcAmountNeeded.toString()}
              onClose={() => {
                setBuyUSDCModalOpen(false);
                setBuyClubModalOpen(true);
              }}
              chain={club.chain || "lens"}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
