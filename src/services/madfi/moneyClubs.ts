import { ApolloClient, HttpLink, InMemoryCache, gql } from "@apollo/client";
import { createPublicClient, http, parseUnits, formatEther, TransactionReceipt, zeroAddress, erc20Abi, maxUint256, decodeAbiParameters, formatUnits, parseEther } from "viem";
import { base, baseSepolia } from "viem/chains";
import { groupBy, reduce } from "lodash/collection";
import toast from "react-hot-toast";

import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { ChainRpcs } from "@src/constants/chains";
import { getProfileByHandle } from "@src/services/lens/getProfiles";
import { roundedToFixed } from "@src/utils/utils";
import { getAccessToken } from "@src/hooks/useLensLogin";
import { encodeAbi } from "@src/utils/viem";
import { getEventFromReceipt } from "@src/utils/viem";
import { MADFI_WALLET_ADDRESS } from "@src/constants/constants";

import { lensClient } from "../lens/client";
import axios from "axios";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";

export const IS_PRODUCTION = process.env.NEXT_PUBLIC_LAUNCHPAD_CHAIN_ID === "8453";

const REGISTERED_CLUB = gql`
  query Club($id: Bytes!, $twentyFourHoursAgo: Int!, $sixHoursAgo: Int!, $oneHourAgo: Int!, $fiveMinutesAgo: Int!) {
    club(id: $id) {
      id
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
      tokenInfo
      tokenAddress
      creatorFees
      holders
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
      clubId
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
        club { clubId }
        createdAt
    }
  }
`;

const REGISTERED_CLUBS = gql`
  query Clubs($skip: Int!) {
    clubs(orderBy: supply, orderDirection: desc, first: 50, skip: $skip) {
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
      tokenInfo
      tokenAddress
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
        supply
        tokenAddress
        tokenInfo
        currentPrice
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
      }
      trader {
        id
      }
      amount
      createdAt
    }
  }
`;

export const INITIAL_CHIP_SUPPLY_CAP = 10; // with 6 decimals in the contract
export const DECIMALS = 6;
export const USDC_DECIMALS = 6;
// this isn't likely to change
export const MIN_LIQUIDITY_THRESHOLD = IS_PRODUCTION ? BigInt(23005) : BigInt(10);
export const BENEFITS_AUTO_FEATURE_HOURS = 3;

export const USDC_CONTRACT_ADDRESS = IS_PRODUCTION
  ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  : "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const DEFAULT_HOOK_ADDRESS = IS_PRODUCTION
  ? zeroAddress // TODO: mainnet address!
  : "0xA788031C591B6824c032a0EFe74837EE5eaeC080";
export const BONSAI_TOKEN_ZKSYNC_ADDRESS = "0xB0588f9A9cADe7CD5f194a5fe77AcD6A58250f82";
export const BONSAI_TOKEN_BASE_ADDRESS = IS_PRODUCTION
  ? "0x474f4cb764df9da079D94052fED39625c147C12C"
  : "0x3d2bD0e15829AA5C362a4144FdF4A1112fa29B5c"
export const BONSAI_NFT_ZKSYNC_ADDRESS = "0x40df0F8C263885093DCCEb4698DE3580FC0C9D49";
export const BONSAI_NFT_BASE_ADDRESS = IS_PRODUCTION
  ? "0xf060fd6b66B13421c1E514e9f10BedAD52cF241e"
  : "0xE9d2FA815B95A9d087862a09079549F351DaB9bd"

export const CONTRACT_CHAIN_ID = IS_PRODUCTION ? base.id : baseSepolia.id;

export const MONEY_CLUBS_SUBGRAPH_URL = `https://gateway.thegraph.com/api/${process.env.NEXT_PUBLIC_MONEY_CLUBS_SUBGRAPH_API_KEY}/subgraphs/id/E1jXM6QybxvtA71cbiFbyyQYJwn2AHJNk7AAH1frZVyc`;
// export const MONEY_CLUBS_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/18207/bonsai-launchpad-base/version/latest"; // DEV URL
export const MONEY_CLUBS_SUBGRAPH_TESTNET_URL = `https://api.studio.thegraph.com/query/18207/bonsai-launchpad/version/latest`;

export function baseScanUrl(txHash: string) {
  return `https://${!IS_PRODUCTION ? "sepolia." : ""}basescan.org/tx/${txHash}`;
}

