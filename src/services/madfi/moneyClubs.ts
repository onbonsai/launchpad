import { ApolloClient, HttpLink, InMemoryCache, gql } from "@apollo/client";
import { createPublicClient, http, parseUnits, formatEther, TransactionReceipt, zeroAddress, erc20Abi, maxUint256, decodeAbiParameters, formatUnits, parseEther } from "viem";
import { base, baseSepolia } from "viem/chains";
import { groupBy, reduce } from "lodash/collection";
import toast from "react-hot-toast";

import { IS_PRODUCTION, LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT, getChain, } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import BonsaiLaunchpadV3Abi from "@src/services/madfi/abi/BonsaiLaunchpadV3.json";
import PeripheryAbi from "@src/services/madfi/abi/Periphery.json";
import VestingERC20Abi from "@src/services/madfi/abi/VestingERC20.json";
import { ChainRpcs } from "@src/constants/chains";
import { getProfileByHandle } from "@src/services/lens/getProfiles";
import { roundedToFixed } from "@src/utils/utils";
import { encodeAbi } from "@src/utils/viem";
import { getEventFromReceipt } from "@src/utils/viem";
import { MADFI_WALLET_ADDRESS } from "@src/constants/constants";

import { lensClient } from "../lens/client";
import axios from "axios";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";
import { getPosts } from "../lens/posts";

export const V1_LAUNCHPAD_URL = "https://launch-v1.bonsai.meme";

const REGISTERED_CLUB = gql`
  query Club($id: Bytes!, $twentyFourHoursAgo: Int!, $sixHoursAgo: Int!, $oneHourAgo: Int!, $fiveMinutesAgo: Int!) {
    club(id: $id) {
      id
      clubId
      creator
      createdAt
      initialSupply
      createdAt
      supply
      feesEarned
      currentPrice
      marketCap
      liquidity
      complete
      completedAt
      liquidityReleasedAt
      tokenInfo
      tokenAddress
      creatorFees
      holders
      v2
      name
      symbol
      uri
      cliffPercent
      vestingDuration
      hook
      v3
      initialPrice
      flatThreshold
      targetPriceMultiplier
      whitelistModule
      quoteToken
      prevTrade24h: trades(where:{createdAt_gt: $twentyFourHoursAgo}, orderBy: createdAt, orderDirection: asc, first: 1) {
        price
        prevPrice
        createdAt
      }
      prevTrade6h: trades(where:{createdAt_gt: $sixHoursAgo}, orderBy: createdAt, orderDirection: asc, first: 1) {
        price
        prevPrice
        createdAt
      }
      prevTrade1h: trades(where:{createdAt_gt: $oneHourAgo}, orderBy: createdAt, orderDirection: asc, first: 1) {
        price
        prevPrice
        createdAt
      }
      prevTrade5m: trades(where:{createdAt_gt: $fiveMinutesAgo}, orderBy: createdAt, orderDirection: asc, first: 1) {
        price
        prevPrice
        createdAt
      }
    }
  }
`;

const REGISTERED_CLUB_BY_TOKEN = gql`
  query Club($tokenAddress: Bytes!, $twentyFourHoursAgo: Int!, $sixHoursAgo: Int!, $oneHourAgo: Int!, $fiveMinutesAgo: Int!) {
    clubs(where: {tokenAddress: $tokenAddress}, first: 1) {
      id
      clubId
      creator
      createdAt
      initialSupply
      createdAt
      supply
      feesEarned
      currentPrice
      marketCap
      liquidity
      complete
      completedAt
      liquidityReleasedAt
      tokenInfo
      tokenAddress
      creatorFees
      holders
      v2
      name
      symbol
      uri
      cliffPercent
      vestingDuration
      hook
      v3
      initialPrice
      flatThreshold
      targetPriceMultiplier
      whitelistModule
      quoteToken
      prevTrade24h: trades(where:{createdAt_gt: $twentyFourHoursAgo}, orderBy: createdAt, orderDirection: asc, first: 1) {
        price
        prevPrice
        createdAt
      }
      prevTrade6h: trades(where:{createdAt_gt: $sixHoursAgo}, orderBy: createdAt, orderDirection: asc, first: 1) {
        price
        prevPrice
        createdAt
      }
      prevTrade1h: trades(where:{createdAt_gt: $oneHourAgo}, orderBy: createdAt, orderDirection: asc, first: 1) {
        price
        prevPrice
        createdAt
      }
      prevTrade5m: trades(where:{createdAt_gt: $fiveMinutesAgo}, orderBy: createdAt, orderDirection: asc, first: 1) {
        price
        prevPrice
        createdAt
      }
    }
  }
`;

const REGISTERED_CLUB_INFO = gql`
  query ClubInfo($ids: [Bytes!]!) {
    clubs(where: { id_in: $ids }) {
      id
      tokenInfo
      name
      symbol
      uri
      cliffPercent
      vestingDuration
      clubId
      v2
      v3
      initialPrice
      flatThreshold
      targetPriceMultiplier
      whitelistModule
      quoteToken
    }
  }
`;

const REGISTERED_CLUB_INFO_BY_ADDRESS = gql`
  query ClubInfo($tokenAddress: Bytes!) {
    clubs(where: {tokenAddress: $tokenAddress}, first: 1) {
      id
      tokenInfo
      name
      symbol
      uri
      cliffPercent
      vestingDuration
      clubId
      v2
      v3
      initialPrice
      flatThreshold
      targetPriceMultiplier
      whitelistModule
      quoteToken
    }
  }
`;

const SEARCH_CLUBS = gql`
  query SearchClubs($query: String!) {
    clubs(where:{or:[{symbol_contains_nocase:$query}, {name_contains_nocase:$query}]}){
      id
      name
      symbol
      uri
      cliffPercent
      vestingDuration
      clubId
      v2
      tokenAddress
    }
  }
`;

const CLUB_TRADES_TODAY = gql`
  query ClubTrades($club: Bytes!, $startOfDayUTC: Int!, $skip: Int!) {
    trades(where: {club:$club,createdAt_gt: $startOfDayUTC}, orderBy: createdAt, orderDirection: desc, first: 50, skip: $skip) {
        isBuy
        amount
        trader {
          id
        }
        price
        txPrice
        txHash
        createdAt
      }
  }
`;

const CLUB_TRADES_PAGINATED = gql`
  query ClubTrades($club: Bytes!, $skip: Int!) {
    trades(where: {club:$club}, orderBy: createdAt, orderDirection: desc, first: 50, skip: $skip) {
        isBuy
        amount
        trader {
          id
        }
        price
        txPrice
        txHash
        createdAt
      }
  }
`;

const CLUB_TRADES_LATEST = gql`
  query {
    trades(where:{isBuy: true}, orderBy: createdAt, orderDirection: desc, first: 100) {
        club {
          clubId
          v2
        }
        createdAt
    }
  }
`;

