import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithApiCredits } from "@src/services/mongo/client";
import { FREE_TIER_CREDITS } from "@src/services/madfi/stakingCalculator";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const address = req.query.address as string;
    const isMiniApp = req.query.isMiniApp === "true";
    const fid = req.query.fid;
    if (!address) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Normalize the address to lowercase for consistency
    const normalizedAddress = address.toLowerCase();
    const normalizedFid = fid?.toString();

    const { collection } = await getClientWithApiCredits();

    // Get user credits or create if doesn't exist
    const userCredits = isMiniApp && !!fid
      ? await collection.findOne({ fid: normalizedFid })
      : await collection.findOne({ $or: [{ address: normalizedAddress }, { normalizedAddress: normalizedAddress }] });

    if (!userCredits) {
      // New user - create with initial allocation
      const now = new Date();

      await collection.insertOne({
        fid: fid ? normalizedFid : undefined,
        address: fid ? normalizedFid: normalizedAddress, // using fid to be able to query in eliza
        normalizedAddress, // for backwards compat
        totalCredits: FREE_TIER_CREDITS,
        freeCredits: FREE_TIER_CREDITS,
        stakingCredits: 0,
        creditsUsed: 0,
        creditsRemaining: FREE_TIER_CREDITS,
        lastResetTime: now,
        creditsPurchased: isMiniApp ? 100 : 0,
        postUpdates: [],
      });

      return res.status(200).json({
        totalCredits: FREE_TIER_CREDITS,
        freeCredits: FREE_TIER_CREDITS,
        stakingCredits: 0,
        creditsUsed: 0,
        creditsRemaining: FREE_TIER_CREDITS,
        lastResetTime: now.toISOString(),
        creditsPurchased: isMiniApp ? 100 : 0,
        postUpdates: [],
      });
    }

    // Return existing user's credit information with all the new fields
    const creditsRemaining = userCredits.creditsRemaining || userCredits.totalCredits - (userCredits.creditsUsed || 0);

    return res.status(200).json({
      totalCredits: userCredits.totalCredits,
      freeCredits: userCredits.freeCredits || FREE_TIER_CREDITS,
      stakingCredits: userCredits.stakingCredits || 0,
      creditsUsed: userCredits.creditsUsed || 0,
      creditsRemaining: creditsRemaining,
      lastResetTime: new Date(userCredits.lastResetTime).toISOString(),
      creditsPurchased: userCredits.creditsPurchased || 0,
      postUpdates: userCredits.postUpdates || [],
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