function toPaddedHexString(id: number | string, minLength: number = 2): string {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  let hexString = numericId.toString(16);

  if (numericId < 128) {
    // Pad at the beginning for numbers less than 128
    while (hexString.length < minLength) {
      hexString = '0' + hexString;
    }
  } else {
    // Adjust minLength for numbers greater than or equal to 128
    if (numericId >= 128) minLength = 4;
    if (numericId >= 256) minLength = 6;
    // Pad at the end for numbers greater than or equal to 128
    while (hexString.length < minLength) {
      hexString += '0';
    }
  }
  return `0x${hexString}`;
}

export const subgraphClient = () => {
  const uri = IS_PRODUCTION ? MONEY_CLUBS_SUBGRAPH_URL : MONEY_CLUBS_SUBGRAPH_TESTNET_URL;
  return new ApolloClient({
    ssrMode: typeof window === "undefined", // set to true for server-side rendering
    link: new HttpLink({ uri }),
    cache: new InMemoryCache(),
  });
};

// server-side
export const getRegisteredClubById = async (clubId: string) => {
  const id = toPaddedHexString(parseInt(clubId));
  const now = Date.now();
  const twentyFourHoursAgo = Math.floor(now / 1000) - 24 * 60 * 60;
  const sixHoursAgo = Math.floor(now / 1000) - 6 * 60 * 60;
  const oneHourAgo = Math.floor(now / 1000) - 60 * 60;
  const fiveMinutesAgo = Math.floor(now / 1000) - 5 * 60;
  const client = subgraphClient();
  const { data: { club } } = await client.query({
    query: REGISTERED_CLUB,
    variables: {
      id,
      twentyFourHoursAgo,
      sixHoursAgo,
      oneHourAgo,
      fiveMinutesAgo
    }
  })

  const prevTrade24h = club?.prevTrade24h ? club?.prevTrade24h[0] :  {};
  const prevTrade6h = club?.prevTrade6h ? club?.prevTrade6h[0] : {};
  const prevTrade1h = club?.prevTrade1h ? club?.prevTrade1h[0] : {};
  const prevTrade5m = club?.prevTrade5m ? club?.prevTrade5m[0] : {};

  return {
    ...club,
    "24h": prevTrade24h,
    "6h": prevTrade6h,
    "1h": prevTrade1h,
    "5m": prevTrade5m,
  };
};

export const getRegisteredClubInfo = async (ids: string[]) => {
  const client = subgraphClient();
  const { data: { clubs } } = await client.query({ query: REGISTERED_CLUB_INFO, variables: { ids } })
  return clubs?.map((club) => {
    const [name, symbol, image] = decodeAbiParameters([
      { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
    ], club.tokenInfo);
    return { name, symbol, image, clubId: club.clubId, id: club.id };
  });
};

export const getVolume = async (clubId: string): Promise<bigint> => {
  const id = toPaddedHexString(parseInt(clubId));
  const startOfDayUTC = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const client = subgraphClient();
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

export const getLiquidity = async (clubId: string) => {
  const client = publicClient();
  const [_,__,___,____,liquidity] = await client.readContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "registeredClubs",
    args: [clubId],
  }) as any[];

  return liquidity;
};

export const getTrades = async (clubId: string, page = 0): Promise<{ trades: any[], hasMore: boolean }> => {
  const id = toPaddedHexString(parseInt(clubId));
  const client = subgraphClient();
  const limit = 50;
  const skip = page * limit;

  const { data: { trades } } = await client.query({
    query: CLUB_TRADES_PAGINATED,
    variables: { club: id, skip }
  });

  return { trades: trades || [], hasMore: trades?.length == limit };
};

export const getLatestTrades = async (): Promise<any[]> => {
  const client = subgraphClient();
  const { data: { trades } } = await client.query({
    query: CLUB_TRADES_LATEST
  });

  return trades || [];
};

export const getHoldings = async (account: `0x${string}`, page = 0): Promise<{ holdings: any[], hasMore: boolean }> => {
  const limit = 50;
  const skip = page * limit;
  const startOfDayUTC = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  const client = subgraphClient();
  const { data: { clubChips } } = await client.query({
    query: HOLDINGS_PAGINATED, variables: { trader: account.toLowerCase(), startOfDayUTC, skip }
  });

  const holdings = await Promise.all(clubChips?.map(async (chips) => {
    const complete = chips.club.complete;
    const amount = complete
      ? BigInt(chips.amount) * parseEther("800000000") / BigInt(chips.club.supply)
      : BigInt(chips.amount);
    const balance = complete
      ? Number.parseFloat(formatEther(amount)) * (await fetchTokenPrice(chips.club.tokenAddress))
      : parseFloat(formatUnits(amount, DECIMALS)) * parseFloat(formatUnits(chips.club.currentPrice, USDC_DECIMALS));
    return { ...chips, balance, amount, complete };
  }));

  return { holdings: holdings || [], hasMore: clubChips?.length == limit };
};

