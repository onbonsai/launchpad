import { NextApiRequest, NextApiResponse } from "next";
import { decodeAbiParameters, formatUnits } from "viem";
import { groupBy } from "lodash/collection";

import { getLatestTrades, getRegisteredClubById, DECIMALS } from "@src/services/madfi/moneyClubs";
import { getClientWithClubs } from "@src/services/mongo/client";

// super basic, the club that has the most buys in the last 100 trades
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  let { chain } = req.query;
  if (!chain) chain = "lens";
  if (chain !== "base" && chain !== "lens") return res.status(400).json("chain must be base or lens");

  try {
    const trades = await getLatestTrades();
    const grouped = groupBy(trades, "club.clubId");
    const trendingClubId = Object.keys(grouped).reduce((a, b) => (grouped[a].length > grouped[b].length ? a : b));

    const [club, enriched] = await Promise.all([
      getRegisteredClubById(trendingClubId),
      (async () => {
        const { collection } = await getClientWithClubs();

        const club = await collection
          .find({ clubId: parseInt(trendingClubId) }, { projection: { _id: 0 } })
          .limit(1)
          .next();

        return {
          creatorStrategy: club.strategy,
          creatorPostId: club.postId || club.pubId,
          creatorHandle: club.handle,
          creatorProfileId: club.profileId,
        };
      })(),
    ]);

    let { name, symbol, uri: image } = club;

    if (!club.name || !club.symbol || !club.uri) {
      // backup for v1 clubs
      [name, symbol, image] = decodeAbiParameters(
        [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "uri", type: "string" },
        ],
        club.tokenInfo,
      );
    }
    club.marketCap = formatUnits(BigInt(club.supply) * BigInt(club.currentPrice), DECIMALS).split(".")[0];

    club.token = {
      name,
      symbol,
      image,
    };

    // cache 60s
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate");

    return res.status(200).json({ ...club, ...enriched });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
