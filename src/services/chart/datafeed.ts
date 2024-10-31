import { gql } from "@apollo/client";
import { decodeAbiParameters } from "viem";
import { subgraphClient } from "../madfi/moneyClubs";
import { getBondingCurveTrades } from "./getChartData";

const EXCHANGE_BONDING_CURVE = "bonding_curve";
const EXCHANGE_UNI_V4 = "uniswap_v4";

const configurationData = {
  // Represents the resolutions for bars supported by your datafeed
  supported_resolutions: ['1S', '1', '5', '15', '60', '240', '1D', '1W', '1M'],
  // The `exchanges` arguments are used for the `searchSymbols` method if a user selects the exchange
  exchanges: [EXCHANGE_BONDING_CURVE, EXCHANGE_UNI_V4],
  // The `symbols_types` arguments are used for the `searchSymbols` method if a user selects this symbol type
  symbols_types: ["crypto"]
};

export const BONDING_CURVE_BASE_TOKEN = "USDC";

const getAllSymbols = async () => {
  const REGISTERED_CLUBS_PAGINATED = gql`
    query Clubs($skip: Int!) {
      clubs(first: 100, skip: $skip) {
        id
        clubId
        tokenInfo
        tokenAddress
      }
    }
  `;
  const client = subgraphClient();
  const limit = 100;
  let skip = 0;
  let hasMore = true;
  let symbols: any[] = [];
  while (hasMore) {
    const { data: { clubs } } = await client.query({
      query: REGISTERED_CLUBS_PAGINATED,
      variables: { skip }
    });

    if (!clubs) hasMore = false;
    symbols = [...symbols, ...clubs];

    if (clubs.length < limit) {
      hasMore = false;
    } else {
      skip += limit;
    }
  }
  return symbols.map((club) => {
    const [_, _symbol, __] = decodeAbiParameters([
      { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
    ], club.tokenInfo);

    const symbol = `${_symbol}/${BONDING_CURVE_BASE_TOKEN}`;

    return {
      symbol,
      ticker: symbol,
      description: symbol,
      exchange: !!club.tokenAddress ? EXCHANGE_UNI_V4 : `${EXCHANGE_BONDING_CURVE}:${club.clubId}`,
      type: 'crypto',
    }
  });
};

export const Datafeed = {
  onReady: (callback) => {
    setTimeout(() => callback(configurationData));
  },
  searchSymbols: async (userInput, exchange, symbolType, onResultReadyCallback) => {
    const symbols = await getAllSymbols();
    const newSymbols = symbols.filter(symbol => {
      const isExchangeValid = exchange === '' || symbol.exchange === exchange;
      const fullName = `${symbol.exchange}:${symbol.ticker}`;
      const isFullSymbolContainsInput = fullName
        .toLowerCase()
        .indexOf(userInput.toLowerCase()) !== -1;
      return isExchangeValid && isFullSymbolContainsInput;
    });
    onResultReadyCallback(newSymbols);
  },
  resolveSymbol: async (symbolName, onSymbolResolvedCallback, onResolveErrorCallback, extension) => {
    const symbols = await getAllSymbols();
    const symbolItem = symbols.find(({ ticker }) => ticker === symbolName);
    if (!symbolItem) {
      // console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
      onResolveErrorCallback('Cannot resolve symbol');
      return;
    }
    // Symbol information object
    const symbolInfo = {
      ticker: symbolItem.ticker,
      name: symbolItem.symbol,
      description: symbolItem.description,
      type: symbolItem.type,
      session: '24x7',
      timezone: 'Etc/UTC',
      exchange: symbolItem.exchange,
      minmov: 1,
      pricescale: 100,
      visible_plots_set: 'ohlc',
      has_weekly_and_monthly: false,
      // has_daily: false,
      has_intraday: true,
      supported_resolutions: configurationData.supported_resolutions,
      volume_precision: 2,
      data_status: 'streaming',
    };
    onSymbolResolvedCallback(symbolInfo);
  },
  getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
    const { from, to, countBack } = periodParams;
    // console.log('[getBars]: Method call', symbolInfo, resolution, from, to, countBack);

    // TODO: handle parsedSymbol.exchange === EXCHANGE_UNI_V4
    if (symbolInfo.exchange.includes(EXCHANGE_BONDING_CURVE)) {
      const [_, clubId] = symbolInfo.exchange.split(":");
      // console.log('[getBars]: getBondingCurveTrades', clubId, from, to);
      const bars = await getBondingCurveTrades(clubId, from, to, countBack, resolution);
      onHistoryCallback(bars, { noData: bars.length === 0 });
    }
  },
  subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
    console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
  },
  unsubscribeBars: (subscriberUID) => {
    console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
  },
};