export const getClubHoldings = async (clubId: string, page = 0): Promise<{ holdings: any[], hasMore: boolean }> => {
  const id = toPaddedHexString(parseInt(clubId));
  const limit = 100;
  const skip = page * limit;
  const client = subgraphClient();
  const { data: { clubChips } } = await client.query({ query: CLUB_HOLDINGS_PAGINATED, variables: { club: id, skip } });
  return { holdings: clubChips || [], hasMore: clubChips?.length == limit };
};

export const getRegisteredClub = async (handle: string, profileId?: string) => {
  if (!profileId) {
    const profile = await getProfileByHandle(`lens/${handle}`);
    profileId = profile?.id;
  }

  const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const { data } = await subgraphClient().query({
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

export const getRegisteredClubs = async (page = 0): Promise<{ clubs: any[], hasMore: boolean }> => {
  const limit = 50;
  const skip = page * limit;
  const { data } = await subgraphClient().query({ query: REGISTERED_CLUBS, variables: { skip } });

  if (data?.clubs?.length) {
    const clubIds = data?.clubs.map(({ clubId }) => parseInt(clubId));
    const response = await fetch('/api/clubs/get-linked-socials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clubIds }),
    });
    const { clubs } = await response.json();

    try {
      // TODO: fetch for other strategies (ie orb_club, farcaster)
      const publications = await lensClient.publication.fetchAll({
        where: { publicationIds: clubs.filter(({ strategy, pubId }) => (strategy === "lens" && !!pubId && typeof pubId === "string" && pubId.trim() !== "")).map(({ pubId }) => pubId) }
      });
      const gPublications = groupBy(publications.items || [], "id");
      const groupedClubs = groupBy(clubs || [], "clubId");
      const responseClubs = data?.clubs.map((_club) => {
        const club = groupedClubs[_club.clubId.toString()] ? groupedClubs[_club.clubId.toString()][0] : undefined;
        if (!club) return;
        club.featured = !!club?.featureStartAt && (Date.now() / 1000) < (parseInt(club.featureStartAt) + BENEFITS_AUTO_FEATURE_HOURS * 60 * 60);
        const publication = gPublications[club.pubId] ? gPublications[club.pubId][0] : undefined;
        const marketCap = formatUnits(BigInt(_club.supply) * BigInt(_club.currentPrice), DECIMALS).split(".")[0];
        return { publication, ..._club, ...club, marketCap };
      }).filter((c) => c);

      return { clubs: responseClubs, hasMore: data?.clubs?.length == limit }
    } catch (error) {
      console.log(error);
    }
  }

  return { clubs: [], hasMore: false };
};

export const publicClient = () => {
  const chain = IS_PRODUCTION ? base : baseSepolia;
  return createPublicClient({ chain, transport: http(ChainRpcs[chain.id]) });
};

export const getBalance = async (clubId: string, account: `0x${string}`): Promise<bigint> => {
  const res = await publicClient().readContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "balances",
    args: [clubId, account],
  });

  return res as bigint;
};

export const getBuyPrice = async (
  account: `0x${string}`,
  clubId: string,
  amount: string,
): Promise<{ buyPrice: bigint; buyPriceAfterFees: bigint }> => {
  const amountWithDecimals = parseUnits(amount, DECIMALS);
  const client = publicClient();
  const buyPrice = await client.readContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "getBuyPrice",
    args: [clubId, amountWithDecimals],
    account
  });

  return {
    buyPrice: buyPrice as bigint,
    buyPriceAfterFees: 0n, // HACK
  };
};

export const getMarketCap = async (
  supply: string,
  curve: number | string,
): Promise<bigint> => {
  console.log(supply, curve)
  const client = publicClient();
  const marketCap = await client.readContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "getMcap",
    args: [supply, curve]
  });

  return marketCap as bigint
};

const PROTOCOL_FEE = 0.03; // 3% total fees for non-NFT holders

