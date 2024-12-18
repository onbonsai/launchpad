import { useState, useMemo, useEffect } from "react";
import { orderBy } from "lodash/collection";
import { get } from "lodash/object";
import { useReadContract } from "wagmi";
import { useInView } from "react-intersection-observer";
import ClubCard from "./ClubCard";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { CONTRACT_CHAIN_ID, MIN_LIQUIDITY_THRESHOLD } from "@src/services/madfi/moneyClubs";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import DropDown from "@src/components/Icons/DropDown";
import useGetClubCreators from "@src/hooks/useGetClubCreators";

export const ClubList = ({ clubs, filterBy, filteredClubs, setFilteredClubs, setFilterBy, setPage, page, refetch, isLoading, hasMore }) => {
  const { ref, inView } = useInView()
  const [clubCreators, setClubCreators] = useState({});
  const { data: creators, isLoading: isLoadingClubCreators } = useGetClubCreators(clubs, clubCreators);
  const [sortedBy, setSortedBy] = useState<string>("club.marketCap");

  useEffect(() => {
    if (inView && !isLoading && hasMore) {
      setPage(page + 1);
      refetch();
    }
  }, [inView]);

  useEffect(() => {
    if (!isLoadingClubCreators) {
      setClubCreators({ ...clubCreators, ...creators });
    }
  }, [creators, isLoadingClubCreators]);

  const sortedClubs = useMemo(() => {
    const _clubs = filterBy ? filteredClubs : clubs;
    const direction = "desc";
    const orderedClubs = orderBy(_clubs, [club => {
      const value = get(club, sortedBy);
      return value ? BigInt(value) : 0;
    }], [direction]);

    const featuredClubs = orderedClubs.filter(({ club }) => club.featured);
    const nonFeaturedClubs = orderedClubs.filter(({ club }) => !club.featured);

    return [...featuredClubs, ...nonFeaturedClubs];
  }, [sortedBy, filterBy, filteredClubs]);

  const SortIcon = () => {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M14.6 14.6958L17.1095 12.5445L17.8905 13.4555L14.3908 16.4558L14.0003 16.7906L13.6098 16.4558L10.1095 13.4555L10.8905 12.5444L13.4 14.6955L13.4 3.99998H14.6L14.6 14.6958ZM2.50004 5.39976L10.5 5.4L10.5 6.6L2.5 6.59976L2.50004 5.39976ZM2.50002 9.4H9.00002V10.6H2.50002V9.4ZM7.50002 13.4H2.50002V14.6H7.50002V13.4Z" fill="white" fill-opacity="0.6" />
      </svg>

    );
  }

  return (
    <div className="bg-background text-secondary">
      <main className="mx-auto max-w-full">
        {sortedClubs.length > 0 && (
          <div className="mb-8">
            <ClubCard data={sortedClubs[0]} minLiquidityThreshold={MIN_LIQUIDITY_THRESHOLD} />
          </div>
        )}
        {/* FILTER */}
        <div className="relative max-w-full">
          <div className="flex justify-end">
            {filterBy ? (
              <div className="px-4 py-2 border-dark-grey border p-1 rounded-md flex items-center">
                <span className="text-secondary text-sm pr-4">{filterBy}</span>
                <button onClick={() => { setFilteredClubs([]); setFilterBy("") }} className="text-secondary inline-flex">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14.707 14.707a1 1 0 01-1.414 0L10 11.414l-3.293 3.293a1 1 0 01-1.414-1.414L8.586 10 5.293 6.707a1 1 0 011.414-1.414L10 8.586l3.293-3.293a1 1 0 011.414 1.414L11.414 10l3.293 3.293a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ) : null}
            <div className="relative bg-white/10 rounded-[10px] flex flex-row">
              <span className="mt-[9px] ml-2">
                <SortIcon />
              </span>
              <select
                id="sort-select"
                className="block appearance-none w-full bg-white border-transparent text-secondary rounded-[10px] focus:ring-transparent focus:border-transparent shadow-sm focus:outline-none sm:text-sm md:pl-1 md:pr-8 pr-10"
                onChange={(e) => setSortedBy(e.target.value)}
                style={{ background: "none" }}
              >
                <option value="club.marketCap">Mcap</option>
                <option value="club.createdAt">Age</option>
                <option value="publication.stats.comments">Replies</option>
              </select>
              <DropDown />
            </div>
          </div>
        </div>

        <section aria-labelledby="table-heading" className="max-w-full mt-6">
          <div className="lg:col-span-3 max-w-full whitespace-nowrap">
            <ul role="list" className="grid group/item grid-cols-1 gap-x-4 gap-y-4 lg:grid-cols-3">
              {sortedClubs.map((club, idx) =>
                <li className="w-full" key={`club-${idx}`}>
                  <ClubCard
                    data={club}
                    minLiquidityThreshold={MIN_LIQUIDITY_THRESHOLD}
                    creatorProfile={clubCreators[club.club.clubId] ? clubCreators[club.club.clubId][0].profile : undefined}
                  />
                </li>
              )}
            </ul>
            {hasMore && (
              <div ref={ref} className="flex justify-center pt-4">
                <Spinner customClasses="h-6 w-6" color="#E42101" />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};