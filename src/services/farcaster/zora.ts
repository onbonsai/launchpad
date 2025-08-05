import { getCoinsTopVolume24h } from "@zoralabs/coins-sdk";
import { setApiKey } from "@zoralabs/coins-sdk";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { base } from "viem/chains";
import { Coin } from '@src/services/farcaster/tbd';

export type ZoraCoin = {
  id: string;
  name: string;
  description: string;
  address: string;
  symbol: string;
  totalSupply: string;
  totalVolume: string;
  volume24h: string;
  createdAt?: string;
  creatorAddress?: string;
  creatorEarnings?: Array<{
    amount: {
      currencyAddress: string;
      amountRaw: string;
      amountDecimal: number;
    };
    amountUsd?: string;
  }>;
  poolCurrencyToken?: {
    address?: string;
    name?: string;
    decimals?: number;
  };
  tokenPrice?: {
    priceInUsdc?: string;
    currencyAddress: string;
    priceInPoolToken: string;
  };
  marketCap: string;
  marketCapDelta24h: string;
  chainId: number;
  tokenUri?: string;
  platformReferrerAddress?: string;
  payoutRecipientAddress?: string;
  creatorProfile?: {
    id: string;
    handle: string;
    avatar?: {
      previewImage: {
        blurhash?: string;
        medium: string;
        small: string;
      };
    };
  };
  mediaContent?: {
    mimeType?: string;
    originalUri: string;
    previewImage?: {
      small: string;
      medium: string;
      blurhash?: string;
    };
  };
  uniqueHolders: number;
  uniswapV4PoolKey: {
    token0Address: string;
    token1Address: string;
    fee: number;
    tickSpacing: number;
    hookAddress: string;
  };
  uniswapV3PoolAddress: string;
}

export const fetchTopVolumeCoins = async (after?: string): Promise<{ tokens: ZoraCoin[], cursor?: string }> => {
  setApiKey(process.env.ZORA_API_KEY as string);
  const response = await getCoinsTopVolume24h({
    count: 10,
    after
  });

  const tokens = response.data?.exploreList?.edges?.map((edge: any) => edge.node)
    ?.filter((t) => t.chainId === base.id);

  let cursor: string | undefined;
  if (response.data?.exploreList?.pageInfo?.endCursor) {
    cursor = response.data?.exploreList?.pageInfo?.endCursor;
  }

  return {
    tokens: tokens as ZoraCoin[],
    cursor,
  };
}

export const useTopZoraCoins = (enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ["top-zora-coins"],
    queryFn: async ({ pageParam = null }: { pageParam: string | null }) => {
      const response = await fetchTopVolumeCoins(pageParam || undefined);

      return {
        coins: response.tokens || [],
        pageInfo: {
          next: response.cursor || null,
        },
        nextCursor: response.cursor || null,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled
  });
};

export const useTopBaseCoins = (enabled: boolean = true) => {
  return useQuery<Coin[]>({
    queryKey: ["top-base-coins"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/coins");
      if (!res.ok) {
        throw new Error("Failed to fetch top base coins");
      }
      const coins: Coin[] = await res.json();
      return coins;
    },
    enabled,
  });
}