const REGISTERED_CLUBS = gql`
  query Clubs($pageSize: Int!, $skip: Int!) {
    clubs(orderBy: marketCap, orderDirection: desc, first: $pageSize, skip: $skip, where: {v2: true}) {
      id
      clubId
      creator
      initialSupply
      createdAt
      supply
      feesEarned
      currentPrice
      marketCap
      complete
      completedAt
      liquidity
      liquidityReleasedAt
      tokenInfo
      name
      symbol
      uri
      cliffPercent
      vestingDuration
      tokenAddress
      v2
      v3
      initialPrice
      flatThreshold
      targetPriceMultiplier
      whitelistModule
      quoteToken
    }
  }
`;

const REGISTERED_CLUBS_BY_AGE = gql`
  query Clubs($pageSize: Int!, $skip: Int!) {
    clubs(orderBy: createdAt, orderDirection: desc, first: $pageSize, skip: $skip, where: {v2: true}) {
      id
      clubId
      creator
      initialSupply
      createdAt
      supply
      feesEarned
      currentPrice
      marketCap
      complete
      completedAt
      liquidity
      liquidityReleasedAt
      tokenInfo
      name
      symbol
      uri
      cliffPercent
      vestingDuration
      tokenAddress
      v2
      v3
      initialPrice
      flatThreshold
      targetPriceMultiplier
      whitelistModule
      quoteToken
    }
  }
`;

const REGISTERED_CLUBS_BY_ID = gql`
  query Clubs($ids: [ID!]) {
    clubs(orderBy: createdAt, orderDirection: desc, where: {liquidityReleasedAt:null, id_in: $ids}) {
      id
      clubId
      creator
      initialSupply
      createdAt
      supply
      feesEarned
      currentPrice
      marketCap
      complete
      completedAt
      liquidity
      liquidityReleasedAt
      tokenInfo
      name
      symbol
      uri
      cliffPercent
      vestingDuration
      tokenAddress
      v2
      v3
      initialPrice
      flatThreshold
      targetPriceMultiplier
      whitelistModule
      quoteToken
    }
  }
`;

const HOLDINGS_PAGINATED = gql`
  query ClubChips($trader: Bytes!, $skip: Int!, $startOfDayUTC: Int!) {
    clubChips(where:{ trader: $trader }, orderBy: amount, orderDirection: desc, first: 50, skip: $skip) {
      id
      club {
        clubId
        prevTrade24Hr: trades(where:{createdAt_gt: $startOfDayUTC}, orderBy: createdAt, orderDirection: asc, first: 1) {
          price
          createdAt
        }
        complete
        completedAt
        liquidityReleasedAt
        supply
        tokenAddress
        tokenInfo
        name
        symbol
        uri
        cliffPercent
        vestingDuration
        currentPrice
        v2
      }
      amount
      createdAt
    }
  }
`;

const CLUB_HOLDINGS_PAGINATED = gql`
  query ClubChips($club: Bytes!, $skip: Int!) {
    clubChips(where:{ club: $club }, orderBy: amount, orderDirection: desc, first: 100, skip: $skip) {
      id
      club {
        clubId
        tokenAddress
        complete
        completedAt
        liquidityReleasedAt
      }
      trader {
        id
      }
      amount
      createdAt
    }
  }
`;

const CLUB_BALANCE = gql`
  query ClubChips($trader: Bytes!, $club: Bytes!) {
    clubChips(
      where: {trader: $trader, club: $club}
    ) {
      id
      amount
      club {
        id
        tokenAddress
      }
    }
  }
`

const GET_CREATOR_NFTS = gql`
  query CreatorNFTs($trader: Bytes!) {
    creatorNFTs(where: {trader: $trader}) {
      club {
        clubId
      }
    }
  }
`

const GET_TRADER = gql`
  query GetTrader($id: ID!, $isBuy: Boolean!, $createdAt_gt: Int!) {
    trader(id: $id) {
      trades(where:{isBuy: $isBuy, createdAt_gt: $createdAt_gt}, orderBy: txPrice, orderDirection: desc, first: 100) {
        club {
          clubId
          v2
        }
        amount
        txPrice
        txHash
        createdAt
      }
    }
  }
`;

export const INITIAL_CHIP_SUPPLY_CAP = 10; // with 6 decimals in the contract
export const DECIMALS = 18;
export const USDC_DECIMALS = 6;
// this isn't likely to change
export const MIN_LIQUIDITY_THRESHOLD = IS_PRODUCTION ? BigInt(21054) : BigInt(2);
export const MAX_MINTABLE_SUPPLY = parseEther("800000000")
export const MAX_INITIAL_SUPPLY = 80_000_000; // 10% of the mintable supply
export const FLAT_THRESHOLD = parseEther("200000000")
export const BENEFITS_AUTO_FEATURE_HOURS = 3;

export const USDC_CONTRACT_ADDRESS = IS_PRODUCTION
  ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  : "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const WGHO_CONTRACT_ADDRESS = IS_PRODUCTION
  ? "0x6bDc36E20D267Ff0dd6097799f82e78907105e2F"
  : "0xB0588f9A9cADe7CD5f194a5fe77AcD6A58250f82"; // mock erc20 for testing
export const BONSAI_TOKEN_ZKSYNC_ADDRESS = "0xB0588f9A9cADe7CD5f194a5fe77AcD6A58250f82";
export const BONSAI_TOKEN_BASE_ADDRESS = IS_PRODUCTION
  ? "0x474f4cb764df9da079D94052fED39625c147C12C"
  : "0x3d2bD0e15829AA5C362a4144FdF4A1112fa29B5c"
export const BONSAI_NFT_ZKSYNC_ADDRESS = "0x40df0F8C263885093DCCEb4698DE3580FC0C9D49";
export const BONSAI_NFT_BASE_ADDRESS = IS_PRODUCTION
  ? "0xf060fd6b66B13421c1E514e9f10BedAD52cF241e"
  : "0xE9d2FA815B95A9d087862a09079549F351DaB9bd"

export const DEFAULT_HOOK_ADDRESS = IS_PRODUCTION
  ? "0x8dd4c756F183513850e874F7d1ffd0d7Cb498080"
  : "0xA788031C591B6824c032a0EFe74837EE5eaeC080";

export const TRADING_DAYS_HOOK_ADDRESS = "0xCb6f8E5c03A0F141D764D4323cE248A00e5d2080";
export const LOTTERY_HOOK_ADDRESS = "0xF4f7D5160E378dc1ED2dA493E3fD314C2b412088";
export const BUYBACK_AND_BURN_HOOK_ADDRESS = "0xD4E2efCE3De32de13407298d224ee7e7d483a0cc";

export const CONTRACT_CHAIN_ID = IS_PRODUCTION ? base.id : baseSepolia.id;

