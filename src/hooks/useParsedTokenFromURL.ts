import { useState, useEffect } from 'react';
import { useZoraTokenMetadata } from "@madfi/widgets-react";
import { baseGoerli, base, zora, mainnet, optimism } from 'viem/chains';
import { createPublicClient, extractChain, http } from 'viem';

import ZoraLzCreatorAbi from "./../services/madfi/abi/ZoraLzCreator.json";

const ZORA_NETWORK_SLUG_TO_CHAIN = {
  'basegor': baseGoerli,
  'base': base,
  'zora': zora,
  'oeth': optimism,
  'eth': mainnet
};

const CHAIN_ID_TO_LZ_ID = {
  84531: 10160,
  8453: 184,
  7777777: 195,
  1: 101,
  10: 111
};

// TODO: Zora contract on optimism is whacky; mainnet needs new deployment but likely same issue
const REMOTE_ZORA_CREATOR_CONTRACTS = {
  84531: "0x86251bF4AC046c50bC64ADA4340Dc2DCd8A3086f",
  8453: "0x45F5eEAfA85a41F85bbCD52BDC22B6FD1afc71Bb",
  7777777: "0xa8DA7b21Cf9a19133142428A2133c92A3dd544BD",
  // 1: "0xf29f3a718d4dd5918f8a8b93bE76C0600092d451",
  // 10: "0x4F719673AEbba6e2ca69aC6af638F92aBBc34D46"
};

type ParsedToken = {
  protocol: string;
  chainId?: number;
  address?: string;
  id?: string;
  lzChainId?: number;
  metadata?: {
    name: string;
    description: string;
    image: string;
  };
  invalid?: boolean; // generic prop for any bad config we detect that prevents the use
  priceWei?: string;
}

export default (inputString: string, setCleanInputString: (s: string) => void) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [parsedTokenData, setParsedTokenData] = useState<any>({});
  const [parsedToken, setParsedToken] = useState<ParsedToken | undefined>();
  const {
    isLoading: isLoadingZoraMetadata,
    tokenMetadata
  } = useZoraTokenMetadata(parsedTokenData?.address, parsedTokenData?.id, parsedTokenData?.chainId);

  useEffect(() => {
    // for zora protocol, need to make sure the zora creator 1155 contract gave the fixed sale strategy minter permission
    const fetchIsTokenSupported = async (token: ParsedToken, cleanedInputString: string) => {
      const chain = extractChain({ chains: Object.values(ZORA_NETWORK_SLUG_TO_CHAIN), id: token!.chainId });
      const remoteClient = createPublicClient({ chain, transport: http() });
      const remoteContract = REMOTE_ZORA_CREATOR_CONTRACTS[token!.chainId as number];
      if (remoteContract) {
        const [hasEnabledMinterRole, salesConfig] = await Promise.all([
          remoteClient.readContract({
            address: remoteContract as `0x${string}`,
            abi: ZoraLzCreatorAbi,
            functionName: "hasEnabledMinterRole",
            args: [token!.address, token!.id],
          }),
          remoteClient.readContract({
            address: remoteContract as `0x${string}`,
            abi: ZoraLzCreatorAbi,
            functionName: "getSalesConfig",
            args: [token!.address, token!.id],
          })
        ]);

        if (hasEnabledMinterRole) {
          // @ts-expect-error: type
          const priceWei = (salesConfig.pricePerToken as bigint).toString()
          setParsedTokenData({ ...token, priceWei, lzChainId: CHAIN_ID_TO_LZ_ID[token.chainId!] });
          setCleanInputString(cleanedInputString);
          return;
        }
      }
      setParsedToken({ invalid: true, protocol: "zora" });
    };

    if (inputString.includes('zora.co')) {
      const parseMatch = inputString.match(/(?:https?:\/\/)?(?:[^\/]+\.)?zora\.co\/collect\/([^:]+):([^\/]+)\/([^?]+)/);
      if (parseMatch) {
        const supportedChain = ZORA_NETWORK_SLUG_TO_CHAIN[parseMatch[1]];
        if (supportedChain) {
          const token = { protocol: "zora", address: parseMatch[2], id: parseMatch[3], chainId: supportedChain.id };
          fetchIsTokenSupported(token, inputString.replace(parseMatch[0], '').trim());
        }
      }
    }
  }, [inputString]);

  useEffect(() => {
    setIsLoading(isLoadingZoraMetadata);
  }, [isLoadingZoraMetadata]);

  useEffect(() => {
    if (!isLoading && tokenMetadata?.name && parsedTokenData?.address) {
      setParsedToken({ ...parsedTokenData, metadata: tokenMetadata });
    }
  }, [isLoading, tokenMetadata, parsedTokenData]);

  const clearToken = () => {
    setParsedTokenData(undefined);
    setParsedToken(undefined);
  }

  return {
    isLoading,
    parsedToken,
    clearToken
  };
}