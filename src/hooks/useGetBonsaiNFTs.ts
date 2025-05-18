import { useQuery } from "@tanstack/react-query";

const BONSAI_MIRROR_POLYGON = "0xE9d2FA815B95A9d087862a09079549F351DaB9bd";
const BONSAI_MIRROR_ZKSYNC = "0x40df0F8C263885093DCCEb4698DE3580FC0C9D49";
const BONSAI_MIRROR_BASE = "0xf060fd6b66B13421c1E514e9f10BedAD52cF241e";

const BONSAI_MIRRORS = {
  base: BONSAI_MIRROR_BASE,
  zkSync: BONSAI_MIRROR_ZKSYNC,
  polygon: BONSAI_MIRROR_POLYGON,
};

export interface AlchemyNFTResponse {
  ownedNfts: Array<{
    tokenId?: string;
    id?: { tokenId: string };
    contract: {
      address: string;
      symbol: string;
    };
    metadata?: {
      image?: string;
    };
    media?: Array<{
      gateway?: string;
      raw?: string;
    }>;
  }>;
}

export interface NFTMetadata {
  tokenId: number;
  network: string;
  openseaUrl: string;
  contract: {
    address: string;
    symbol: string;
  };
  image?: {
    cachedUrl?: string;
  };
  metadata?: {
    image?: string;
  };
}

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds
const RETRY_COUNT = 3;

const getApiUrl = (
  alchemyApiKey: string,
  address: string,
  network: string,
  contractAddresses?: string[]
) => {
  const baseUrl = (networkName: string) =>
    `https://${networkName}-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}/getNFTsForOwner?owner=${address}&withMetadata=true&orderBy=transferTime&pageSize=100`;

  const contractParam = contractAddresses?.length
    ? contractAddresses.map((addr) => `&contractAddresses[]=${addr}`).join("")
    : "";

  // "zksync" instead of "zkSync" in the URL
  const networkName = network === "zkSync" ? "zksync" : network;
  return baseUrl(networkName) + contractParam;
};

const getOpenSeaUrl = (address: string, tokenId: number, network: string) => {
  if (network === "polygon") {
    return `https://opensea.io/assets/matic/${address}/${tokenId}`;
  }
  if (network === "base") {
    return `https://opensea.io/assets/base/${address}/${tokenId}`;
  }
  if (network === "zkSync") {
    return undefined; // opensea not yet supporting zksync
  }
  // fallback
  return `https://opensea.io/assets/matic/${address}/${tokenId}`;
};

const transformNFTData = (nft: any, network: string): any => {
  const tokenIdNumber = nft.tokenId
    ? Number(nft.tokenId)
    : parseInt(nft.id.tokenId, 16);

  return {
    ...nft,
    tokenId: tokenIdNumber,
    network,
    openseaUrl: getOpenSeaUrl(nft.contract.address, tokenIdNumber, network) ?? "",
  };
};

const fetchNFTsWithRetry = async (
  alchemyApiKey: string,
  address: string,
  network: string,
  contractAddresses: string[]
): Promise<NFTMetadata[]> => {
  try {
    const options = {
      method: 'GET',
      headers: { accept: 'application/json' },
    };
    const api_url = getApiUrl(alchemyApiKey, address, network, contractAddresses);
    const response = await fetch(api_url, options);

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for ${api_url}`);
      return [];
    }

    const data = (await response.json()) as AlchemyNFTResponse;
    return data.ownedNfts.map((nft) => transformNFTData(nft, network));
  } catch (error) {
    console.error(`Failed to fetch NFTs for network ${network}:`, error);
    throw error;
  }
};

export const useGetBonsaiNFTs = (address?: `0x${string}`) => {
  return useQuery({
    queryKey: ['bonsai-nfts', address],
    queryFn: async () => {
      const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      if (!alchemyApiKey || !address) return [];

      try {
        const networks = ['polygon', 'base', 'zkSync'] as const;
        const results = await Promise.allSettled(
          networks.map((network) =>
            fetchNFTsWithRetry(alchemyApiKey, address, network, [
              BONSAI_MIRRORS[network],
            ])
          )
        );

        const successfulResults = results
          .map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            }
            console.error(
              `Failed to fetch NFTs for ${networks[index]}:`,
              result.reason
            );
            return [];
          })
          .flat();

        return successfulResults;
      } catch (error) {
        console.error('Failed to fetch NFTs:', error);
        return [];
      }
    },
    enabled: !!address && !!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    retry: RETRY_COUNT,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};