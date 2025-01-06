import { NextApiRequest, NextApiResponse } from "next";
import { formatUnits, decodeAbiParameters } from "viem";

import { getVolume, getRegisteredClubById, getBuyPrice, calculatePriceDelta, DECIMALS } from "@src/services/madfi/moneyClubs";

const RANDOM_ADDRESS = "0x1C111355EdE4259Fa9825AEC1f16f95ED737D62E"; // wont be holding bonsai nft
const PREV_TRADE_KEYS = [
  "24h",
  "6h",
  "1h",
  "5m"
];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { clubId } = req.query;

    const [{ buyPrice }, volume, club] = await Promise.all([
      getBuyPrice(RANDOM_ADDRESS, clubId as string, "1"),
      getVolume(clubId as string),
      getRegisteredClubById(clubId as string)
    ]);

    const priceDeltas = {};
    PREV_TRADE_KEYS.forEach((key) => {
      if (club[key]?.price) {
        const res = calculatePriceDelta(buyPrice, BigInt(club[key].prevPrice !== "0" ? club[key].prevPrice : club[key].price));
        priceDeltas[key] = `${res.valuePct === 0 ? '' : (res.positive ? '+' : '-')}${res.valuePct.toString()}`;
      } else {
        priceDeltas[key] = "0";
      }
    });

    const marketCap = formatUnits(BigInt(club.supply) * BigInt(buyPrice.toString()), DECIMALS).split(".")[0];
    const holders = club.holders;
    const createdAt = club.createdAt;
    const graduated = club.completed;

    const [name, symbol, image] = decodeAbiParameters([
      { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
    ], club.tokenInfo);

    // cache 15s
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate');

    return res.status(200).json({
      id: clubId,
      name,
      symbol,
      image,
      createdAt,
      buyPrice: buyPrice.toString(),
      volume24Hr: volume.toString(),
      liquidity: club.liquidity.toString(),
      marketCap: marketCap.toString(),
      holders,
      graduated,
      priceDeltas
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