export const SUBGRAPH_CONFIG = {
  base: {
    mainnet: `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_MONEY_CLUBS_SUBGRAPH_API_KEY}/subgraphs/id/E1jXM6QybxvtA71cbiFbyyQYJwn2AHJNk7AAH1frZVyc`,
    testnet: `https://api.studio.thegraph.com/query/102483/bonsai-launchpad-base-sepolia/version/latest`
  },
  lens: {
    mainnet: `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_MONEY_CLUBS_SUBGRAPH_API_KEY}/subgraphs/id/EHPwY2LhhhaxiCindhLuUVJRF4teH9BnzFRfVULsf8px`,
    testnet: "https://api.studio.thegraph.com/query/102483/bonsai-launchpad-lens-testnet/version/latest"
  }
};

export const WHITELISTED_UNI_HOOKS = {
  "BONSAI_NFT_ZERO_FEES_HOOK": {
    label: "0% trading fees for Bonsai NFT holders",
    contractAddress: DEFAULT_HOOK_ADDRESS,
    icon: "swap-horiz",
    iconLabel: "0% fee",
  },
  "LOTTERY_HOOK": {
    label: "Growing jackpot that goes to one lucky trader",
    contractAddress: LOTTERY_HOOK_ADDRESS,
    icon: "local-atm",
    iconLabel: "Winner every 72h"
  },
  "BUYBACK_AND_BURN_HOOK": {
    label: "Buyback and burn from trading fees",
    contractAddress: BUYBACK_AND_BURN_HOOK_ADDRESS,
    icon: "local-atm",
    iconLabel: "Buyback and burn"
  },
  "TRADING_DAYS_HOOK": {
    label: "NYSE trading hours for swaps, no weekends",
    contractAddress: TRADING_DAYS_HOOK_ADDRESS,
    icon: "schedule",
    iconLabel: "9am-4:30pm EST"
  },
};

export const NETWORK_CHAIN_IDS = {
  'base': CONTRACT_CHAIN_ID,
  'lens': LENS_CHAIN_ID
} as const;

export type Token = {
  name: string;
  symbol: string;
  description?: string;
  image: string;
};

export type Club = {
  __typename: 'Club';
  id: string;
  creator: string;
  initialSupply: string;
  createdAt: string;
  supply: string;
  feesEarned: string;
  currentPrice: string;
  marketCap: string;
  prevTrade24Hr: object; // Replace 'object' with a more specific type if available
  clubId: number;
  profileId: string;
  strategy: string;
  handle: string;
  token: Token;
  postId: string;
  pubId?: string;
  featured: boolean;
  creatorFees: string;
  complete: boolean;
  completedAt?: number
  liquidityReleasedAt?: number
  claimAt: number;
  cliffPercent: string
  vestingDuration: string
  tokenAddress?: `0x${string}`;
  hook: `0x${string}`;
  chain: string;
};

export function baseScanUrl(txHash: string, tx = true) {
  return `https://${!IS_PRODUCTION ? "sepolia." : ""}basescan.org/${tx ? "tx" : "address"}/${txHash}`;
}

export function lensScanUrl(txHash: string, tx = true) {
  return `https://explorer.${!IS_PRODUCTION ? "testnet." : ""}lens.xyz/${tx ? "tx" : "address"}/${txHash}`;
}

export const toHexString = (id: number | string, minLength: number = 2): string => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const stringId = numericId.toString(16);
  return `0x${stringId.length === 3 ? stringId.padStart(4, "0") : stringId.padStart(2, "0")}`;
}

export const subgraphClient = (chain = "base") => {
  const uri = IS_PRODUCTION ? SUBGRAPH_CONFIG[chain].mainnet : SUBGRAPH_CONFIG[chain].testnet;
  return new ApolloClient({
    ssrMode: typeof window === "undefined", // set to true for server-side rendering
    link: new HttpLink({ uri }),
    cache: new InMemoryCache(),
  });
};

// server-side
export const getRegisteredClubById = async (clubId: string, chain = "base", tokenAddress?: `0x${string}`) => {
  try {
    const now = Date.now();
    const twentyFourHoursAgo = Math.floor(now / 1000) - 24 * 60 * 60;
    const sixHoursAgo = Math.floor(now / 1000) - 6 * 60 * 60;
    const oneHourAgo = Math.floor(now / 1000) - 60 * 60;
    const fiveMinutesAgo = Math.floor(now / 1000) - 5 * 60;
    const client = subgraphClient(chain);
    const { data } = await client.query({
      query: !tokenAddress ? REGISTERED_CLUB : REGISTERED_CLUB_BY_TOKEN,
      variables: {
        id: !tokenAddress ? toHexString(parseInt(clubId)) : undefined,
        tokenAddress,
        twentyFourHoursAgo,
        sixHoursAgo,
        oneHourAgo,
        fiveMinutesAgo
      }
    });

    const club = !tokenAddress ? data.club : (data.clubs ? data.clubs[0] : null);

    const prevTrade24h = club?.prevTrade24h ? club?.prevTrade24h[0] : {};
    const prevTrade6h = club?.prevTrade6h ? club?.prevTrade6h[0] : {};
    const prevTrade1h = club?.prevTrade1h ? club?.prevTrade1h[0] : {};
    const prevTrade5m = club?.prevTrade5m ? club?.prevTrade5m[0] : {};

    return {
      ...club,
      token: {
        name: club.name,
        symbol: club.symbol,
        image: club.uri,
      },
      chain,
      "24h": prevTrade24h,
      "6h": prevTrade6h,
      "1h": prevTrade1h,
      "5m": prevTrade5m,
    };
  } catch (error) {
    console.log(error);
  }
};

