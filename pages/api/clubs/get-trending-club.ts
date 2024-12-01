import { NextApiRequest, NextApiResponse } from "next";
import { decodeAbiParameters, formatUnits } from "viem";
import { groupBy } from "lodash/collection";

import { getLatestTrades, getRegisteredClubById, DECIMALS } from "@src/services/madfi/moneyClubs";

// super basic, the club that has the most buys in the last 100 trades
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const trades = await getLatestTrades();
    const grouped = groupBy(trades, "club.clubId");
    const trendingClubId = Object.keys(grouped).reduce((a, b) => grouped[a].length > grouped[b].length ? a : b);

    const club = await getRegisteredClubById(trendingClubId);
    const [name, symbol, image] = decodeAbiParameters([
      { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' }, { name: 'uri', type: 'string' }
    ], club.tokenInfo);
    club.marketCap = formatUnits(BigInt(club.supply) * BigInt(club.currentPrice), DECIMALS).split(".")[0];

    club.token = {
      name,
      symbol,
      image
    };

    return res.status(200).json(club);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
