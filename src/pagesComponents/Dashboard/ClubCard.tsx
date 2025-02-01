import React, { useMemo } from "react";
import Link from "next/link";
import { formatEther, formatUnits } from "viem";

import { MAX_MINTABLE_SUPPLY, USDC_DECIMALS, V1_LAUNCHPAD_URL } from "@src/services/madfi/moneyClubs";
import formatRelativeDate from "@src/utils/formatRelativeDate";
import { Subtitle } from "@src/styles/text";
import CreatorButton from "@src/components/Creators/CreatorButton";
import { localizeNumber } from "@src/constants/utils";

interface Props {
  data: {
    publication: {
      stats: { comments: number };
    };
    club: {
      id: string;
      clubId: string;
      initialSupply: string;
      createdAt: string;
      supply: string;
      currentPrice: string;
      token: { name: string; symbol: string; image: string; description: string };
      marketCap: string;
      featured?: boolean;
      handle: string;
      liquidity: string;
      v2: boolean;
    };
  };
  creatorProfile?: { picture: string };
}

const ClubCard = ({ data, creatorProfile }: Props) => {
  const { club } = data;

  const bondingCurveProgress = useMemo(() => {
    if (club.v2){
      const clubSupply = Number(formatEther(BigInt(club.supply)));
      if (clubSupply) {
        const fraction = clubSupply / Number(formatEther(MAX_MINTABLE_SUPPLY))
        return Math.round(fraction * 100 * 100) / 100
      }
    } else {
      if (club.liquidity) {
        const minLiquidityThreshold = BigInt(23005)
        const scaledMinLiquidityThreshold = (minLiquidityThreshold as bigint) * BigInt(10 ** USDC_DECIMALS);
        const fraction = (BigInt(club.liquidity) * BigInt(100)) / scaledMinLiquidityThreshold;
        return Math.min(parseInt(fraction.toString()), 100);
      }
    }
    return 0;
  }, [club]);

  // Shared styles
  const infoTextStyle = "text-base leading-5 font-medium";

  const BgImage = () => {
    return (
      <>
        <div className="absolute top-0 bottom-0 left-0 right-0 bg-card z-5" />
        <div
          className="overflow-hidden h-[37%] absolute w-full top-0 left-0 -z-10"
          style={{ filter: 'blur(40px)' }}
        >
          <img
            src={club.token.image}
            alt={club.token.name}
            sizes="10vw"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-true-black to-transparent"></div>
        </div>
      </>
    );
  }

  const TokenInfoHeader = () => {
    return (
      <div className="mb-3">
        <div className="flex flex-row">
          <img
            src={club.token.image}
            alt={club.token.name}
            sizes="1vw"
            className="w-[48px] h-[48px] object-cover rounded-xl"
          />
          <div className="flex flex-col ml-2">
            <p className="text-secondary text-2xl leading-7 font-semibold overflow-hidden overflow-ellipsis">
              {`$${club.token.symbol}`}
            </p>
            <div className="flex items-center gap-1">
              <p className="text-footer text-[16px] leading-5 font-medium overflow-hidden overflow-ellipsis">
                {club.token.name}
              </p>
              {!club.v2 && (
                <span className="bg-white/10 text-footer text-xs px-2 py-1 rounded-full">
                  V1
                </span>
              )}
            </div>
          </div>
        </div>
        {/* <div className="flex flex-col">
                <p className="text-grey text-xs max-w-fit mt-1">
                  created by{" "}
                  <Link href={`/profile/${club.handle}`} legacyBehavior target="_blank">
                    <span className="text-grey link-hover">@{club.handle}</span>
                  </Link>
                </p>
              </div> */}
      </div>
    );
  }

  const link = club.v2
    ? `/token/${club?.clubId}`
    : `${V1_LAUNCHPAD_URL}/token/${club?.clubId}`;

  return (
    <Link href={link} legacyBehavior target="_blank">
      <div className="col-span-1 rounded-lg relative group cursor-pointer transition-all max-w-full focus:outline-primary">
        <canvas
          className={`absolute inset-0 scale-x-100 scale-y-100 z-0 transition-all duration-500 blur-xl ${club?.featured ? "bg-gradient opacity-20 group-hover:opacity-50" : "bg-red-400 opacity-0 group-hover:opacity-40"
            }`}
          style={{ width: "100%", height: "100%" }}
        ></canvas>
        <div className="rounded-3xl card card-compact shadow-md relative z-10">
          <BgImage />
          <div className="flex flex-col justify-between gap-2 p-3 flex-grow mb-0 relative z-20">
            <TokenInfoHeader />
            <div className="flex flex-row justify-between items-end">
              <div className="flex flex-col gap-[2px]">
                <Subtitle>
                  Mcap
                </Subtitle>
                <p className={infoTextStyle}>
                  {localizeNumber(parseFloat(formatUnits(BigInt(club.marketCap), USDC_DECIMALS)))}{" "}
                </p>
              </div>
              <p className={infoTextStyle}>
                {localizeNumber(bondingCurveProgress / 100, "percent")}
              </p>
            </div>

            <div className="w-full bg-card-light h-3 rounded-xl mb-3">
              <div
                className="text-md w-full h-3 rounded-xl"
                style={{
                  width: bondingCurveProgress + "%",
                  marginLeft: bondingCurveProgress === 0 ? "0px" : "0px",
                  animation: "pulse 2s infinite",
                  background: "linear-gradient(90deg, #FFD050 0%, #FF6400 171.13%)",
                }}
              />
            </div>

            <div className="flex flex-row justify-between items-center">
              <CreatorButton text={club.handle} image={creatorProfile?.picture} />
              <Subtitle >
                {formatRelativeDate(new Date(Number(club.createdAt) * 1000))}
              </Subtitle>
            </div>
          </div>
        </div>
      </div>
    </Link >
  );
};

// export default React.memo(ClubCard);
export default ClubCard;