export const getRegisteredClubInfo = async (ids: string[], chain = "base") => {
  const client = subgraphClient(chain);
  const { data: { clubs } } = await client.query({ query: REGISTERED_CLUB_INFO, variables: { ids } })
  return clubs?.map((club) => {
    let { name, symbol, uri: image } = club

    if (!club.name || !club.symbol || !club.uri) {
      // backup for v1 clubs
      ;[name, symbol, image] = decodeAbiParameters([
        { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
      ], club.tokenInfo);
    }
    return { name, symbol, image, clubId: club.clubId, id: club.id };
  });
};

export const getRegisteredClubInfoByAddress = async (tokenAddress, chain = "base") => {
  const client = subgraphClient(chain);
  const { data: { clubs } } = await client.query({ query: REGISTERED_CLUB_INFO_BY_ADDRESS, variables: { tokenAddress } })
  const res = clubs?.map((club) => {
    let { name, symbol, uri: image } = club

    if (!club.name || !club.symbol || !club.uri) {
      // backup for v1 clubs
      ;[name, symbol, image] = decodeAbiParameters([
        { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
      ], club.tokenInfo);
    }
    return { name, symbol, image, clubId: club.clubId, id: club.id };
  });

  return res?.length ? res[0] : null;
};

export const searchClubs = async (query: string, chain = "base") => {
  const client = subgraphClient(chain);
  const { data: { clubs } } = await client.query({ query: SEARCH_CLUBS, variables: { query } })
  return clubs?.map((club) => {
    const { name, symbol, image } = club

    return { token: { name, symbol, image }, ...club };
  });
};

export const getVolume = async (clubId: string, chain = "base"): Promise<bigint> => {
  const id = toHexString(parseInt(clubId));
  const startOfDayUTC = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const client = subgraphClient(chain);
  const limit = 50;
  let skip = 0;
  let volume = 0n;
  let hasMore = true;

  while (hasMore) {
    const { data: { trades } } = await client.query({
      query: CLUB_TRADES_TODAY,
      variables: { club: id, startOfDayUTC, skip }
    });

    if (!trades) hasMore = false;
    volume += reduce(trades, (sum, trade) => sum + BigInt(trade.txPrice), 0n);

    if (trades.length < limit) {
      hasMore = false;
    } else {
      skip += limit;
    }
  }
  return volume;
};

export const getSupply = async (tokenAddress: `0x${string}`, chain = "base") => {
  const client = publicClient(chain);
  const supply = await client.readContract({
    address: tokenAddress,
    abi: VestingERC20Abi,
    functionName: "totalSupply",
  }) as any[];

  return supply as unknown as bigint;
};

export const getTrades = async (clubId: string, page = 0, chain = "base"): Promise<{ trades: any[], hasMore: boolean }> => {
  const id = toHexString(parseInt(clubId));
  const client = subgraphClient(chain);
  const limit = 50;
  const skip = page * limit;

  const { data: { trades } } = await client.query({
    query: CLUB_TRADES_PAGINATED,
    variables: { club: id, skip }
  });

  return { trades: trades || [], hasMore: trades?.length == limit };
};

export const getLatestTrades = async (chain = "base"): Promise<any[]> => {
  const client = subgraphClient(chain);
  const { data: { trades } } = await client.query({
    query: CLUB_TRADES_LATEST
  });

  return trades || [];
};

// get token balances directly from alchemy api
export const getTokenBalances = async (account: `0x${string}`, tokenAddresses: `0x${string}`[]): Promise<{ address: `0x${string}`; balance: bigint }[]> => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    const baseURL = IS_PRODUCTION
      ? `https://base-mainnet.g.alchemy.com/v2/${apiKey}`
      : `https://base-sepolia.g.alchemy.com/v2/${apiKey}`;

    const response = await axios.post(baseURL, {
      jsonrpc: "2.0",
      method: "alchemy_getTokenBalances",
      params: [account, tokenAddresses],
      id: 1
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    return response.data?.result?.tokenBalances?.map(({ contractAddress, tokenBalance }: {
      contractAddress: `0x${string}`;
      tokenBalance: string;
    }) => ({
      address: contractAddress,
      balance: BigInt(parseInt(tokenBalance || "0", 16))
    })) || [];
  } catch (error) {
    console.error("Error fetching token balances:", error);
    return [];
  }
};

export const getHoldings = async (account: `0x${string}`, page = 0, chain = "base"): Promise<{ holdings: any[], hasMore: boolean }> => {
  const limit = 50;
  const skip = page * limit;
  const startOfDayUTC = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const client = subgraphClient(chain);
  const { data: { clubChips } } = await client.query({
    query: HOLDINGS_PAGINATED, variables: { trader: account.toLowerCase(), startOfDayUTC, skip }
  });

  // Batch fetch balances for completed clubs
  const completeTokens = clubChips
    ?.filter(chips => chips.club.complete && chips.club.tokenAddress)
    .map(chips => chips.club.tokenAddress);
  const tokenBalances = completeTokens?.length
    ? await getTokenBalances(account, completeTokens)
    : [];
  const balanceMap = new Map(tokenBalances.map(b => [b.address.toLowerCase(), b.balance]));

  const holdings = await Promise.all(clubChips?.map(async (chips) => {
    const complete = chips.club.complete && chips.club.tokenAddress && chips.club.liquidityReleasedAt;
    const tokenAddress = chips.club.tokenAddress?.toLowerCase();

    // Get balance from batch results or fallback to individual fetch
    const amount = complete
      ? formatEther(balanceMap.get(tokenAddress) || 0n)
      : (chips.club.v2 ? formatEther(BigInt(chips.amount)) : formatUnits(BigInt(chips.amount), 6));

    // TODO: enable once birdeye returns v4 token prices
    const balance = false // complete && IS_PRODUCTION
      ? Number.parseFloat(amount) * (await fetchTokenPrice(chips.club.tokenAddress))
      : Number.parseFloat(amount) * Number.parseFloat(formatUnits(chips.club.currentPrice, USDC_DECIMALS));

    return { ...chips, balance, amount, complete };
  }));

  return { holdings, hasMore: clubChips?.length == limit };
};

export const getClubHoldings = async (clubId: string, page = 0, chain = "base"): Promise<{ holdings: any[], hasMore: boolean }> => {
  const id = toHexString(parseInt(clubId));
  const limit = 100;
  const skip = page * limit;
  const client = subgraphClient(chain);
  const _publicClient = publicClient(chain);
  const { data: { clubChips } } = await client.query({ query: CLUB_HOLDINGS_PAGINATED, variables: { club: id, skip } });
  let holdings = clubChips || [];

  // override with erc20 balance of in case of transfers post-graduation
  if (clubChips.length && clubChips[0].club.complete && clubChips[0].club.tokenAddress) {
    const contracts = holdings.map(data => ({
      address: data.club.tokenAddress,
      abi: VestingERC20Abi,
      functionName: "balanceOf",
      args: [data.trader.id],
    }));

    const balances = await _publicClient.multicall({
      contracts
    });

    holdings = holdings.map((data, i) => ({
      ...data,
      amount: balances[i].result
    }));
  }

  return { holdings, hasMore: clubChips?.length == limit };
};

export const getRegisteredClub = async (handle: string, profileId?: string, chain = "base") => {
  if (!profileId) {
    const profile = await getProfileByHandle(`lens/${handle}`);
    profileId = profile?.owner.id;
  }

  const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const { data } = await subgraphClient(chain).query({
    query: REGISTERED_CLUB,
    variables: { id: profileId, twentyFourHoursAgo }
  });

  const trades = data?.club?.trades;
  const prevTrade24Hr = data?.club?.prevTrade24Hr[0];

  return {
    ...data?.club,
    trades,
    prevTrade24Hr,
  };
};

export const getFeaturedClubs = async (chain = "base"): Promise<any[]> => {
  const response = await fetch('/api/clubs/get-enriched-clubs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ featured: true }),
  });
  const { clubs } = await response.json();
  console.log(`Fetched ${clubs.length} featured clubs`);
  if (clubs?.length) {
    const ids = clubs.map(({ clubId }) => toHexString(clubId));
    const { data: { clubs: _clubs } } = await subgraphClient(chain).query({ query: REGISTERED_CLUBS_BY_ID, variables: { ids } });

    try {
      // TODO: fetch for other strategies (ie orb_club, farcaster)
      const publications = await lensClient.publication.fetchAll({
        where: { publicationIds: clubs.filter(({ strategy, pubId }) => (strategy === "lens" && !!pubId && typeof pubId === "string" && pubId.trim() !== "")).map(({ pubId }) => pubId) }
      });
      const gPublications = groupBy(publications.items || [], "id");
      const groupedClubs = groupBy(clubs || [], "clubId");
      const responseClubs = _clubs.map((_club) => {
        const marketCap = formatUnits(BigInt(_club.supply) * BigInt(_club.currentPrice), DECIMALS).split(".")[0];
        const club = groupedClubs[_club.clubId.toString()] ? groupedClubs[_club.clubId.toString()][0] : undefined;
        if (club?.hidden) return; // db forced hide
        if (club) {
          club.featured = !!club?.featureEndAt && (Date.now() / 1000) < parseInt(club.featureEndAt);
          const publication = gPublications[club.pubId] ? gPublications[club.pubId][0] : undefined;
          return { publication, ..._club, ...club, marketCap };
        } else { // not created on our app
          let { name, symbol, uri: image } = _club;

          if (!name || !symbol || !image) {
            // backup for v1 clubs
            [name, symbol, image] = decodeAbiParameters([
              { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
            ], _club.tokenInfo);
          }
          return {
            ..._club,
            handle: _club.creator,
            marketCap,
            token: {
              name, image, symbol
            }
          };
        }
      }).filter((c) => c);

      return responseClubs;
    } catch (error) {
      console.log(error);
    }
  }

  return [];
};

export const getRegisteredClubs = async (page = 0, sortedBy: string, chain = "base"): Promise<{ clubs: any[], hasMore: boolean }> => {
  const limit = 30;
  const skip = page * limit;
  const query = sortedBy === "club.marketCap" ? REGISTERED_CLUBS : REGISTERED_CLUBS_BY_AGE;
  const { data } = await subgraphClient(chain).query({ query, variables: { pageSize: limit, skip } });

  if (data?.clubs?.length) {
    const clubIds = data?.clubs.map(({ clubId }) => parseInt(clubId));
    const response = await fetch('/api/clubs/get-enriched-clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubIds }),
    });
    const { clubs } = await response.json();

    try {
      const lensTokens = clubs.filter(({ strategy, postId }) => (strategy === "lens" && !!postId && typeof postId === "string" && postId.trim() !== ""));
      const publications = await getPosts(lensTokens.map(({ postId }) => postId));
      const gPublications = groupBy(publications || [], "id");
      const groupedClubs = groupBy(clubs || [], "clubId");
      const responseClubs = data?.clubs.map((_club) => {
        const marketCap = (BigInt(_club.supply) <=  FLAT_THRESHOLD && _club.v2) ? BigInt(_club.liquidity) : formatUnits(BigInt(_club.liquidityReleasedAt ? parseUnits("1000000000", DECIMALS) : _club.supply) * BigInt(_club.currentPrice.toString()), DECIMALS).split(".")[0];
        const club = groupedClubs[_club.clubId.toString()] ? groupedClubs[_club.clubId.toString()][0] : undefined;
        if (club?.hidden) return; // db forced hide
        let { name, symbol, uri: image } = _club;
        if (!name || !symbol || !image) {
          // backup for v1 clubs
          [name, symbol, image] = decodeAbiParameters([
            { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
          ], _club.tokenInfo);
        }
        const token = { name, image, symbol };
        if (club) {
          club.featured = !!club?.featureEndAt && (Date.now() / 1000) < parseInt(club.featureEndAt);
          if (club.featured) return; // featured clubs are queried elsewhere
          const publication = gPublications[club.postId] ? gPublications[club.postId][0] : undefined;
          return { publication, ..._club, ...club, marketCap, token };
        } else { // not created on our app
          return { ..._club, handle: _club.creator, marketCap, token };
        }
      }).filter((c) => c);

      return { clubs: responseClubs, hasMore: data?.clubs?.length == limit }
    } catch (error) {
      console.log(error);
    }
  }

  return { clubs: [], hasMore: false };
};

export const publicClient = (chain = "base") => {
  const _chain = getChain(chain);
  return createPublicClient({ chain: _chain, transport: http(ChainRpcs[_chain.id]) });
};

export const getBalance = async (clubId: string, account: `0x${string}`, chain = "base"): Promise<bigint> => {
  const id = toHexString(parseInt(clubId));
  const client = subgraphClient(chain);
  const { data: { clubChips } } = await client.query({ query: CLUB_BALANCE, variables: { trader: account, club: id } });
  return clubChips && clubChips.length > 0 ? BigInt(clubChips[0].amount) : 0n
};

export const getAvailableBalance = async (tokenAddress: `0x${string}`, account: `0x${string}`, chain = "base"): Promise<{ availableBalance: bigint, totalBalance: bigint, vestingBalance: bigint }> => {
  const client = publicClient(chain);
  const [availableBalance, totalBalance] = await client.multicall({
    contracts: [
      {
        address: tokenAddress,
        abi: VestingERC20Abi,
        functionName: "getAvailableBalance",
        args: [account],
      },
      {
        address: tokenAddress,
        abi: VestingERC20Abi,
        functionName: "balanceOf",
        args: [account],
      }
    ]
  });

  return {
    availableBalance: availableBalance.result as bigint,
    vestingBalance: (totalBalance.result as bigint) - (availableBalance.result as bigint),
    totalBalance: totalBalance.result as bigint
  };
};

export const getBuyPrice = async (
  account: `0x${string}`,
  clubId: string,
  amount: string,
  supply?: string,
  chain = "base",
  _pricingTier?: string
): Promise<{ buyPrice: bigint; buyPriceAfterFees: bigint }> => {
  const amountWithDecimals = parseUnits(amount, DECIMALS);
  const client = publicClient(chain);
  let buyPrice
  let pricingTier = _pricingTier ? LENS_PRICING_TIERS[_pricingTier] : undefined
  try {
    buyPrice = !!supply ?
      await client.readContract({
        address: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
        abi: chain == "base" ? BonsaiLaunchpadAbi : BonsaiLaunchpadV3Abi,
        functionName: "getBuyPrice",
        args: chain === "base" ? [parseUnits(supply, DECIMALS), amountWithDecimals] : [parseUnits(supply, DECIMALS), amountWithDecimals, pricingTier?.initialPrice, pricingTier?.flatThreshold, pricingTier?.targetPriceMultiplier]
      })
      : await client.readContract({
        address: chain == "base" ? PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad : PROTOCOL_DEPLOYMENT[chain].Periphery,
        abi: chain == "base" ? BonsaiLaunchpadAbi : PeripheryAbi,
        functionName: "getBuyPriceByClub",
        args: [clubId, amountWithDecimals]
      });
  } catch (error) {
    console.log("getBuyPrice", error);
    buyPrice = 1n
  }

  return {
    buyPrice: buyPrice as bigint,
    buyPriceAfterFees: 0n, // HACK
  };
};

// optional params: initialPrice, targetPriceMultiplier, flatThreshold
// not needed for Base deployment, but needed for Lens deployment
function calculateTokensForUSDC(
  usdcAmount: bigint,
  currentSupply: bigint,
  initialPrice = BigInt("12384118034062500000000000000000"),
  targetPriceMultiplier = 5n,
  flatThreshold = FLAT_THRESHOLD
): bigint {
  const BPS_MAX = BigInt("10000");
  const targetPrice = initialPrice * targetPriceMultiplier;
  const decimals = 18
  const maxSupply = MAX_MINTABLE_SUPPLY

  function getPrice(supply: bigint, amount: bigint, initialPrice: bigint, targetPriceMultiplier: bigint, flatThreshold: bigint): bigint {
    if (supply < flatThreshold) {
      if (supply + amount <= flatThreshold) {
        return (amount * initialPrice) / BigInt(10 ** decimals);
      }

      const flatAmount = flatThreshold - supply;
      const curveAmount = amount - flatAmount;

      return (flatAmount * initialPrice) / BigInt(10 ** decimals) + getPrice(flatThreshold, curveAmount, initialPrice, targetPriceMultiplier, flatThreshold);
    }

    const endSupply = supply + amount;
    const slope = ((targetPrice - initialPrice) * BPS_MAX) / (maxSupply / BigInt(10 ** decimals));

    return calculateDeltaArea(supply, endSupply, slope, initialPrice);
  }

  function calculateDeltaArea(
    startSupply: bigint,
    endSupply: bigint,
    slope: bigint,
    initialPrice: bigint
  ): bigint {
    const normalizedStart = startSupply / BigInt(10 ** decimals);
    const normalizedEnd = endSupply / BigInt(10 ** decimals);
    const normalizedFlat = flatThreshold / BigInt(10 ** decimals);

    const x1 = normalizedStart - normalizedFlat;
    const x2 = normalizedEnd - normalizedFlat;

    const area1 = (slope * x1 * x1) / BigInt(2) + (initialPrice * BPS_MAX * x1);
    const area2 = (slope * x2 * x2) / BigInt(2) + (initialPrice * BPS_MAX * x2);

    return (area2 - area1) / BPS_MAX;
  }

  let low = BigInt(0);
  let high = BigInt(maxSupply - currentSupply);
  let mid: bigint;
  let price: bigint;

  const TOLERANCE = 0n; // Acceptable difference in wei (1e-8 USD for USDC)
  let bestGuess = 0n;
  let loopCounter = 0;

  while (low <= high) {
    mid = (low + high) / 2n;
    price = getPrice(currentSupply, mid, initialPrice, targetPriceMultiplier, flatThreshold) / parseUnits("1", 18);

    // Track closest value below target
    if (price < usdcAmount && (usdcAmount - price) < (usdcAmount - bestGuess)) {
      bestGuess = mid;
    }

    // Early exit if within tolerance
    if (price > usdcAmount - TOLERANCE && price < usdcAmount + TOLERANCE) {
      break;
    }

    if (price < usdcAmount) {
      low = mid + 1n;
    } else {
      high = mid - 1n;
    }

    // Final fallback to best guess if we exit loop
    if (loopCounter++ > 100) {
      mid = bestGuess;
      break;
    }
  }

  return low
}

const PROTOCOL_FEE = 0.03; // 3% total fees for non-NFT holders

function cleanupTrailingOne(amount: bigint): bigint {
  // Convert to string to check last digit
  const amountStr = amount.toString();
  // Only clean up if the number is large enough and ends in 1
  if (amountStr.length > 20 && amountStr.endsWith('1')) {
    return BigInt(amountStr.slice(0, -1) + '0');
  }
  return amount;
}

// returns the amount of tokens a user will receive for `spendAmount` - use the returned `buyAmount` to call buyChips
export const getBuyAmount = async (
  account: `0x${string}`,
  tokenAddress: `0x${string}`, // club.tokenAddress
  spendAmount: string, // Amount in USDC user wants to spend
  hasNft = false,
  chain = "base",
  options?: { initialPrice?: string, targetPriceMultiplier?: string, flatThreshold?: string }
): Promise<{
  buyAmount: bigint,
  effectiveSpend: string
}> => {
  const client = publicClient(chain);

  // Convert spend amount to proper decimals. Assuming WGHO for Lens
  const _DECIMALS = chain === "lens" ? DECIMALS : USDC_DECIMALS;
  const spendAmountBigInt = parseUnits(spendAmount, _DECIMALS);

  // If user has NFT, use full amount. If not, reduce by fees
  const spendAfterFees = hasNft
    ? spendAmountBigInt
    : (spendAmountBigInt * BigInt(Math.floor((1 - PROTOCOL_FEE) * 10000)) / 10000n);

  const currentSupply = await client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "totalSupply",
    args: [],
    account
  }) as bigint;

  const rawBuyAmount = options ? calculateTokensForUSDC(spendAfterFees, currentSupply, BigInt(options.initialPrice!), BigInt(options.targetPriceMultiplier!), BigInt(options.flatThreshold!)) : calculateTokensForUSDC(spendAfterFees, currentSupply);
  const buyAmount = cleanupTrailingOne(rawBuyAmount);

  let effectiveSpend = spendAfterFees
  if (BigInt(buyAmount || 0n) + BigInt(currentSupply) >= MAX_MINTABLE_SUPPLY) {
    const adjustedAmount = formatUnits(MAX_MINTABLE_SUPPLY - BigInt(currentSupply), DECIMALS)
    effectiveSpend = (await getBuyPrice(account, "0", adjustedAmount, formatUnits(currentSupply, DECIMALS))).buyPriceAfterFees
  }

  return {
    buyAmount,
    effectiveSpend: formatUnits(effectiveSpend, USDC_DECIMALS)
  };
};

