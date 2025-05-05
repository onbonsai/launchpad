import { NextApiRequest, NextApiResponse } from "next";
import { getHoldings, getTrader, getRegisteredClubsByCreator } from "@src/services/madfi/moneyClubs";
import { getProfilesByOwners } from "@src/services/lens/getProfiles";
import { groupBy } from "lodash/collection";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { address, chain = "lens" } = req.query;

    if (!address || typeof address !== "string") {
      return res.status(400).json({ error: "Address is required" });
    }

    // Get holdings
    const holdingsResponse = await getHoldings(address as `0x${string}`, 0, chain as "base" | "lens");
    const holdings = holdingsResponse.holdings || [];

    // Get trades
    const now = Math.floor(Date.now() / 1000);
    const fourMonthsAgo = now - (4 * 30 * 24 * 60 * 60);
    const buyTrades = await getTrader({ id: address as `0x${string}`, isBuy: true, createdAt_gt: fourMonthsAgo }, chain as "base" | "lens");
    const sellTrades = await getTrader({ id: address as `0x${string}`, isBuy: false, createdAt_gt: fourMonthsAgo }, chain as "base" | "lens");

    // Get created clubs
    let createdClubs = await getRegisteredClubsByCreator(address as `0x${string}`, chain as "base" | "lens");
    createdClubs = createdClubs?.map(club => ({ clubId: club.clubId, tokenAddress: club.tokenAddress })) || [];

    const enrichedTrades = [...(buyTrades?.trades || []), ...(sellTrades?.trades || [])]
      .sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt));

    // cache 60s
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate');

    return res.status(200).json({
      holdings,
      trades: enrichedTrades,
      createdClubs
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;