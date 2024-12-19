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

const Row = ({ row }) => (
  <tr className={`text-white h-14 ${row.isBuy ? 'bg-green-800' : 'bg-red-700'} bg-opacity-40`}>
    <td className="px-2 text-xs text-left">
      {formatRelativeDate(new Date(parseInt(row?.createdAt as string) * 1000))}
    </td>
    <td className="px-2">
      <div className="grid grid-cols-5 items-center">
        <div className="col-span-1 mr-2">
          {row.profile?.metadata && (
            <img
              src={getLensPfp(row.profile)}
              alt={row.profile?.handle.localName}
              className="rounded-full"
              height="32"
              width="32"
            />
          )}
        </div>
        <span className="col-span-4 text-left overflow-ellipsis overflow-hidden whitespace-nowrap">
          {row.profile?.handle.localName ? (
            <Link href={`/profile/${row.profile.handle.localName}`} target="_blank">
              <span className="link-hover">@{row.profile.handle.localName}</span>
            </Link>
          ) : (
            row.ens || shortAddress(row.trader?.id, 6).split("... ")[0]
          )}
        </span>
      </div>
    </td>
    <td className="px-2">{row.isBuy ? "+" : "-"}{" "}{roundedToFixed(parseFloat(formatUnits(row.amount, DECIMALS)), 2)}</td>
    <td className="px-2">${roundedToFixed(parseFloat(formatUnits(row.txPrice, USDC_DECIMALS)), 2)}{" "}</td>
    <td className="px-2">
      <Link href={baseScanUrl(row.txHash)} target="_blank">
        <External />
      </Link>
    </td>
  </tr>
);

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
    <div className="overflow-x-auto overflow-y-auto md:max-h-[840px] max-h-[500px] mt-4 rounded-xl shadow-md mb-[100px]">
      <table className="mb-2 w-full text-center">
        <thead className="uppercase bg-card bg-dark-grey">
          <tr>
            <th className="w-16 h-8 text-left pl-2">Date</th>
            <th className="px-2">User</th>
            <th className="px-2">Amount</th>
            <th className="px-2">Price</th>
            <th className="px-2">Txn</th>
          </tr>
        </thead>
        <tbody>
          {allTrades.map((row, index) => (
            <Row key={index} row={row} />
          ))}
          {hasMore && (
            <div ref={ref} className="flex justify-center pt-4">
              <Spinner customClasses="h-6 w-6" color="#E42101" />
            </div>
          )}
        </tbody>
      </table>
    </div>
  )
}
