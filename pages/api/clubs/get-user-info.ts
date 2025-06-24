import { NextApiRequest, NextApiResponse } from "next";
import { getHoldings, getTrader, getRegisteredClubsByCreator } from "@src/services/madfi/moneyClubs";
import { getProfilesByOwners } from "@src/services/lens/getProfiles";
import { groupBy } from "lodash/collection";
import { roundedToFixed } from "@src/utils/utils";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { address } = req.query;

    if (!address || typeof address !== "string") {
      return res.status(400).json({ error: "Address is required" });
    }

    const chains: ("base" | "lens")[] = ["base", "lens"];
    const now = Math.floor(Date.now() / 1000);
    const fourMonthsAgo = now - (4 * 30 * 24 * 60 * 60);

    // Parallelize data fetching for both chains
    const chainDataPromises = chains.map(async (chain) => {
      const [holdingsResponse, buyTrades, sellTrades, createdClubs] = await Promise.all([
        getHoldings(address as `0x${string}`, 0, chain),
        getTrader({ id: address as `0x${string}`, isBuy: true, createdAt_gt: fourMonthsAgo }, chain),
        getTrader({ id: address as `0x${string}`, isBuy: false, createdAt_gt: fourMonthsAgo }, chain),
        getRegisteredClubsByCreator(address as `0x${string}`, chain)
      ]);

      const holdings = holdingsResponse.holdings || [];
      const balance = holdings.reduce((total, holding) => total + holding.balance, 0);
      const trades = [...(buyTrades?.trades || []), ...(sellTrades?.trades || [])];
      const clubs = createdClubs?.map(club => ({ clubId: club.clubId, tokenAddress: club.tokenAddress })) || [];

      return {
        chain,
        balance,
        holdings,
        trades,
        createdClubs: clubs
      };
    });

    // Wait for all chain data to be fetched
    const chainDataResults = await Promise.all(chainDataPromises);

    // Merge results
    const mergedBalance = chainDataResults.reduce((total, chainData) => total + chainData.balance, 0);
    const mergedHoldings = chainDataResults.flatMap(chainData => chainData.holdings);
    const mergedTrades = chainDataResults
      .flatMap(chainData => chainData.trades)
      .sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt));
    const mergedCreatedClubs = chainDataResults.flatMap(chainData => chainData.createdClubs);

    // cache 60s
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate');

    return res.status(200).json({
      balance: Number(mergedBalance.toFixed(2)),
      holdings: mergedHoldings,
      trades: mergedTrades,
      createdClubs: mergedCreatedClubs
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;