export const getBuyAmount = async (
  account: `0x${string}`,
  clubId: string,
  spendAmount: string, // Amount in USDC user wants to spend
  hasNft = false
): Promise<{
  maxAllowed: bigint,
  buyAmount: bigint,
  excess: bigint,
  effectiveSpend: string
}> => {
  const client = publicClient();

  // Convert spend amount to proper decimals
  const spendAmountBigInt = parseUnits(spendAmount, DECIMALS);

  // Get maximum allowed purchase and excess amount
  const [maxAllowed, excess] = await client.readContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "calculatePurchaseAllocation",
    args: [spendAmountBigInt, clubId],
    account
  }) as [bigint, bigint];

  // Calculate effective spend (maxAllowed or full amount if no excess)
  const effectiveSpendBigInt = excess > 0n ? maxAllowed : spendAmountBigInt;

  // If user has NFT, use full amount. If not, reduce by fees
  const spendAfterFees = hasNft
    ? effectiveSpendBigInt
    : (effectiveSpendBigInt * BigInt(Math.floor((1 - PROTOCOL_FEE) * 10000)) / 10000n);

  // Get token amount for the effective spend
  const buyAmount = await client.readContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "getTokensForSpend",
    args: [clubId, spendAfterFees],
    account
  }) as bigint;

  return {
    maxAllowed,
    buyAmount,
    excess,
    effectiveSpend: formatUnits(effectiveSpendBigInt, DECIMALS)
  };
};

export const getSellPrice = async (
  account: `0x${string}`,
  clubId: string,
  amount: string,
): Promise<{ sellPrice: bigint; sellPriceAfterFees: bigint }> => {
  const amountWithDecimals = parseUnits(amount, DECIMALS);
  const client = publicClient();
  const [sellPrice, sellPriceAfterFees] = await Promise.all([
    client.readContract({
      address: LAUNCHPAD_CONTRACT_ADDRESS,
      abi: BonsaiLaunchpadAbi,
      functionName: "getSellPrice",
      args: [clubId, amountWithDecimals],
      account,
    }),
    client.readContract({
      address: LAUNCHPAD_CONTRACT_ADDRESS,
      abi: BonsaiLaunchpadAbi,
      functionName: "getSellPriceAfterFees",
      args: [clubId, amountWithDecimals],
      account,
    }),
  ]);

  return {
    sellPrice: sellPrice as bigint,
    sellPriceAfterFees: sellPriceAfterFees as bigint,
  };
};

export const getRegistrationFee = async (
  amount: number,
  curve: number,
  account?: `0x${string}`
): Promise<bigint> => {
  const amountWithDecimals = parseUnits(amount.toString(), DECIMALS);
  const client = publicClient();
  return await client.readContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "getRegistrationFee",
    args: [amountWithDecimals, curve],
    account
  }) as bigint;
};

export const calculatePriceDelta = (price: bigint, lastTradePrice: bigint): { valuePct: number; positive?: boolean } => {
  if (lastTradePrice == 0n) return { valuePct: 0 };
  const priceDelta: bigint = price > lastTradePrice ? price - lastTradePrice : lastTradePrice - price;
  const priceDeltaPercentage = parseFloat(formatEther(priceDelta)) * 100 / parseFloat(formatEther(lastTradePrice));
  return {
    valuePct: parseFloat(roundedToFixed(priceDeltaPercentage, 2)),
    positive: price > lastTradePrice,
  };
};

export const getFeesEarned = async (account: `0x${string}`): Promise<bigint> => {
  const res = await publicClient().readContract({
  address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "feesEarned",
    args: [account],
  });

  return res as bigint;
};

type RegistrationParams = {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  tokenImage: string;
  initialSupply: string;
  curveType: number;
  strategy: string;
  featureStartAt?: number;
};
export const registerClub = async (walletClient, params: RegistrationParams): Promise<{ objectId?: string, clubId?: string }> => {
  const token = encodeAbi(["string", "string", "string"], [params.tokenName, params.tokenSymbol, params.tokenImage]);
  const hash = await walletClient.writeContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "registerClub",
    args: [DEFAULT_HOOK_ADDRESS, token, params.initialSupply, params.curveType, zeroAddress],
    chain: IS_PRODUCTION ? base : baseSepolia
  });
  console.log(`tx: ${hash}`);

  const identityToken = await getAccessToken();
  const response = await fetch('/api/clubs/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      strategy: params.strategy,
      identityToken,
      txHash: hash,
      token: { name: params.tokenName, symbol: params.tokenSymbol, image: params.tokenImage, description: params.tokenDescription },
      featureStartAt: params.featureStartAt
    })
  });

  const receipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash });
  const event = getEventFromReceipt({
    contractAddress: LAUNCHPAD_CONTRACT_ADDRESS,
    transactionReceipt: receipt,
    abi: BonsaiLaunchpadAbi,
    eventName: "RegisteredClub",
  });
  const res = { objectId: (await response.json()).id as string, clubId: event.args.clubId.toString() };
  return receipt.status === "success" && response.ok ? res : {};
};

