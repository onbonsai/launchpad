import { Dialog } from "@headlessui/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import External from "@src/components/Icons/External";
import { getHandleAndFollowersByAddresses } from "@src/services/lens/getProfiles";
import { getLensPfp } from "@src/utils/utils";

const ReferralListModal = ({ user }) => {
  const [creatorProfiles, setCreatorProfiles] = useState<any[]>([]);
  const [clubProfiles, setClubProfiles] = useState<any[]>([]);

  const hasCreatorReferrals = useMemo(() => user.creatorReferrals && user.creatorReferrals.length > 0, [user]);
  const hasClubReferrals = useMemo(() => user.clubReferrals && user.clubReferrals.length > 0, [user]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const [_creatorProfiles, _clubProfiles] = await Promise.all([
        getHandleAndFollowersByAddresses(user.creatorReferrals.map((ref) => ref.id)),
        getHandleAndFollowersByAddresses(user.clubReferrals.map((ref) => ref.id)),
      ]);
      setCreatorProfiles(_creatorProfiles || []);
      setClubProfiles(_clubProfiles || []);
    };
    if (hasCreatorReferrals || hasClubReferrals) fetchProfiles();
  }, [user]);

  return (
    <div className="flex flex-col w-full mt-8">
      <Dialog.Title as="h2" className="text-6xl uppercase text-center font-bold">
        Your Referrals
      </Dialog.Title>
      <div className="w-full mt-4 md:mb-8 mb-4 md:h-full">
        {hasCreatorReferrals && creatorProfiles?.length > 0 ? (
          <>
            <p>Creator Referrals</p>
            <table className="mb-6 mt-6 w-full text-left">
              <thead className="">
                <tr>
                  <th className="px-2">Creator</th>
                  <th className="px-2"></th>
                </tr>
              </thead>
              <tbody>
                {user.creatorReferrals.map((row, index) => (
                  <tr key={index} className="text-white border-b border-gray-500 h-14">
                    <td className="px-2">
                      <div className="flex ">
                        <Image
                          src={getLensPfp(creatorProfiles[index])}
                          alt={creatorProfiles[index].handle.localName}
                          className="rounded-full"
                          height={32}
                          width={32}
                        />
                        <span className="ml-8 mt-1">{creatorProfiles[index].metadata.displayName}</span>
                      </div>
                    </td>
                    <td className="px-2">
                      <Link href={`creators/${creatorProfiles[index].handle.localName}`}>
                        <External />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : !hasCreatorReferrals ? (
          <p>No Creator Referrals</p>
        ) : (
          <p className="text-center text-xl mt-8">Loading...</p>
        )}
        {hasClubReferrals && clubProfiles.length > 0 ? (
          <>
            <p>Club Referrals</p>
            <table className="mb-6 mt-6 w-full text-left">
              <thead className="">
                <tr>
                  <th className="px-2">Subscriber</th>
                  <th className="px-2"></th>
                </tr>
              </thead>
              <tbody>
                {user.clubReferrals.map((row, index) => (
                  <tr key={index} className="text-white border-b border-gray-500 h-14">
                    <td className="px-2">
                      <div className="flex ">
                        <Image
                          src={getLensPfp(clubProfiles[index])}
                          alt={clubProfiles[index].handle.localName}
                          className="rounded-full"
                          height={32}
                          width={32}
                        />
                        <span className="ml-8 mt-1">{clubProfiles[index].metadata.displayName}</span>
                      </div>
                    </td>
                    <td className="px-2">
                      <Link href={`creators/${clubProfiles[index].handle.localName}`}>
                        <External />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : !hasClubReferrals ? (
          <p>No Club Referrals</p>
        ) : (
          <p className="text-center text-xl mt-8">Loading...</p>
        )}
      </div>
    </div>
  );
};

export default ReferralListModal;
