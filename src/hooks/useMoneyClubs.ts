import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { omit } from "lodash/object";
import { groupBy } from "lodash/collection";
import { getAddress, createPublicClient, http, zeroAddress } from "viem";
import { mainnet } from 'viem/chains'
import {
  getRegisteredClub,
  getRegisteredClubById,
  getVolume,
  getBalance,
  getAvailableBalance,
  getBuyPrice,
  getSellPrice,
  getFeesEarned,
  getRegistrationFee,
  getRegisteredClubs,
  getTrades,
  getHoldings,
  getClubHoldings,
  getSupply,
  getBuyAmount,
  getFeaturedClubs,
  searchClubs,
  getRewardPool,
} from "@src/services/madfi/moneyClubs";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { getProfilesByOwners } from "@src/services/lens/getProfiles";

export const useRegisteredClubById = (clubId: string) => {
  return useQuery({
    queryKey: ["registered-club-id", clubId],
    queryFn: () => getRegisteredClubById(clubId),
    enabled: !!clubId,
    staleTime: 10000,
    gcTime: 60000,
  });
};

export const useRegisteredClubByToken = (tokenAddress?: `0x${string}`, chain?: string) => {
  return useQuery({
    queryKey: ["registered-club-token", tokenAddress, chain],
    queryFn: () => getRegisteredClubById("", chain, tokenAddress),
    enabled: !!tokenAddress && !!chain,
    staleTime: 10000,
    gcTime: 60000,
  });
};

export const useRegisteredClub = (handle?: string, profileId?: string) => {
  return useQuery({
    queryKey: ["registered-club", handle, profileId],
    queryFn: () => getRegisteredClub(handle!, profileId),
    enabled: !!handle || !!profileId,
    staleTime: 10000,
    gcTime: 60000,
  });
};

export const useGetFeaturedClubs = () => {
  return useQuery({
    queryKey: ["featured-clubs"],
    queryFn: async () => {
      const clubs = await getFeaturedClubs();
      if (!clubs) return [];
      return clubs.map((club) => ({
        publication: club.publication,
        club: omit(club, 'publication'),
      }));
    },
    // refetchInterval: 60000,
    // staleTime: 60000,
    // gcTime: 60000,
  });
};

export const useGetRegisteredClubs = (sortedBy: string) => {
  return useInfiniteQuery({
    queryKey: ['registered-clubs', sortedBy],
    queryFn: async ({ pageParam = { base: 0, lens: 0 } }) => {
      try {
        // Fetch from both chains in parallel
        const [baseRes, lensRes] = await Promise.all([
          getRegisteredClubs(pageParam.base, sortedBy, 'base'),
          getRegisteredClubs(pageParam.lens, sortedBy, 'lens')
        ]);

        // Transform and combine the results
        const baseClubs = (baseRes.clubs || []).map(club => ({
          ...club,
          publication: club.publication,
          club: omit(club, 'publication'),
          chain: 'base'
        }));

        const lensClubs = (lensRes.clubs || []).map(club => ({
          ...club,
          publication: club.publication,
          club: omit(club, 'publication'),
          chain: 'lens'
        }));

        // Combine and sort the clubs according to sortedBy parameter
        const combinedClubs = [...baseClubs, ...lensClubs];

        return {
          clubs: combinedClubs,
          nextPage: {
            base: baseRes.hasMore ? pageParam.base + 1 : pageParam.base,
            lens: lensRes.hasMore ? pageParam.lens + 1 : pageParam.lens,
          },
          hasMore: (baseRes.hasMore || lensRes.hasMore) && combinedClubs.length > 0
        };
      } catch (error) {
        console.error('Failed to fetch clubs:', error);
        throw error;
      }
    },
    initialPageParam: { base: 0, lens: 0 },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    refetchInterval: 60000,
    staleTime: 60000,
    gcTime: 60000,
  });
};

export const useGetClubVolume = (clubId?: string) => {
  return useQuery({
    queryKey: ["club-volume", clubId],
    queryFn: () => getVolume(clubId!),
    enabled: !!clubId,
    refetchInterval: 15000, // fetch every 15seconds
    staleTime: 15000,
    gcTime: 15000,
  });
};

