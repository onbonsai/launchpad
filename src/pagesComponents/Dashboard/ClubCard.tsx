import React from "react";
import Link from "next/link";
import { formatUnits } from "viem";

import { roundedToFixed } from "@src/utils/utils";
import { USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import formatRelativeDate from "@src/utils/formatRelativeDate";

interface Props {
  data: {
    publication: {
      stats: { comments: number }
    }
    club?: {
      id: string;
      clubId: string;
      initialSupply: string;
      createdAt: string;
      supply: string,
      currentPrice: string,
      token: { name: string, symbol: string, image: string },
      marketCap: string;
      featured?: boolean
    };
  }
}

const ClubCard = ({ data }: Props) => {
  const { club, publication } = data;

  return (
    <Link href={`/token/${club?.clubId}`} legacyBehavior target="_blank">
      <div className="col-span-1 rounded-lg relative group cursor-pointer transition-all max-w-full focus:outline-primary">
        <canvas
          className={`absolute inset-0 scale-x-100 scale-y-100 z-0 transition-all duration-500 blur-xl ${club?.featured ? 'gradient-bg opacity-20 group-hover:opacity-50' : 'bg-red-400 opacity-0 group-hover:opacity-40'
            }`}
          style={{ width: "100%", height: "100%" }}
        ></canvas>
        <div className="rounded-lg card card-compact bg-dark-grey shadow-md relative z-10">
          <div className="overflow-hidden h-[150px] relative">
            <img
              src={club?.token.image}
              alt=""
              fill="true"
              sizes="10vw"
              className="w-full h-full object-cover absolute top-0 left-0"
            />
          </div>
          <div className="flex flex-col justify-between gap-3 p-4 flex-grow">
            <div className="">
              <p className="text-secondary text-lg overflow-hidden overflow-ellipsis line-clamp-1">
                {`${club.token.name} ($${club.token.symbol})`}
              </p>
              <div className="flex flex-col">
                <p className="text-grey text-xs max-w-fit mt-1">
                  created by{" "}
                  <Link href={`/profile/${club.handle}`} legacyBehavior target="_blank">
                    <span className="text-grey link-hover">@{club.handle}</span>
                  </Link>
                </p>
                <p className="text-secondary/70 text-grey text-xs max-w-fit mt-1">
                  {formatRelativeDate(new Date(parseInt(club?.createdAt as string) * 1000))}
                </p>
              </div>
            </div>

            {/* Bio */}
            <div className="flex flex-col gap-2 h-[3.5rem] mt-2 mb-2">
              <p className="text-secondary text-sm whitespace-pre-wrap overflow-hidden line-clamp-3">
                {club?.token.description}
              </p>
            </div>

            {/* money club info */}
            <div className="">
              {club?.id && (
                <div className="flex flex-wrap gap-x-2 gap-y-2">
                  <p className="text-xs max-w-fit py-2 px-3 bg-green-700 bg-opacity-50 rounded-full">
                    MC{" | $"}{roundedToFixed(parseFloat(formatUnits(BigInt(club.marketCap), USDC_DECIMALS)), 2)}{" "}
                  </p>
                  <p className="text-xs max-w-fit py-2 px-3 bg-background rounded-full">
                    Price{" | $"}{roundedToFixed(parseFloat(formatUnits(BigInt(club.currentPrice), USDC_DECIMALS)), 2)}{" "}
                  </p>
                  <p className="text-xs max-w-fit py-2 px-3 bg-background rounded-full">
                    Replies{" | "}{publication?.stats?.comments || 0}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default React.memo(ClubCard);