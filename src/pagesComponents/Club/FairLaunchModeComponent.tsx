import { Subtitle, BodySemiBold } from "@src/styles/text";
import { useMemo } from "react";
import { localizeNumber } from "@src/constants/utils";
import { formatEther } from "viem";
import { FLAT_THRESHOLD } from "@src/services/madfi/moneyClubs";

export const FairLaunchModeComponent = ({ club, totalSupply }) => {
  const bondingCurveProgress = useMemo(() => {
    const clubSupply = Number(formatEther(totalSupply || BigInt(club.supply)));
    const fraction = clubSupply / Number(formatEther(FLAT_THRESHOLD))
    return Math.round(fraction * 100 * 100) / 100
  }, [club, totalSupply]);

  return (
    <div className="py-4 left-4 right-4 md:right-auto md:left-1/4">
      <div className="col-span-3 flex justify-center w-full md:w-auto">
        <div className="flex gap-1 mt-5 w-full md:w-auto">
          {/* Bonding Curve Box */}
          <div className="bg-transparent w-full md:min-w-[360px] h-[84px] rounded-[30px] p-[3px] relative animate-pulse">
            <div
              className="rounded-[30px] absolute top-[3px] bottom-[3px] left-[3px]"
              style={{
                width: `${bondingCurveProgress === 0 ? 0 : Math.min(Math.max(bondingCurveProgress, 14), 98)}%`,
                background: "linear-gradient(90deg, #90EE90 0%, #008000 171.13%)",
                zIndex: 1,
              }}
            />
            <div className="flex flex-col px-3 py-5 relative z-10 space-y-1">
              <Subtitle className="text-white/60 text-xl">Fair launch</Subtitle>
              <BodySemiBold className="text-white text-lg">
                {localizeNumber(bondingCurveProgress / 100, "percent")}
              </BodySemiBold>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