export const getSellPrice = async (
  account: `0x${string}`,
  clubId: string,
  amount: string,
  hasNft = false,
  chain = "base"
): Promise<{ sellPrice: bigint; sellPriceAfterFees: bigint }> => {
  const amountWithDecimals = parseUnits(amount, DECIMALS);
  const client = publicClient(chain);
  const sellPrice = await client.readContract({
    address: chain == "base" ? PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad : PROTOCOL_DEPLOYMENT[chain].Periphery,
    abi: chain == "base" ? BonsaiLaunchpadAbi : PeripheryAbi,
    functionName: "getSellPriceByClub",
    args: [clubId, amountWithDecimals],
    account,
  })
  return {
    sellPrice: sellPrice as bigint,
    sellPriceAfterFees: hasNft ? sellPrice as bigint : (sellPrice as bigint) * BigInt(97) / BigInt(100),
  };
};

export const getRegistrationFee = async (
  amount: string,
  account?: `0x${string}`,
  chain = "base",
  pricingTier?: string
): Promise<bigint> => {
  if (amount == "0") return BigInt(0);
  const initialBuyPrice = await getBuyPrice(account || zeroAddress, "0", amount, "0", chain, pricingTier)
  // TODO: if registration fee is turned on do something here
  return initialBuyPrice.buyPrice as bigint
};

