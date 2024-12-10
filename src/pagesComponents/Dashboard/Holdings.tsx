import Image from "next/image";
import { formatUnits, decodeAbiParameters, formatEther } from "viem";
import { useInView } from "react-intersection-observer";
import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";

import { roundedToFixed } from "@src/utils/utils";
import { kFormatter } from "@src/utils/utils";
import { Header, Subtitle } from "@src/styles/text";
import { DECIMALS, calculatePriceDelta, CONTRACT_CHAIN_ID, BONSAI_TOKEN_BASE_ADDRESS } from "@src/services/madfi/moneyClubs";
import { useGetHoldings } from "@src/hooks/useMoneyClubs";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import HoldingSection from "./HoldingSection";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";

interface HoldingProps {
  address: `0x${string}`;
  bonsaiAmount: bigint;
}

export const Holdings = (props: HoldingProps) => {
  const { address, bonsaiAmount } = props;
  const { ref, inView } = useInView()
  const [page, setPage] = useState(0);
  const [allHoldings, setAllHoldings] = useState<any[]>();
  const [bonsaiPrice, setBonsaiPrice] = useState(0);
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
      setAllHoldings([...allHoldings || [], ..._holdings]);
    }
  }, [isLoading]);

  useMemo(() => {
    if (!bonsaiAmount || bonsaiAmount === BigInt(0)) {
      setBonsaiPrice(0);
      return;
    }
    const tokenPrice = queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C");
    const bonsaiHoldings = Number.parseFloat(formatEther(bonsaiAmount));
    const tokenHoldings = tokenPrice * bonsaiHoldings;
    setBonsaiPrice(tokenHoldings);
  }, [bonsaiAmount]);

  const totalBalance = useMemo(() => {
    if (!allHoldings) return;
    return allHoldings!.reduce((total, holding) => total + holding.balance, bonsaiPrice || 0);
  }, [bonsaiPrice, allHoldings]);

  if (isLoading && allHoldings === undefined) {
    return (
      <div ref={ref} className="flex justify-center pt-4">
        <Spinner customClasses="h-6 w-6" color="#E42101" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <Subtitle className="mb-2">
        Balance
      </Subtitle>
      <Header>
        ${!!totalBalance ? roundedToFixed(totalBalance, 2) : '-'}
      </Header>
      <HoldingSection
        holdings={allHoldings || []}
        bonsaiAmount={bonsaiAmount}
        bonsaiPriceString={bonsaiPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      />
    </div>
  )
}
