import { NextApiRequest, NextApiResponse } from "next";
import { formatUnits, decodeAbiParameters, parseUnits } from "viem";
import axios from "axios";

import { getVolume, getRegisteredClubById, getBuyPrice, calculatePriceDelta, DECIMALS, FLAT_THRESHOLD } from "@src/services/madfi/moneyClubs";

const RANDOM_ADDRESS = "0x1C111355EdE4259Fa9825AEC1f16f95ED737D62E"; // wont be holding bonsai nft
const PREV_TRADE_KEYS = [
  "24h",
  "6h",
  "1h",
  "5m"
];
const GECKO_TERMINAL_API = "https://api.geckoterminal.com/api/v2";

interface GeckoPoolAttributes {
  address: string;
  name: string;
  token_price_usd: string;
  volume_usd: {
    h24: string;
  };
  fdv_usd: string;
}

interface GeckoPoolResponse {
  data: Array<{
    attributes: GeckoPoolAttributes;
  }>;
}

interface GeckoOHLCVResponse {
  data: Array<{
    attributes: {
      timestamp: string;
      open: string;
      high: string;
      low: string;
      close: string;
      volume: string;
    };
  }>;
}

interface GeckoTerminalData {
  price: string;
  volume24h: string;
  marketCap: string;
  poolAddress: string;
  ohlcvData: GeckoOHLCVResponse['data'];
}

// New function to fetch token data from GeckoTerminal
async function getGeckoTerminalData(tokenAddress: string, network: string): Promise<GeckoTerminalData | null> {
  try {
    // Get token pools data
    const response = await axios.get<GeckoPoolResponse>(
      `${GECKO_TERMINAL_API}/networks/${network}/tokens/${tokenAddress}/pools`
    );

    if (!response.data?.data?.length) {
      return null;
    }

    // Get the top pool data
    const topPool = response.data.data[0];
    const poolAddress = topPool.attributes.address;

    // Get OHLCV data for the last 24h
    const ohlcvResponse = await axios.get<GeckoOHLCVResponse>(
      `${GECKO_TERMINAL_API}/networks/${network}/pools/${poolAddress}/ohlcv/day`
    );

    return {
      price: topPool.attributes.token_price_usd,
      volume24h: topPool.attributes.volume_usd.h24,
      marketCap: topPool.attributes.fdv_usd,
      poolAddress,
      ohlcvData: ohlcvResponse.data?.data || []
    };
  } catch (error) {
    console.error("GeckoTerminal API error:", error);
    return null;
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { clubId } = req.query;

    let { chain } = req.query;
    if (!chain) chain = "lens";
    if (chain !== "base" && chain !== "lens") return res.status(400).json("chain must be base or lens");

    const [{ buyPrice }, volume, club] = await Promise.all([
      getBuyPrice(RANDOM_ADDRESS, clubId as string, "1", undefined, chain as string),
      getVolume(clubId as string, chain as string),
      getRegisteredClubById(clubId as string, chain as string)
    ]);

    // If club is graduated/completed, fetch data from GeckoTerminal
    let geckoData: GeckoTerminalData | null = null;
    if (club.completed && club.tokenAddress) {
      geckoData = await getGeckoTerminalData(
        club.tokenAddress,
        chain === 'base' ? 'base' : 'eth'
      );
    }

    const priceDeltas = {};
    PREV_TRADE_KEYS.forEach((key) => {
      if (club[key]?.price) {
        const res = calculatePriceDelta(buyPrice, BigInt(club[key].prevPrice !== "0" ? club[key].prevPrice : club[key].price));
        priceDeltas[key] = `${res.valuePct === 0 || res.neutral ? '' : (res.positive ? '+' : '-')}${res.valuePct.toString()}`;
      } else {
        priceDeltas[key] = "0";
      }
    });

    const marketCap = geckoData?.marketCap ||
      ((BigInt(club.supply) <=  FLAT_THRESHOLD && club.v2) ?
        BigInt(club.liquidity) :
        formatUnits(BigInt(club.liquidityReleasedAt ? parseUnits("1000000000", DECIMALS) :club.supply) * BigInt(buyPrice.toString()), DECIMALS).split(".")[0]
      );
    const holders = club.holders;
    const createdAt = club.createdAt;
    const graduated = club.completed;

    let { name, symbol, uri: image } = club

    if (!club.name || !club.symbol || !club.uri){
      // backup for v1 clubs
      [name, symbol, image] = decodeAbiParameters([
        { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
      ], club.tokenInfo);
    }

    // cache 15s
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate');

    // Determine which data sources to use based on graduation status and gecko data availability
    const useGeckoData = graduated && geckoData;

    return res.status(200).json({
      id: club.id,
      v2: club.v2,
      complete: club.complete,
      name,
      symbol,
      image,
      createdAt,
      buyPrice: useGeckoData && geckoData ? geckoData.price : buyPrice.toString(),
      volume24Hr: useGeckoData && geckoData ? geckoData.volume24h : volume.toString(),
      liquidity: club.liquidity.toString(),
      marketCap: useGeckoData && geckoData ? geckoData.marketCap : marketCap.toString(),
      holders,
      graduated,
      priceDeltas,
      cliffPercent: Math.floor(parseInt(club.cliffPercent) / 100),
      vestingDurationSeconds: club.vestingDuration,
      hook: club.hook,
      tokenAddress: club.tokenAddress,
      liquidityReleasedAt: club.liquidityReleasedAt,
      geckoTerminal: geckoData ? {
        poolAddress: geckoData.poolAddress,
        ohlcvData: geckoData.ohlcvData
      } : null
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