export const calculatePriceDelta = (price: bigint, lastTradePrice: bigint): { valuePct: number; positive?: boolean; neutral?: boolean } => {
  if (lastTradePrice == 0n) return { valuePct: 0 };
  const priceDelta: bigint = price > lastTradePrice ? price - lastTradePrice : lastTradePrice - price;
  const priceDeltaPercentage = parseFloat(formatEther(priceDelta)) * 100 / parseFloat(formatEther(lastTradePrice));
  return {
    valuePct: parseFloat(roundedToFixed(priceDeltaPercentage, 2)),
    positive: price > lastTradePrice,
    neutral: price === lastTradePrice,
  };
};

export const getFeesEarned = async (account: `0x${string}`, chain?: "base" | "lens"): Promise<{
  base: { feesEarned: bigint, clubFeesTotal: bigint, clubFees: any[] },
  lens: { feesEarned: bigint, clubFeesTotal: bigint, clubFees: any[] },
  totalFeesEarned: bigint,
  totalClubFees: bigint,
  grandTotal: bigint
}> => {
  // Helper function to get fees for a specific chain
  const getChainFees = async (chainName: "base" | "lens") => {
    const client = subgraphClient(chainName);
    const publicC = publicClient(chainName);

    // Get creator NFTs
    const { data: { creatorNFTs } } = await client.query({
      query: GET_CREATOR_NFTS,
      variables: { trader: account }
    });
    const creatorNFTList = creatorNFTs?.map(nft => nft.club.clubId) || [];

    // Prepare multicall contracts array
    let feesEarnedArgs = [account]
    if (chainName === "lens") {
      feesEarnedArgs.push(WGHO_CONTRACT_ADDRESS)
    }
    const contracts = [
      // Get total fees earned
      {
        address: PROTOCOL_DEPLOYMENT[chainName].BonsaiLaunchpad,
        abi: chainName === "base" ? BonsaiLaunchpadAbi : BonsaiLaunchpadV3Abi,
        functionName: "feesEarned",
        args: feesEarnedArgs,
      },
      // Get fees earned for each club
      ...creatorNFTList.map(id => ({
        address: PROTOCOL_DEPLOYMENT[chainName].BonsaiLaunchpad,
        abi: BonsaiLaunchpadAbi,
        functionName: "clubFeesEarned",
        args: [id],
      }))
    ];

    try {
      // Execute multicall
      const [feesEarned, ...clubFeesResults] = await publicC.multicall({
        contracts,
        allowFailure: false
      });

      // Map club fees results to original format
      const clubFees = clubFeesResults.map((fees, index) => ({
        id: parseInt(creatorNFTList[index]),
        amount: chainName === "lens"
          ? (fees as bigint) / BigInt(10 ** 12) // Convert from 18 to 6 decimals
          : fees as bigint
      }));

      const clubFeesTotal = clubFees.reduce((sum, fee) => sum + fee.amount, 0n);
      const normalizedFeesEarned = chainName === "lens"
        ? (feesEarned as bigint) / BigInt(10 ** 12) // Convert from 18 to 6 decimals
        : feesEarned as bigint;

      return {
        feesEarned: normalizedFeesEarned,
        clubFeesTotal,
        clubFees,
      };
    } catch (error) {
      console.error(`Error fetching fees for ${chainName}:`, error);
      return {
        feesEarned: 0n,
        clubFeesTotal: 0n,
        clubFees: [],
      };
    }
  };

  // If chain is specified, only get fees for that chain
  if (chain) {
    const fees = await getChainFees(chain);
    return {
      base: chain === "base" ? fees : { feesEarned: 0n, clubFeesTotal: 0n, clubFees: [] },
      lens: chain === "lens" ? fees : { feesEarned: 0n, clubFeesTotal: 0n, clubFees: [] },
      totalFeesEarned: fees.feesEarned,
      totalClubFees: fees.clubFeesTotal,
      grandTotal: fees.feesEarned + fees.clubFeesTotal
    };
  }

  // Get fees for both chains in parallel
  const [baseFees, lensFees] = await Promise.all([
    getChainFees("base"),
    getChainFees("lens")
  ]);

  const totalFeesEarned = baseFees.feesEarned + lensFees.feesEarned;
  const totalClubFees = baseFees.clubFeesTotal + lensFees.clubFeesTotal;

  return {
    base: baseFees,
    lens: lensFees,
    totalFeesEarned,
    totalClubFees,
    grandTotal: totalFeesEarned + totalClubFees
  };
};