export const useGetClubSupply = (tokenAddress: `0x${string}` | undefined, chain = "base") => {
  return useQuery({
    queryKey: ["club-supply", tokenAddress, chain],
    queryFn: () => getSupply(tokenAddress! as `0x${string}`, chain),
    enabled: !!tokenAddress,
    refetchInterval: 15000, // fetch every 15seconds
    staleTime: 15000,
    gcTime: 15000,
  });
};

const useTraderProfiles = (traders?: string[]) => {
  return useQuery({
    queryKey: ["trader-profiles", traders],
    queryFn: async () => {
      if (!traders?.length) return {};
      const profiles = await getProfilesByOwners(traders);
      return { profilesGrouped: groupBy(profiles, 'owner') };
    },
    enabled: !!traders?.length,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};

export const useGetClubTrades = (clubId: string, page: number, chain: string) => {
  const tradesQuery = useQuery({
    queryKey: ["club-raw-trades", chain, clubId, page],
    queryFn: () => getTrades(clubId!, page, chain),
    enabled: !!clubId,
    staleTime: 60000,
  });

  const traders = tradesQuery.data?.trades?.map(trade => trade.trader.id);
  const profilesQuery = useTraderProfiles(traders);

  return useQuery({
    queryKey: ["club-trades", clubId, page],
    queryFn: () => {
      const trades = tradesQuery.data?.trades?.map(trade => {
        const address = getAddress(trade.trader.id);
        const profile = profilesQuery.data?.profilesGrouped[address]?.[0];
        return { ...trade, profile };
      });

      return {
        trades,
        hasMore: tradesQuery.data?.hasMore
      };
    },
    enabled: !tradesQuery.isLoading && !profilesQuery.isLoading,
    staleTime: 60000,
  });
};

export const useGetClubHoldings = (clubId: string, page: number, chain = "base") => {
  return useQuery({
    queryKey: ["club-holdings", clubId, page],
    queryFn: async () => {
      const res = await getClubHoldings(clubId!, page, chain);
      const profiles = await getProfilesByOwners(res.holdings?.map(({ trader }) => trader.id));
      const profilesGrouped = groupBy(profiles, 'owner');

      const holdings = await Promise.all(res.holdings?.map(async (trade) => {
        const address = getAddress(trade.trader.id);
        const profile = profilesGrouped[address] ? profilesGrouped[address][0] : undefined;
        return { ...trade, profile };
      }));

      return { holdings, hasMore: res.hasMore };
    },
    enabled: !!clubId,
    staleTime: 20000,
    gcTime: 60000 * 5,
  });
};

export const useGetHoldings = (account?: `0x${string}`, page?: number) => {
  return useQuery({
    queryKey: ["holdings", account, page],
    queryFn: async () => {
      const [resBase, resLens] = await Promise.all([
        getHoldings(account!, page!, "base"),
        getHoldings(account!, page!, "lens")
      ]);
      const allHoldings = [...resLens.holdings, ...resBase.holdings];
      return { holdings: allHoldings, hasMore: resBase.hasMore || resLens.hasMore };
    },
    enabled: !!account,
    refetchInterval: 60000, // fetch every minute
    staleTime: 120000,
    gcTime: 120000,
  });
};

export const useGetClubBalance = (clubId?: string, address?: `0x${string}`, chain = "base", complete?: boolean, tokenAddress?: `0x${string}`) => {
  return useQuery({
    queryKey: ["club-balance", clubId, address],
    queryFn: () => getBalance(clubId!, address!, chain, complete, tokenAddress),
    enabled: (!!clubId && !!address) || (tokenAddress == PROTOCOL_DEPLOYMENT.lens.Bonsai),
    staleTime: 10000,
    gcTime: 60000,
  });
};

export const useGetBuyPrice = (account?: `0x${string}`, clubId?: string, amount?: string, chain = "base") => {
  return useQuery({
    queryKey: ["buy-price", clubId, amount],
    queryFn: () => getBuyPrice(account!, clubId!, amount!, undefined, chain),
    enabled: !!clubId && !!amount,
    refetchInterval: 15000, // refetch every 15 seconds
    staleTime: 2000,
    gcTime: 15000,
  });
};

export const useGetBuyAmount = (account?: `0x${string}`, tokenAddress?: `0x${string}`, spendAmount?: string, chain = "base", options?: { initialPrice?: string, targetPriceMultiplier?: string, flatThreshold?: string, completed?: boolean }) => {
  return useQuery({
    queryKey: ["buy-amount", tokenAddress, spendAmount],
    queryFn: () => getBuyAmount(account!, tokenAddress!, spendAmount!, undefined, chain, options),
    enabled: !!tokenAddress && !!spendAmount && !!account && !options?.completed,
    refetchInterval: 5000, // refetch every 5 seconds
    staleTime: 1000,
    gcTime: 5000,
  });
};

export const useGetRegistrationFee = (amount: number | string, account?: `0x${string}`, chain = "base", pricingTier?: string) => {
  return useQuery({
    queryKey: ["registration-fee", amount, account],
    queryFn: () => getRegistrationFee(amount.toString()!, account!, chain, pricingTier),
    enabled: !!account,
    staleTime: 1000,
    gcTime: 2000,
  });
};

export const useGetSellPrice = (account?: `0x${string}`, clubId?: string, amount?: string, chain = "base") => {
  return useQuery({
    queryKey: ["sell-price", clubId, amount],
    queryFn: () => getSellPrice(account!, clubId!, amount!, false, chain),
    enabled: !!clubId && !!amount && !!account,
    staleTime: 1000,
    gcTime: 15000,
  });
};

export const useGetFeesEarned = (account?: `0x${string}`) => {
  return useQuery({
    queryKey: ["fees-earned", account],
    queryFn: () => getFeesEarned(account!),
    enabled: !!account,
    refetchInterval: 15000, // fetch every 15seconds
    staleTime: 15000,
    gcTime: 15000,
  });
};

type TradingInfoResponse = {
  name: string;
  symbol: string;
  image: string;
  createdAt: string;
  buyPrice: string;
  volume24Hr: string;
  liquidity: string;
  marketCap: string;
  holders: number;
  graduated: boolean;
  priceDeltas: {
    [key: string]: string;
  };
};
export const useGetTradingInfo = (clubId?: number, chain = "base") => {
  return useQuery({
    queryKey: ["trading-info", clubId],
    queryFn: async () => {
      const data: TradingInfoResponse = await fetch(`/api/clubs/get-trading-info?clubId=${clubId}&chain=${chain}`)
        .then(response => response.json());
      return data;
    },
    enabled: !!clubId && clubId !== 0,
    staleTime: 60000,
    gcTime: 60000 * 5,
  });
};

export const useGetAvailableBalance = (
  tokenAddress: `0x${string}`,
  address: `0x${string}` | undefined,
  complete: boolean,
  chain = "base"
) => {
  return useQuery({
    queryKey: ["club-available-balance", tokenAddress, address],
    queryFn: () => getAvailableBalance(tokenAddress!, address!, chain),
    enabled: !!address && complete && tokenAddress !== zeroAddress,
    staleTime: 10000,
    gcTime: 60000,
  });
};

export const useSearchClubs = (query?: string) => {
  return useQuery({
    queryKey: ["search-clubs", query],
    queryFn: async () => {
      const [baseResults, lensResults] = await Promise.all([
        searchClubs(query!, "base"),
        searchClubs(query!, "lens")
      ]);
      return [...lensResults, ...baseResults];
    },
    enabled: !!query,
    staleTime: 120000,
    gcTime: 300000,
  });
};

export const useGetRewardPool = (address: `0x${string}`) => {
  return useQuery({
    queryKey: ["reward-pool", address],
    queryFn: () => getRewardPool(address!),
    enabled: !!address,
    staleTime: 10000,
    gcTime: 60000,
    refetchOnWindowFocus: false,
  });
};
