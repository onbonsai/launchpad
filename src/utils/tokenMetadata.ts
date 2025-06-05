import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { request, gql } from "graphql-request";
import { getAddress } from "viem";

const LENS_ALCHEMY_URL = `https://lens-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
const BASE_ALCHEMY_URL = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
const CODEX_API_URL = "https://graph.codex.io/graphql";

const LOGO_PLACEHOLDER = "https://link.storjshare.io/raw/jvyvfodxg4mej4tk32buvragnvza/token-images/unknown-logo.jpg";

const FILTER_TOKENS = gql`
    query FilterTokens(
        $phrase: String!
        $networkIds: [Int!]
        $liquidity: Float!
        $marketCap: Float!
    ) {
        filterTokens(
            filters: {
                network: $networkIds
                liquidity: { gt: $liquidity }
                marketCap: { gt: $marketCap }
            }
            phrase: $phrase
            limit: 1
            rankings: [{ attribute: liquidity, direction: DESC }]
        ) {
            results {
                token {
                    address
                    decimals
                    name
                    networkId
                    symbol
                    info {
                        imageSmallUrl
                    }
                }
            }
        }
    }
`;

const queryCodex = async (query: any, variables: any) => {
  return await request(CODEX_API_URL, query, variables, {
    authorization: process.env.NEXT_PUBLIC_CODEX_API_KEY as string,
  });
};

const fetchTokenImageFromCodex = async (tokenAddress: string, network: "lens" | "base") => {
  try {
    const networkId = network === "base" ? 8453 : 232;
    const data = await queryCodex(FILTER_TOKENS, {
      phrase: tokenAddress,
      networkIds: [networkId],
      marketCap: 0,
      liquidity: 0,
    });

    const result = data.filterTokens?.results?.[0];
    return result?.token?.info?.imageSmallUrl || null;
  } catch (error) {
    console.error("Error fetching token image from Codex:", error);
    return null;
  }
};

export const fetchTokenMetadata = async (tokenAddress: string, network: "lens" | "base") => {
  if (tokenAddress.toLowerCase() === PROTOCOL_DEPLOYMENT[network].Bonsai.toLowerCase()) {
    return {
      name: "Bonsai",
      symbol: "BONSAI",
      logo: "https://app.onbons.ai/logo-spaced.png",
      decimals: 18,
    };
  }
  try {
    const response = await fetch(network === "lens" ? LENS_ALCHEMY_URL : BASE_ALCHEMY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "alchemy_getTokenMetadata",
        params: [tokenAddress],
        id: 1,
      }),
    });

    const data = await response.json();

    let logo = data.result.logo;
    if (!logo) {
      const codexLogo = await fetchTokenImageFromCodex(tokenAddress, network);
      if (codexLogo) {
        logo = codexLogo;
      }
    }

    if (data.result.name) {
      return {
        ...data.result,
        logo: logo || LOGO_PLACEHOLDER,
        network,
      };
    }
    return {
      name: "Unknown",
      symbol: "UNKNOWN",
      logo: LOGO_PLACEHOLDER,
      decimals: 18,
      network,
    };
  } catch (error) {
    console.error(`Error fetching token metadata from ${network}:`, error);
    return null;
  }
};
