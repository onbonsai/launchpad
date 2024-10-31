import Link from "next/link";
import { useInView } from "react-intersection-observer";
import { useState, useEffect } from "react";
import { getLensPfp, shortAddress, roundedToFixed, kFormatter } from "@src/utils/utils";
import { useGetClubHoldings } from "@src/hooks/useMoneyClubs";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import CreatorButton from "@src/components/Creators/CreatorButton";
import { formatEther } from "viem";

const CreatorPill = () => {
  return (
    <div className="flex h-[18px] items-center justify-center bg-brand-highlight text-white px-1 rounded-lg font-semibold text-xs leading-4">
      CREATOR
    </div>
  )
}

interface InfoPillProps {
  text: string;
}

export const InfoPill = (props: InfoPillProps) => {
  return (
    <div className="flex items-center justify-center bg-card-light text-white px-[10px] py-1 rounded-[10px] text-base leading-5">
      {props.text}
    </div>
  )
}

const Row = ({ row, supply, creator }) => {
  let share = ((BigInt(row.amount) * BigInt(100)) / BigInt(supply)).toString();
  if (share === "0") share = "<1";
  const creatorName = row.profile?.username?.localName || row.profile.metadata.name || shortAddress(row.trader?.id, 6).split("... ")[0];

  const formattedNumber = kFormatter(parseFloat(formatEther(row.amount.toString())));
  return (
    <tr className={`text-white`}>
      <td className="bg-card rounded-2xl">
        <div className="flex flex-col justify-between items-start p-3 gap-5">
          <div className="mr-2 flex items-center gap-2">
            {!!(row.profile?.username?.localName)
              ? <Link href={`/profile/${row.profile.username.localName}`} target="_blank">
                <CreatorButton text={creatorName} image={getLensPfp(row.profile)} />
              </Link>
              : <CreatorButton text={creatorName} image={getLensPfp(row.profile)} />
            }
            {creator === row.trader.id && <CreatorPill />}
          </div>
          <div className="flex gap-1">
            <InfoPill text={`${share}%`} />
            <InfoPill text={formattedNumber} />
          </div>
        </div>
      </td>
      {/* <td className="px-2 bg-card rounded-tr-2xl rounded-br-2xl">{share}%</td> */}
    </tr>
  )
}

export const HolderDistribution = ({ clubId, supply, creator, chain }) => {
  const { ref, inView } = useInView()
  const [page, setPage] = useState(0);
  const [allHoldings, setAllHoldings] = useState<any[]>([]);
  const { data, isLoading, refetch } = useGetClubHoldings(clubId, page, chain);
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
        <Spinner customClasses="h-6 w-6" color="#5be39d" />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto overflow-y-auto md:max-h-[840px] max-h-[500px] mt-4 rounded-lg shadow-md">
      <table className="mb-2 w-full text-center border-separate [border-spacing:0_4px]">
        <tbody>
          {allHoldings.map((row, index) => (
            <Row key={index} row={row} supply={supply} creator={creator} />
          ))}
          {hasMore && (
            <div ref={ref} className="flex justify-center pt-4">
              <Spinner customClasses="h-6 w-6" color="#5be39d" />
            </div>
          )}
        </tbody>
      </table>
    </div>
  )
}
