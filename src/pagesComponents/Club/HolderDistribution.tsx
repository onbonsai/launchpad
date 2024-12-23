import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { useState, useEffect } from "react";
import { getLensPfp, shortAddress, roundedToFixed } from "@src/utils/utils";
import { useGetClubHoldings } from "@src/hooks/useMoneyClubs";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";

const Row = ({ row, supply, creator }) => {
  let share = ((BigInt(row.amount) * BigInt(100)) / BigInt(supply)).toString();
  if (share === "0") share = "<1";
  return (
    <tr className={`text-white h-14 bg-`}>
    <td className="px-2">
      <div className="grid grid-cols-5 items-center">
        <div className="col-span-1 mr-2">
          {row.profile?.metadata && (
            <img
              src={getLensPfp(row.profile)}
              alt={row.profile?.handle?.localName}
              className="rounded-full"
              height="32"
              width="32"
            />
          )}
        </div>
        <span className="col-span-4 text-left overflow-ellipsis overflow-hidden whitespace-nowrap">
          {row.profile?.handle && row.profile?.handle?.localName ? (
            <Link href={`/profile/${row.profile.handle.localName}`} target="_blank">
              <span className="link-hover">@{row.profile.handle.localName}</span>
            </Link>
          ) : (
            row.ens || shortAddress(row.trader?.id, 6).split("... ")[0]
          )}
          {creator === row.trader.id && <span className="ml-2">(creator)</span>}
        </span>
      </div>
    </td>
    <td className="px-2">{share}%</td>
  </tr>
  )
}

export const HolderDistribution = ({ clubId, supply, creator }) => {
  const { ref, inView } = useInView()
  const [page, setPage] = useState(0);
  const [allHoldings, setAllHoldings] = useState<any[]>([]);
  const { data, isLoading, refetch } = useGetClubHoldings(clubId, page);
  const { holdings, hasMore } = data || {};

  useEffect(() => {
    if (inView && !isLoading && hasMore) {
      setPage(page + 1);
      refetch();
    }
  }, [inView]);

  useEffect(() => {
    if (!isLoading && holdings?.length) {
      setAllHoldings([...allHoldings, ...holdings].sort((a, b) => parseInt(b.amount) - parseInt(a.amount)));
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
    <div className="overflow-x-auto overflow-y-auto md:max-h-[840px] max-h-[500px] mt-4 rounded-xl shadow-md">
      <table className="mb-2 w-full text-center">
        <thead className="uppercase bg-card bg-dark-grey">
          <tr>
            <th className="px-2">User</th>
            <th className="px-2"></th>
          </tr>
        </thead>
        <tbody>
          {allHoldings.map((row, index) => (
            <Row key={index} row={row} supply={supply} creator={creator} />
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
