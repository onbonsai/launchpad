import { useQuery } from "@tanstack/react-query";
import { omit } from "lodash/object";
import { getAddress, createPublicClient, http } from "viem";
import { mainnet } from 'viem/chains'
import { groupBy } from "lodash/collection";
import {
  getRegisteredClub,
  getRegisteredClubById,
  getVolume,
  getBalance,
  getBuyPrice,
  getSellPrice,
  getFeesEarned,
  getRegistrationFee,
  getRegisteredClubs,
  getTrades,
  getHoldings,
  getClubHoldings,
  getLiquidity,
} from "@src/services/madfi/moneyClubs";
import { getHandlesByAddresses } from "@src/services/lens/getProfiles";

export const useRegisteredClubById = (clubId: string) => {
  return useQuery({
    queryKey: ["registered-club-id", clubId],
    queryFn: () => getRegisteredClubById(clubId),
    enabled: !!clubId
  });
};

export const useRegisteredClub = (handle?: string, profileId?: string) => {
  return useQuery({
    queryKey: ["registered-club", handle, profileId],
    queryFn: () => getRegisteredClub(handle!, profileId),
    enabled: !!handle || !!profileId,
  });
};

export const useGetRegisterdClubs = () => {
  return useQuery({
    queryKey: [`registered-clubs`],
    queryFn: async () => {
      const clubs = await getRegisteredClubs();
      const data = clubs.map((club) => ({ publication: club.publication, club: omit(club, 'publication') }));
      return JSON.parse(JSON.stringify(data));
    },
  });
};

export const useGetClubVolume = (clubId?: string) => {
  return useQuery({
    queryKey: ["club-volume", clubId],
    queryFn: () => getVolume(clubId!),
    enabled: !!clubId,
    refetchInterval: 15000, // fetch every 15seconds
  });
};

export const useGetClubLiquidity = (clubId?: string) => {
  return useQuery({
    queryKey: ["club-liquidity", clubId],
    queryFn: () => getLiquidity(clubId!),
    enabled: !!clubId,
    refetchInterval: 15000, // fetch every 15seconds
  });
};

// enriched with lens profile or ens
export const useGetClubTrades = (clubId: string, page: number) => {
  return useQuery({
    queryKey: ["club-trades", clubId, page],
    queryFn: async () => {
      const res = await getTrades(clubId!, page);
      const publicClient = createPublicClient({ chain: mainnet, transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC) });
      const profiles = await getHandlesByAddresses(res.trades?.map(({ trader }) => trader.id));
      const profilesGrouped = groupBy(profiles, 'ownedBy.address');

      const trades = await Promise.all(res.trades?.map(async (trade) => {
        const address = getAddress(trade.trader.id);
        const profile = profilesGrouped[address] ? profilesGrouped[address][0] : undefined;
        let ens;
        if (!profile) ens = await publicClient.getEnsName({ address });
        return { ...trade, profile, ens };
      }));

      return { trades, hasMore: res.hasMore };
    },
    enabled: !!clubId,
    refetchInterval: 60000, // fetch every minute
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
    enabled: !!clubId
  });
};

export const useGetHoldings = (account?: `0x${string}`, page?: number) => {
  return useQuery({
    queryKey: ["holdings", account, page],
    queryFn: () => getHoldings(account!, page!),
    enabled: !!account,
    refetchInterval: 60000, // fetch every minute
  });
};

export const useGetClubBalance = (clubId?: string, address?: `0x${string}`) => {
  return useQuery({
    queryKey: ["club-balance", clubId, address],
    queryFn: () => getBalance(clubId!, address!),
    enabled: !!clubId && !!address,
  });
};

export const useGetBuyPrice = (account?: `0x${string}`, clubId?: string, amount?: string) => {
  return useQuery({
    queryKey: ["buy-price", clubId, amount],
    queryFn: () => getBuyPrice(account!, clubId!, amount!),
    enabled: !!clubId && !!amount && !!account,
    refetchInterval: 15000, // refetch every 15 seconds
  });
};

export const useGetRegistrationFee = (curve: number, amount: number, clubId?: string, account?: `0x${string}`) => {
  return useQuery({
    queryKey: ["registration-fee", amount, curve, account],
    queryFn: () => getRegistrationFee(amount!, curve, account!),
    enabled: !clubId && !!account,
  });
};

export const useGetSellPrice = (account?: `0x${string}`, clubId?: string, amount?: string) => {
  return useQuery({
    queryKey: ["sell-price", clubId, amount],
    queryFn: () => getSellPrice(account!, clubId!, amount!),
    enabled: !!clubId && !!amount && !!account,
  });
};

export const useGetFeesEarned = (isCreatorAdmin: boolean, account?: `0x${string}`) => {
  return useQuery({
    queryKey: ["fees-earned", account],
    queryFn: () => getFeesEarned(account!),
    enabled: isCreatorAdmin && !!account,
  });
};