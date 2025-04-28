import { ChainRpcs } from "@src/constants/chains";
import { NFTMetadata } from "@src/services/madfi/studio";
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { base, mainnet } from "viem/chains";

export type AlchemyNFTMetadata = {
  tokenId: number;
  network: string;
  contract: {
    address: string;
  };
  collection?: {
    name?: string;
  };
  image?: {
    cachedUrl?: string;
    originalUrl?: string;
    croppedBase64?: string;
  };
  raw?: {
    metadata?: {
      image: string;
      attributes?: any[];
    };
  };
  openseaUrl: string;
}

const CIGS = { chain: "eth", address: "0xeed41d06ae195ca8f5cacace4cd691ee75f0683f" };
const PERSONA_MAINNET = { chain: "eth", address: "0xbabafdd8045740449a42b788a26e9b3a32f88ac1" };
const GALVERSE = { chain: "eth", address: "0x582048c4077a34e7c3799962f1f8c5342a3f4b12" };
const PERSONA_BASE = {
  chain: "base",
  address: "0x6502820f3f035C7A9fC0ebd3D74a0383306C5137",
  staked: {
    collection: "0x6502820f3f035C7A9fC0ebd3D74a0383306C5137",
    contract: "0x8bbca3847898041c6be978f864b64f0dca75fd50",
    function: "tokensDepositedBy",
    abi: [
      {
        inputs: [
          {
            internalType: "address",
            name: "owner_",
            type: "address"
          }
        ],
        name: "tokensDepositedBy",
        outputs: [
          {
            internalType: "uint256[]",
            name: "_tokenIds",
            type: "uint256[]"
          }
        ],
        stateMutability: "view",
        type: "function"
      }
    ]
  }
}
const WHITELISTED_COLLECTIONS = [
  CIGS,
  PERSONA_BASE,
  PERSONA_MAINNET,
  GALVERSE
] as const;

const CHAINS = {
  "base": base,
  "eth": mainnet,
}

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

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds
const RETRY_COUNT = 3;

const getStakedTokenIds = async (
  publicClient: any,
  contractAddress: `0x${string}`,
  ownerAddress: `0x${string}`,
  abi: any[],
  functionName: string,
): Promise<readonly bigint[]> => {
  try {
    const tokenIds = await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName,
      args: [ownerAddress]
    });
    return tokenIds;
  } catch (error) {
    console.error('Failed to fetch staked token IDs:', error);
    return [];
  }
}

const getAlchemyNFTMetadata = async (
  alchemyApiKey: string,
  networkName: string,
  contractAddress: string,
  tokenId: string
): Promise<AlchemyNFTMetadata | null> => {
  try {
    const url = `https://${networkName}-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}&refreshCache=false`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return transformNFTData({
      ...data,
      contract: {
        address: contractAddress,
        symbol: data.contract?.symbol || '',
      },
      tokenId: tokenId,
    }, networkName);
  } catch (error) {
    console.error('Failed to fetch NFT metadata:', error);
    return null;
  }
};

const getApiUrl = (
  alchemyApiKey: string,
  address: string,
  networkName: string,
  contractAddresses?: string[]
) => {
  const contractParam = contractAddresses?.length
    ? contractAddresses.map((addr) => `&contractAddresses[]=${addr}`).join("")
    : "";

  return `https://${networkName}-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}/getNFTsForOwner?owner=${address}&withMetadata=true&orderBy=transferTime&pageSize=100${contractParam}`;
};

const getOpenSeaUrl = (address: string, tokenId: number, network: string) => {
  if (network === "base") {
    return `https://opensea.io/item/base/${address}/${tokenId}`;
  }
  if (network === "eth") {
    return `https://opensea.io/item/ethereum/${address}/${tokenId}`;
  }
  // fallback
  return `https://opensea.io/item/ethereum/${address}/${tokenId}`;
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
  networkName: string,
  contractAddresses: string[],
  stakedConfig?: typeof PERSONA_BASE['staked']
): Promise<AlchemyNFTMetadata[]> => {
  try {
    // First get regular owned NFTs
    const options = {
      method: 'GET',
      headers: { accept: 'application/json' },
    };
    const api_url = getApiUrl(alchemyApiKey, address, networkName, contractAddresses);
    const response = await fetch(api_url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as AlchemyNFTResponse;
    const ownedNFTs = data.ownedNfts.map((nft) => transformNFTData(nft, networkName));

    // If we have staking config and publicClient, fetch staked NFTs
    if (stakedConfig) {
      const stakedTokenIds = await getStakedTokenIds(
        createPublicClient({
          chain: CHAINS[networkName],
          transport: http(ChainRpcs[CHAINS[networkName].id]),
        }),
        stakedConfig.contract as `0x${string}`,
        address as `0x${string}`,
        stakedConfig.abi,
        stakedConfig.function,
      );

      // Fetch metadata for each staked token
      const stakedNFTsPromises = stakedTokenIds.map(tokenId =>
        getAlchemyNFTMetadata(
          alchemyApiKey,
          networkName,
          stakedConfig.collection,
          tokenId.toString()
        )
      );

      const stakedNFTs = (await Promise.all(stakedNFTsPromises)).filter((nft): nft is AlchemyNFTMetadata => nft !== null);
      return [...ownedNFTs, ...stakedNFTs];
    }

    return ownedNFTs;
  } catch (error) {
    console.error(`Failed to fetch NFTs for network ${networkName}:`, error);
    throw error;
  }
};

export const useGetWhitelistedNFTs = (address?: `0x${string}`, loadRemixNFT?: NFTMetadata) => {
  return useQuery({
    queryKey: ['whitelisted-nfts', address],
    queryFn: async () => {
      const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      if (!alchemyApiKey || !address) return [];

      try {
        // if loading a remix, only fetch that one
        if (loadRemixNFT?.contract?.address && loadRemixNFT?.contract?.network && loadRemixNFT?.tokenId) {
          return [
            await getAlchemyNFTMetadata(
              alchemyApiKey,
              loadRemixNFT.contract.network,
              loadRemixNFT.contract.address,
              loadRemixNFT.tokenId.toString()
            )
          ];
        }

        // Group collections by chain
        const collectionsByChain = WHITELISTED_COLLECTIONS.reduce((acc, collection) => {
          if (!acc[collection.chain]) {
            acc[collection.chain] = {
              addresses: [],
              staked: undefined
            };
          }
          acc[collection.chain].addresses.push(collection.address);
          // If this collection has staking config, store it
          if ('staked' in collection) {
            acc[collection.chain].staked = collection.staked
          }
          return acc;
        }, {} as Record<string, { addresses: string[], staked?: typeof PERSONA_BASE['staked'] }>);

        const results = await Promise.allSettled(
          Object.entries(collectionsByChain).map(([chain, { addresses, staked }]) =>
            fetchNFTsWithRetry(
              alchemyApiKey,
              address,
              chain,
              addresses,
              staked
            )
          )
        );

        const successfulResults = results
          .map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            }
            console.error(
              `Failed to fetch NFTs for ${Object.keys(collectionsByChain)[index]}:`,
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