export enum PricingTier {
  TEST = "TEST", // testnet only 1 gho graduation
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
}

// NOTE: initialPrice values assume 18 decimals in quote token (WGHO)
const LENS_PRICING_TIERS = {
  [PricingTier.TEST]: {
    initialPrice: "588251339500000000000000000", // 1 WGHO
    flatThreshold: FLAT_THRESHOLD.toString(),
    targetPriceMultiplier: 2,
  },
  [PricingTier.SMALL]: {
    initialPrice: "3529508034062500000000000000000",
    flatThreshold: FLAT_THRESHOLD.toString(),
    targetPriceMultiplier: 5,
  },
  [PricingTier.MEDIUM]: {
    initialPrice: "6471118034062500000000000000000",
    flatThreshold: FLAT_THRESHOLD.toString(),
    targetPriceMultiplier: 5,
  },
  [PricingTier.LARGE]: {
    initialPrice: "12384118034062500000000000000000",
    flatThreshold: FLAT_THRESHOLD.toString(),
    targetPriceMultiplier: 5,
  }
};

type RegistrationTxParams = {
  hook: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  tokenImage: string;
  initialSupply: string;
  cliffPercent: number; // bps
  vestingDuration: number; // seconds
  pricingTier?: PricingTier;
};
export const registerClubTransaction = async (
  walletClient,
  params: RegistrationTxParams,
  chain = "base"
): Promise<{ clubId?: string, txHash?: string, tokenAddress?: string }> => {
  const token = encodeAbi(["string", "string", "string"], [params.tokenName, params.tokenSymbol, params.tokenImage]);
  let args = [params.hook, token, params.initialSupply, zeroAddress, params.cliffPercent, params.vestingDuration];
  if (chain == "lens" && params.pricingTier) {
    args.push(LENS_PRICING_TIERS[params.pricingTier].initialPrice);
    args.push(LENS_PRICING_TIERS[params.pricingTier].flatThreshold);
    args.push(LENS_PRICING_TIERS[params.pricingTier].targetPriceMultiplier);
    args.push(zeroAddress); // TODO: whitelist module
    args.push("0x"); // TODO: whitelist data
    args.push(WGHO_CONTRACT_ADDRESS); // quote token
  }
  const hash = await walletClient.writeContract({
    address: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
    abi: chain == "base" ? BonsaiLaunchpadAbi : BonsaiLaunchpadV3Abi,
    functionName: "registerClub",
    args,
    chain: getChain(chain)
  });
  console.log(`tx: ${hash}`);

  const receipt: TransactionReceipt = await publicClient(chain).waitForTransactionReceipt({ hash });
  const event = getEventFromReceipt({
    contractAddress: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
    transactionReceipt: receipt,
    abi: BonsaiLaunchpadAbi,
    eventName: "RegisteredClub",
  });
  const res = {
    clubId: event.args.clubId.toString(),
    tokenAddress: event.args.tokenAddress.toString() as `0x${string}`,
    txHash: hash
  };

  return receipt.status === "success" ? res : {};
};