export const buyChips = async (walletClient: any, clubId: string, amount: bigint, referral?: `0x${string}`) => {
  const [recipient] = await walletClient.getAddresses();
  const hash = await walletClient.writeContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "buyChips",
    args: [clubId, amount, MADFI_WALLET_ADDRESS, recipient, referral || zeroAddress],
    chain: IS_PRODUCTION ? base : baseSepolia,
  });
  console.log(`tx: ${hash}`);
  const receipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash });

  if (receipt.status === "reverted") throw new Error("Reverted");
};

export const sellChips = async (walletClient: any, clubId: string, sellAmount: string) => {
  const amountWithDecimals = parseUnits(sellAmount, DECIMALS);
  const hash = await walletClient.writeContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "sellChips",
    args: [clubId, amountWithDecimals, zeroAddress],
    chain: IS_PRODUCTION ? base : baseSepolia,
  });
  console.log(`tx: ${hash}`);
  const receipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash });

  if (receipt.status === "reverted") throw new Error("Reverted");
};

export const approveToken = async (
  token: string,
  amount: bigint,
  walletClient: any,
  toastId?,
  approveMessage = "Approving tokens...",
) => {
  const [user] = await walletClient.getAddresses();
  const client = publicClient();
  const allowance = await client.readContract({
    address: token as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [user, LAUNCHPAD_CONTRACT_ADDRESS],
  });

  if (allowance < amount) {
    toastId = toast.loading(approveMessage);
    const hash = await walletClient.writeContract({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [LAUNCHPAD_CONTRACT_ADDRESS, maxUint256],
    });
    console.log(`hash: ${hash}`)
    await client.waitForTransactionReceipt({ hash });

    toast.dismiss(toastId);
  }
};

export const releaseLiquidity = async (clubId: string) => {
  const tokenPrice = queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C");
  const { data: { token, hash } } = await axios.post(`/api/clubs/release-liquidity`, {
    clubId, tokenPrice
  })

  await fetch('/api/clubs/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updateRecord: { clubId: parseInt(BigInt(clubId).toString()), liquidityReleasedTxHash: hash } })
  });

  return token;
};

// TODO: might need to enrich with creator profile
// for api
export const getClubs = async (page = 0): Promise<{ clubs: any[], hasMore: boolean }> => {
  const limit = 50;
  const skip = page * limit;
  const { data } = await subgraphClient().query({ query: REGISTERED_CLUBS, variables: { skip } });

  if (data?.clubs?.length) {
    const clubs = data?.clubs.map((_club) => {
      const [name, symbol, image] = decodeAbiParameters([
        { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
      ], _club.tokenInfo);
      const token = { name, symbol, image };
      const marketCap = formatUnits(BigInt(_club.supply) * BigInt(_club.currentPrice), DECIMALS).split(".")[0];
      return { ..._club, marketCap, token, tokenInfo: undefined, __typename: undefined };
    })

    return { clubs, hasMore: data?.clubs?.length == limit }
  }

  return { clubs: [], hasMore: false };
};

export const claimTokens = async (walletClient, clubId: string) => {
  const [recipient] = await walletClient.getAddresses();
  const hash = await walletClient.writeContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "claimTokens",
    args: [clubId, recipient],
    chain: IS_PRODUCTION ? base : baseSepolia,
  });
  console.log(`tx: ${hash}`);
  const receipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash });

  if (receipt.status === "reverted") throw new Error("Reverted");
}

export const withdrawFeesEarned = async (walletClient) => {
  const hash = await walletClient.writeContract({
    address: LAUNCHPAD_CONTRACT_ADDRESS,
    abi: BonsaiLaunchpadAbi,
    functionName: "withdrawFeesEarned",
    args: [zeroAddress],
    chain: IS_PRODUCTION ? base : baseSepolia,
  });
  console.log(`tx: ${hash}`);
  const receipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash });

  if (receipt.status === "reverted") throw new Error("Reverted");
}

export const fetchTokenPrice = async (tokenAddress: string): Promise<number> => {
  try {
    const response = await fetch(`/api/clubs/get-token-price?tokenAddress=${tokenAddress}`, {
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
