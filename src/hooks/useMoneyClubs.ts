import { useQuery } from "@tanstack/react-query";
import { omit } from "lodash/object";

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
} from "@src/services/madfi/moneyClubs";

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
    staleTime: 60000, // fetch every minute
  });
};

export const useGetClubTrades = (clubId: string, page: number) => {
  return useQuery({
    queryKey: ["club-trades", clubId, page],
    queryFn: () => getTrades(clubId!, page),
    enabled: !!clubId,
    staleTime: 60000, // fetch every minute
  });
};

export const useGetClubHoldings = (clubId: string, page: number) => {
  return useQuery({
    queryKey: ["club-holdings", clubId, page],
    queryFn: () => getClubHoldings(clubId!, page),
    enabled: !!clubId
  });
};

export const useGetHoldings = (account?: `0x${string}`, page?: number) => {
  return useQuery({
    queryKey: ["holdings", account, page],
    queryFn: () => getHoldings(account!, page!),
    enabled: !!account,
    staleTime: 60000, // fetch every minute
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