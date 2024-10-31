import { useState, useMemo } from "react";
import { orderBy } from "lodash/collection";
import { get } from "lodash/object";

import ClubCard from "./ClubCard";

export const ClubList = ({ clubs, filterBy, filteredClubs, setFilteredClubs, setFilterBy }) => {
  const [sortedBy, setSortedBy] = useState<string>("club.marketCap");

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

  return (
    <div className="bg-background text-secondary">
      <main className="mx-auto max-w-full">
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
            <select
              id="sort-select"
              className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm md:w-[150px]"
              onChange={(e) => setSortedBy(e.target.value)}
            >
              <option value="club.marketCap">Market Cap</option>
              <option value="club.currentPrice">Price</option>
              <option value="publication.stats.comments">Replies</option>
            </select>
          </div>
        </div>

        <section aria-labelledby="table-heading" className="max-w-full mt-4">
          <div className="lg:col-span-3 max-w-full whitespace-nowrap">
            <ul role="list" className="grid group/item grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-3">
              {sortedClubs.map((club, idx) =>
                <li className="w-full" key={`club-${idx}`}>
                  <ClubCard data={club} />
                </li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};