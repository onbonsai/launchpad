import Image from "next/image";
import { formatUnits, decodeAbiParameters } from "viem";
import { useInView } from "react-intersection-observer";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

import { roundedToFixed } from "@src/utils/utils";
import { DECIMALS, calculatePriceDelta } from "@src/services/madfi/moneyClubs";
import { useGetHoldings } from "@src/hooks/useMoneyClubs";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";

export const Holdings = () => {
  const { address } = useAccount();
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
        if (h.club.prevTrade?.length) {
          priceDelta = calculatePriceDelta(h.club.currentPrice, h.club.prevTrade[0].price);
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
    <div className="w-full space-y-4">
      {allHoldings.map((row) => (
        <div className="flex justify-between" key={`holding-${row.club.clubId}`}>
          <span className="flex items-center space-x-2">
            <div className="flex items-center justify-center h-10 w-10 rounded-full overflow-hidden">
              <Image
                alt="token"
                src={row.token.image}
                width={40} // Adjusted width
                height={40} // Adjusted height
                objectFit="fill" // Crop to fill the circle
              />
            </div>
            <p className="font-owners tracking-wide">{row.token.name}{` ($${row.token.symbol})`}</p>
          </span>
          <div className="flex justify-between items-center md:gap-x-2">
            <p>{roundedToFixed(parseFloat(formatUnits(row.amount, DECIMALS)), 2)}</p>
            {row.priceDelta && row.priceDelta.valuePct > 0 && (
              <div className={`flex ${row.priceDelta.positive ? 'text-green-500' : 'text-red-200'}`}>
                {row.priceDelta.positive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="text-sm">{row.priceDelta.valuePct}%</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
