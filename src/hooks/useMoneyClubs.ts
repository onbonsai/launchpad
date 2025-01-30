import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { omit } from "lodash/object";
import { getAddress, createPublicClient, http, zeroAddress } from "viem";
import { mainnet } from 'viem/chains'
import { groupBy } from "lodash/collection";
import { createEnsPublicClient } from '@ensdomains/ensjs'
import { getName } from '@ensdomains/ensjs/public'
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
} from "@src/services/madfi/moneyClubs";
import { getHandlesByAddresses } from "@src/services/lens/getProfiles";

export const useRegisteredClubById = (clubId: string) => {
  return useQuery({
    queryKey: ["registered-club-id", clubId],
    queryFn: () => getRegisteredClubById(clubId),
    enabled: !!clubId,
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

export const useGetRegisteredClubs = (sortedBy: string) => {
  return useInfiniteQuery({
    queryKey: ['registered-clubs', sortedBy],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const res = await getRegisteredClubs(pageParam, sortedBy);
        const data = res.clubs.map((club) => ({
          publication: club.publication,
          club: omit(club, 'publication'),
        }));
        return {
          clubs: data,
          nextPage: pageParam + 1,
          hasMore: res.hasMore && data.length > 0
        };
      } catch (error) {
        console.error('Failed to fetch clubs:', error);
        throw error;
      }
    },
    initialPageParam: 0,
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

export const useGetClubSupply = (tokenAddress?: string) => {
  return useQuery({
    queryKey: ["club-supply", tokenAddress],
    queryFn: () => getSupply(tokenAddress! as `0x${string}`),
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
      const profiles = await getHandlesByAddresses(traders);
      // const publicClient = createEnsPublicClient({
      //   chain: mainnet,
      //   transport: http(),
      // })

      // Group profiles by address
      const profilesGrouped = groupBy(profiles, 'ownedBy.address');

      // TODO: no viem batch function for ens!

      // // Fetch ENS names for addresses without profiles in parallel
      // const addressesWithoutProfiles = traders.filter(addr => !profilesGrouped[getAddress(addr)]);

      // const ensQueries = addressesWithoutProfiles.map((addr) => {
      //   return getName.batch({ address: (addr as `0x${string}`) });
      // });

      // // Filter out addresses without an ENS name
      // const ensNameResults = await publicClient.ensBatch(...ensQueries);
      // const pairedResults = addressesWithoutProfiles.map((addr, index) => {
      //   const result = ensNameResults[index];
      //   // If there's no result or no name, return null so that we can filter it out
      //   return result && result.name ? [addr, result.name] : null;
      // }).filter((entry): entry is [string, string] => entry !== null);

      // const ensNames = Object.fromEntries(pairedResults);

      return { profiles: profilesGrouped };
    },
    enabled: !!traders?.length,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });
};

export const useGetClubTrades = (clubId: string, page: number) => {
  const tradesQuery = useQuery({
    queryKey: ["club-raw-trades", clubId, page],
    queryFn: () => getTrades(clubId!, page),
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
        const profile = profilesQuery.data?.profiles[address]?.[0];
        const ens = profilesQuery.data?.ensNames?.[trade.trader.id] ?? null;
        return { ...trade, profile, ens };
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

export const useGetClubHoldings = (clubId: string, page: number) => {
  return useQuery({
    queryKey: ["club-holdings", clubId, page],
    queryFn: async () => {
      const res = await getClubHoldings(clubId!, page);
      const publicClient = createPublicClient({ chain: mainnet, transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC) });
      const profiles = await getHandlesByAddresses(res.holdings?.map(({ trader }) => trader.id));
      const profilesGrouped = groupBy(profiles, 'ownedBy.address');

      const holdings = await Promise.all(res.holdings?.map(async (trade) => {
        const address = getAddress(trade.trader.id);
        const profile = profilesGrouped[address] ? profilesGrouped[address][0] : undefined;
        let ens;
        if (!profile) ens = await publicClient.getEnsName({ address });
        return { ...trade, profile, ens };
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
    queryFn: () => getHoldings(account!, page!),
    enabled: !!account,
    refetchInterval: 60000, // fetch every minute
    staleTime: 120000,
    gcTime: 120000,
  });
};

export const useGetClubBalance = (clubId?: string, address?: `0x${string}`) => {
  return useQuery({
    queryKey: ["club-balance", clubId, address],
    queryFn: () => getBalance(clubId!, address!),
    enabled: !!clubId && !!address,
    staleTime: 10000,
    gcTime: 60000,
  });
};

export const useGetBuyPrice = (account?: `0x${string}`, clubId?: string, amount?: string) => {
  return useQuery({
    queryKey: ["buy-price", clubId, amount],
    queryFn: () => getBuyPrice(account!, clubId!, amount!),
    enabled: !!clubId && !!amount && !!account,
    refetchInterval: 15000, // refetch every 15 seconds
    staleTime: 2000,
    gcTime: 15000,
  });
};

export const useGetBuyAmount = (account?: `0x${string}`, tokenAddress?: `0x${string}`, spendAmount?: string) => {
  return useQuery({
    queryKey: ["buy-amount", tokenAddress, spendAmount],
    queryFn: () => getBuyAmount(account!, tokenAddress!, spendAmount!),
    enabled: !!tokenAddress && !!spendAmount && !!account,
    refetchInterval: 5000, // refetch every 5 seconds
    staleTime: 1000,
    gcTime: 5000,
  });
};

export const useGetRegistrationFee = (amount: number | string, account?: `0x${string}`) => {
  return useQuery({
    queryKey: ["registration-fee", amount, account],
    queryFn: () => getRegistrationFee(amount.toString()!, account!),
    enabled: !!account,
    staleTime: 1000,
    gcTime: 2000,
  });
};

export const useGetSellPrice = (account?: `0x${string}`, clubId?: string, amount?: string) => {
  return useQuery({
    queryKey: ["sell-price", clubId, amount],
    queryFn: () => getSellPrice(account!, clubId!, amount!),
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
export const useGetTradingInfo = (clubId?: number) => {
  return useQuery({
    queryKey: ["trading-info", clubId],
    queryFn: async () => {
      const data: TradingInfoResponse = await fetch(`/api/clubs/get-trading-info?clubId=${clubId}`)
        .then(response => response.json());
      return data;
    },
    enabled: !!clubId,
    staleTime: 60000,
    gcTime: 60000 * 5,
  });
};

export const useGetAvailableBalance = (tokenAddress: `0x${string}`, account?: `0x${string}`, complete = false) => {
  return useQuery({
    queryKey: ["club-available-balance", tokenAddress, account],
    queryFn: () => getAvailableBalance(tokenAddress!, account!),
    enabled: !!account && complete && tokenAddress !== zeroAddress,
    staleTime: 10000,
    gcTime: 60000,
  });
};