export const setLensData = async ({
  hash,
  handle,
  postId,
  chain,
}: { hash: string; handle: string; postId: string; chain: string }) => {
  await fetch('/api/clubs/set-lens-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash: hash, handle, pubId: postId, chain })
  });
}

export const buyChips = async (
  walletClient: any,
  clubId: string,
  amount: bigint,
  maxPrice: bigint,
  referral?: `0x${string}`,
  chain = "base",
  clientAddress?: `0x${string}`
) => {
  const [recipient] = await walletClient.getAddresses();
  const hash = await walletClient.writeContract({
    address: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
    abi: BonsaiLaunchpadAbi,
    functionName: "buyChips",
    args: [clubId, amount, maxPrice, clientAddress || zeroAddress, recipient, referral || zeroAddress],
    chain: getChain(chain)
  });
  console.log(`tx: ${hash}`);
  const receipt: TransactionReceipt = await publicClient(chain).waitForTransactionReceipt({ hash });

  if (receipt.status === "reverted") throw new Error("Reverted");
};

export const sellChips = async (walletClient: any, clubId: string, sellAmount: string, minAmountOut: bigint, chain = "base") => {
  const amountWithDecimals = parseUnits(sellAmount, DECIMALS);
  const hash = await walletClient.writeContract({
    address: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
    abi: BonsaiLaunchpadAbi,
    functionName: "sellChips",
    args: [clubId, amountWithDecimals, minAmountOut, zeroAddress],
    chain: getChain(chain)
  });
  console.log(`tx: ${hash}`);
  const receipt: TransactionReceipt = await publicClient(chain).waitForTransactionReceipt({ hash });

  if (receipt.status === "reverted") throw new Error("Reverted");
};

export const approveToken = async (
  token: string,
  amount: bigint,
  walletClient: any,
  toastId?,
  approveMessage = "Approving tokens...",
  chain = "base",
  contractAddress = PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad
) => {
  const [user] = await walletClient.getAddresses();
  const client = publicClient(chain);
  const allowance = await client.readContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [user, contractAddress],
  });

  if (allowance < amount) {
    toastId = toast.loading(approveMessage);
    const hash = await walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [contractAddress, maxUint256],
      chain: getChain(chain)
    });
    console.log(`hash: ${hash}`)
    await client.waitForTransactionReceipt({ hash });

    toast.dismiss(toastId);
  }
};

export const releaseLiquidity = async (clubId: string, chain = "base") => {
  const tokenPrice = queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C");
  const { data: { token, hash } } = await axios.post(`/api/clubs/release-liquidity`, {
    clubId, tokenPrice, chain
  })

  await fetch('/api/clubs/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updateRecord: { clubId: parseInt(BigInt(clubId).toString()), liquidityReleasedTxHash: hash, chain } })
  });

  return token;
};

// TODO: might need to enrich with creator profile
// for api
export const getClubs = async (page = 0, chain = "base"): Promise<{ clubs: any[], hasMore: boolean }> => {
  const limit = 25;
  const skip = page * limit;
  const { data } = await subgraphClient(chain).query({ query: REGISTERED_CLUBS, variables: { skip, pageSize: limit } });

  if (data?.clubs?.length) {
    const clubs = data?.clubs.map((_club) => {
      let { name, symbol, image } = _club

      if (!_club.name || !_club.symbol || !_club.uri) {
        // backup for v1 clubs
        ;[name, symbol, image] = decodeAbiParameters([
          { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
        ], _club.tokenInfo);
      }
      const token = { name, symbol, image };
      const marketCap = formatUnits(BigInt(_club.supply) * BigInt(_club.currentPrice), DECIMALS).split(".")[0];
      return { ..._club, marketCap, token, tokenInfo: undefined, __typename: undefined };
    })

    return { clubs, hasMore: data?.clubs?.length == limit }
  }

  return { clubs: [], hasMore: false };
};

export const withdrawFeesEarned = async (walletClient, feesEarned: bigint, clubIds: bigint[], chain = "base") => {
  let hash;
  const receipts: any[] = [];

  if (feesEarned > 0n) {
    hash = await walletClient.writeContract({
      address: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
      abi: BonsaiLaunchpadAbi,
      functionName: "withdrawFeesEarned",
      args: [zeroAddress],
      chain: getChain(chain)
    });
    console.log(`tx: ${hash}`);
    receipts.push(publicClient(chain).waitForTransactionReceipt({ hash }));
  }

  if (clubIds && clubIds.length > 0) {
    hash = await walletClient.writeContract({
      address: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
      abi: BonsaiLaunchpadAbi,
      functionName: "withdrawClubFeesEarned",
      args: [clubIds],
      chain: getChain(chain)
    });
    console.log(`tx 2: ${hash}`);
    receipts.push(publicClient(chain).waitForTransactionReceipt({ hash }));
  }

  if (receipts.length > 0) {
    const results: TransactionReceipt[] = await Promise.all(receipts);
    if (results.some(receipt => receipt.status === "reverted")) {
      throw new Error("Reverted");
    }
  }
}

export const fetchTokenPrice = async (tokenAddress: string, chain = "base"): Promise<number> => {
  try {
    const response = await fetch(`/api/clubs/get-token-price?tokenAddress=${tokenAddress}&chain=${chain}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch token price');
    }

    const { tokenPrice } = await response.json();

    if (tokenPrice === undefined) {
      throw new Error('Token price not found');
    }

    return tokenPrice;
  } catch (error) {
    console.error(error);
    throw new Error('Error fetching token price');
  }
};

export const getTrader = async (variables: { id: `0x${string}`, isBuy: boolean, createdAt_gt: number }, chain = "base") => {
  const { data } = await subgraphClient(chain).query({ query: GET_TRADER, variables });

  return data.trader;
}

// WGHO ABI for the deposit function
export const WGHO_ABI = [
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        name: "wad",
        type: "uint256"
      }
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
