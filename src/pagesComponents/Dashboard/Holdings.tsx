import Image from "next/image";
import { formatUnits, decodeAbiParameters } from "viem";
import { useInView } from "react-intersection-observer";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

import { roundedToFixed } from "@src/utils/utils";
import { DECIMALS, calculatePriceDelta } from "@src/services/madfi/moneyClubs";
import { useGetHoldings } from "@src/hooks/useMoneyClubs";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import HoldingSection from "./HoldingSection";

interface HoldingProps {
  address: `0x${string}`;
  bonsaiAmount: bigint;
}

export const Holdings = (propd: HoldingProps) => {
  const { address, bonsaiAmount } = propd;
  const { ref, inView } = useInView()
  const [page, setPage] = useState(0);
  const [allHoldings, setAllHoldings] = useState<any[]>([]);
  const { data, isLoading, refetch } = useGetHoldings(address, page);
  const { holdings, hasMore } = data || {};

  useEffect(() => {
    if (inView && !isLoading && hasMore) {
      setPage(page + 1);
      refetch();
    }
  }, [inView]);

  useEffect(() => {
    if (!isLoading && holdings?.length) {
      const _holdings = holdings.map((h) => {
        const [name, symbol, image] = decodeAbiParameters([
          { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
        ], h.club.tokenInfo);
        let priceDelta;
        if (h.club.prevTrade24Hr?.length) {
          priceDelta = calculatePriceDelta(h.club.currentPrice, h.club.prevTrade24Hr[0].price);
        }
        return { ...h, token: { name, symbol, image }, priceDelta };
      })
      setAllHoldings([...allHoldings, ..._holdings]);
    }
  }, [isLoading]);

  if (isLoading && allHoldings.length === 0) {
    return (
      <div ref={ref} className="flex justify-center pt-4">
        <Spinner customClasses="h-6 w-6" color="#E42101" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <HoldingSection holdings={allHoldings} bonsaiAmount={bonsaiAmount} />
    </div>
  )
}
