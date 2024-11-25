import { NextApiRequest, NextApiResponse } from "next";
import { formatUnits, parseUnits } from "viem";

import { getVolume, getLiquidity, getRegisteredClubById, getBuyPrice, calculatePriceDelta, DECIMALS } from "@src/services/madfi/moneyClubs";

const RANDOM_ADDRESS = "0x1C111355EdE4259Fa9825AEC1f16f95ED737D62E"; // wont be holding bonsai nft
const PREV_TRADE_KEYS = [
  "prevTrade24Hr",
  "prevTrade24Hr6Hr",
  "prevTrade24Hr1Hr",
  "prevTrade24Hr5min"
];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { clubId } = req.query;

    const [{ buyPrice }, volume, liquidity, club] = await Promise.all([
      getBuyPrice(RANDOM_ADDRESS, clubId as string, "1000000"),
      getVolume(clubId as string),
      getLiquidity(clubId as string),
      getRegisteredClubById(clubId as string)
    ]);

    const priceDeltas = {};
    PREV_TRADE_KEYS.forEach((key) => {
      if (club[key]) {
        const res = calculatePriceDelta(buyPrice, BigInt(club[key].price));
        priceDeltas[key] = res.positive ? res.valuePct.toString() : `-${res.valuePct.toString()}`;
      }
    });

    const marketCap = (BigInt(formatUnits(club.supply, DECIMALS)) * BigInt(buyPrice.toString())).toString();
    const holders = club.holders;
    const createdAt = club.createdAt;
    const graduated = club.completed;

    return res.status(200).json({
      createdAt,
      buyPrice: buyPrice.toString(),
      volume24Hr: volume.toString(),
      liquidity: liquidity.toString(),
      marketCap,
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
