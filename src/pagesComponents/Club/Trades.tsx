import Link from "next/link";
import { formatUnits } from "viem";
import { useInView } from "react-intersection-observer";
import { useState, useEffect } from "react";

import { getLensPfp, shortAddress, roundedToFixed } from "@src/utils/utils";
import External from "@src/components/Icons/External";
import { DECIMALS, USDC_DECIMALS, baseScanUrl } from "@src/services/madfi/moneyClubs";
import formatRelativeDate from "@src/utils/formatRelativeDate";
import { useGetClubTrades } from "@src/hooks/useMoneyClubs";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { InfoPill } from "./HolderDistribution";
import CreatorButton from "@src/components/Creators/CreatorButton";

const formatDate = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };

  let formattedDate = date.toLocaleDateString('en-US', options);

  formattedDate = formattedDate.replace(/,/g, '');
  return formattedDate;
}

const Row = ({ row }) => {
  const txDate = new Date(parseInt(row?.createdAt as string) * 1000);
  return <div className={`text-white ${row.isBuy ? 'bg-[#0B99811F]' : 'bg-[#CD30301F]'} rounded-2xl bg-opacity-[0.12] flex flex-col py-[10px] px-3`}>
    <div className="flex flex-row items-center font-semibold text-base leading-5 mb-3">
      {row.isBuy ? 'Bought' : 'Sold'}{" "}
      <div className="text-sm leading-4 text-left font-normal text-white/40 pl-[6px]">
        {formatDate(txDate)}
        <span className="px-1" >•</span>
        {formatRelativeDate(new Date(parseInt(row?.createdAt as string) * 1000))}
      </div>
    </div>
    <div className="flex flex-row items-center mb-5">
      <InfoPill text={`${row.isBuy ? "+" : "-"}${roundedToFixed(parseFloat(formatUnits(row.amount, DECIMALS)), 2)}`} />
      <span className="px-[6px]">for</span>
      <InfoPill text={`$${roundedToFixed(parseFloat(formatUnits(row.txPrice, USDC_DECIMALS)), 2)}`} />
    </div>

    <div className="flex justify-between items-center">
      <Link href={`/profile/${row.profile.handle?.localName}`} target="_blank" className="hover:opacity-80">
        <CreatorButton text={row.profile?.handle?.localName || shortAddress(row.trader?.id, 6).split("... ")[0]} image={getLensPfp(row.profile)} />
      </Link>
      <Link href={baseScanUrl(row.txHash)} target="_blank" className="opacity-100">
        <img src="/svg/external.svg" alt="X Logo" className="bg-card p-[5px] rounded-[10px]" />
      </Link>
    </div>

    {/* <td className="px-2">{row.isBuy ? "+" : "-"}{" "}{roundedToFixed(parseFloat(formatUnits(row.amount, DECIMALS)), 2)}</td>
    <td className="px-2">${roundedToFixed(parseFloat(formatUnits(row.txPrice, USDC_DECIMALS)), 2)}{" "}</td>
    <td className="px-2">
      <Link href={baseScanUrl(row.txHash)} target="_blank">
        <External />
      </Link>
    </td> */}
  </div>
};

export const Trades = ({ clubId }) => {
  const { ref, inView } = useInView()
  const [page, setPage] = useState(0);
  const [allTrades, setAllTrades] = useState<any[]>([]);
  const { data, isLoading, refetch } = useGetClubTrades(clubId, page);
  const { trades, hasMore } = data || {};

  useEffect(() => {
    if (inView && !isLoading && hasMore) {
      setPage(page + 1);
      refetch();
    }
  }, [inView]);

  useEffect(() => {
    if (!isLoading && trades?.length) {
      setAllTrades([...allTrades, ...trades].sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt)));
    }
  }, [isLoading]);

  if (isLoading && allTrades.length === 0) {
    return (
      <div ref={ref} className="flex justify-center pt-4">
        <Spinner customClasses="h-6 w-6" color="#E42101" />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto overflow-y-auto md:max-h-[840px] max-h-[500px] mt-4 shadow-md mb-[100px]">
      <div className="mb-2 w-full text-center flex flex-col gap-1">
        {allTrades.map((row, index) => (
          <Row key={index} row={row} />
        ))}
        {hasMore && (
          <div ref={ref} className="flex justify-center pt-4">
            <Spinner customClasses="h-6 w-6" color="#E42101" />
          </div>
        )}
      </div>
    </div>
  )
}
