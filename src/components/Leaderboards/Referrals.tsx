import Link from "next/link";

import { getLensPfp } from "@src/utils/utils";
import External from "@src/components/Icons/External";

const Row = ({ row, index }) => (
  <tr className="text-white border-b border-gray-500 h-14">
    <td className="text-left pl-2">
      {index + 1} {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : ""}
    </td>
    <td className="px-2">
      <div className="grid grid-cols-5 items-center pl-8">
        <div className="col-span-1 mr-2">
          {row.lens?.metadata && (
            <img
              src={getLensPfp(row.lens)}
              alt={row.lens?.handle.localName}
              className="rounded-full"
              height="32"
              width="32"
            />
          )}
        </div>
        <span className="col-span-4 text-left">{row.lens ? row.lens?.metadata?.displayName || `@${row.lens?.handle.localName}` : shortAddress(row.id, 6)}</span>
      </div>
    </td>
    <td className="px-2">{row.totalReferralCount}</td>
    <td className="px-2">{row.creatorReferralCount}</td>
    <td className="px-2">{row.clubReferralCount}</td>
    <td className="px-2">{Number(row.totalMoneyEarned).toLocaleString()}</td>
    <td className="px-2">{Number(row.totalPointsEarned).toLocaleString()}</td>
    <td className="px-2">
      <Link href={`creators/${row.lens.handle.localName}`}>
        <External />
      </Link>
    </td>
  </tr>
);

const ReferralsLeaderboard = ({ referralLeaderboard }) => (
  <div className="overflow-x-auto mb-8">
    <table className="mb-6 mt-6 w-full text-center">
      <thead className="uppercase bg-secondary text-black">
        <tr>
          <th className="w-16 h-8 text-left pl-2">#</th>
          <th className="px-2">User</th>
          <th className="px-2">Total Referrals</th>
          <th className="px-2">Creator Referrals</th>
          <th className="px-2">Club Referrals</th>
          <th className="px-2">$ Earned</th>
          <th className="px-2">Points Earned</th>
          <th className="px-2"></th>
        </tr>
      </thead>
      <tbody>
        {referralLeaderboard.map((row, index) => (
          <Row key={row.profile_id} row={row} index={index} />
        ))}
      </tbody>
    </table>
  </div>
);

export default ReferralsLeaderboard;
