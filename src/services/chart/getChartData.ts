import { gql } from "@apollo/client";
import { formatUnits } from "viem";
import { toHexString } from "../lens/utils";
import { subgraphClient, USDC_DECIMALS } from "../madfi/moneyClubs";

const CLUB_TRADES_PAGINATED = gql`
  query ClubTrades($club: Bytes!, $createdAt_gt: Int!, $createdAt_lt: Int!, $skip: Int!) {
    trades(where: {club:$club, createdAt_gt: $createdAt_gt, createdAt_lt: $createdAt_lt}, orderBy: createdAt, orderDirection: desc, first: 100, skip: $skip) {
      price
      prevPrice
      createdAt
    }
  }
`;

export enum Timeframe {
  Day,
  FourHour,
  FifteenMin,
}

type Trade = {
  price: string; // bigint
  prevPrice: string; // bigint
  createdAt: string; // unix timestamp (seconds)
}

type Bar = {
  time: number; // unix timestamp (ms)
  open: number; // opening price
  high: number; // highest price
  low: number; // lowest price
  close: number; // closing price
};

const getTrades = async (
  client,
  clubId: string,
  createdAt_gt: any,
  createdAt_lt: any,
  page: number = 0,
): Promise<{ trades: any[], hasMore: boolean }> => {
  const club = toHexString(parseInt(clubId));
  const limit = 100;
  const skip = page * limit;

  const { data: { trades } } = await client.query({
    query: CLUB_TRADES_PAGINATED,
    variables: { club, skip, createdAt_gt, createdAt_lt }
  });

  return { trades: trades || [], hasMore: trades?.length == limit };
};

// resolution: ['1S', '1', '5', '15', '60', '240', '1D', '1W', '1M']
const formatTrades = (trades: Trade[], resolution: string): Bar[] => {
  const candleMap: Map<number, { open: number, high: number, low: number, close: number }> = new Map();

  trades.forEach((trade) => {
    const timestamp = parseInt(trade.createdAt) * 1000;
    let dateKey;

    switch (resolution) {
      case '1S':
        dateKey = timestamp; // Use raw timestamp for 1 second resolution
        break;
      case '1':
        dateKey = Math.floor(timestamp / 60000) * 60000; // Align to the start of the minute
        break;
      case '5':
      case '15':
      case '60':
      case '240':
        const minutes = parseInt(resolution);
        dateKey = Math.floor(timestamp / (60000 * minutes)) * (60000 * minutes); // Align to the start of the specified minute interval
        break;
      case '1D':
        const date = new Date(timestamp);
        date.setHours(0, 0, 0, 0); // Align to the start of the day
        dateKey = date.getTime();
        break;
      case '1W':
        const weekStart = new Date(timestamp);
        weekStart.setHours(0, 0, 0, 0); // Align to the start of the day
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Adjust to the start of the week (Sunday)
        dateKey = weekStart.getTime();
        break;
      case '1M':
        const monthStart = new Date(timestamp);
        monthStart.setHours(0, 0, 0, 0); // Align to the start of the day
        monthStart.setDate(1); // Adjust to the first day of the month
        dateKey = monthStart.getTime();
        break;
      default:
        throw new Error(`Unsupported resolution: ${resolution}`);
    }

    const price = parseFloat(formatUnits(BigInt(trade.price), USDC_DECIMALS).toString());
    const open = parseFloat(formatUnits(BigInt(trade.prevPrice), USDC_DECIMALS).toString());

    if (!candleMap.has(dateKey)) {
      candleMap.set(dateKey, {
        open,
        high: Math.max(open, price),
        low: Math.min(open, price),
        close: price
      });
    } else {
      const candle = candleMap.get(dateKey)!;
      candle.open = open;
      candle.high = Math.max(candle.high, Math.max(price, open));
      candle.low = Math.min(candle.low, Math.min(price, open));
      // As we are processing by createdAt desc, we do not update close
    }
  });

  const sortedDates = Array.from(candleMap.keys()).sort((a, b) => a - b);
  const candleData: Bar[] = sortedDates.map((dateKey) => {
    const { open, high, low, close } = candleMap.get(dateKey)!;
    return {
      time: dateKey,
      open,
      high,
      low,
      close,
    };
  });

  return candleData;
};

export const getBondingCurveTrades = async (clubId: string, createdAt_gt: number, createdAt_lt: number, countBack: number, resolution: string) => {
  let allTrades: any[] = [];
  let hasMore = true;
  let currentPage = 0;

  if (createdAt_gt < 0 || createdAt_lt < 0) return [];

  const client = subgraphClient();
  while (hasMore) {
    const { trades, hasMore: more } = await getTrades(client, clubId, createdAt_gt, createdAt_lt, currentPage);
    allTrades = [...allTrades, ...trades];

    // Stop fetching if we have enough trades
    if (allTrades.length >= countBack) {
      break;
    }

    hasMore = more && trades.some(trade => trade.createdAt > createdAt_gt && trade.createdAt <= createdAt_lt);
    currentPage++;
  }

  return formatTrades(allTrades, resolution);
};