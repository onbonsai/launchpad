import { useQuery } from "@tanstack/react-query";
import { getCreatorTokens } from "@src/services/madfi/moneyClubs";

export type CreatorToken = {
  id: string;
  clubId: string;
  creator: string;
  name: string;
  symbol: string;
  uri: string;
  tokenAddress: string;
  supply: string;
  holders: number;
  complete: boolean;
};

export const useCreatorTokens = (address: `0x${string}` | undefined) => {
  return useQuery({
    queryKey: ["creatorTokens", address],
    queryFn: () => getCreatorTokens(address as `0x${string}`),
    enabled: !!address,
  });
}; 