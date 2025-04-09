import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithApiCredits } from "@src/services/mongo/client";

const FREE_TIER_CREDIT_ALLOCATION = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const address = req.query.address as string;
    if (!address) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Normalize the address to lowercase for consistency
    const normalizedAddress = address.toLowerCase();

    const { collection } = await getClientWithApiCredits();

    // Get user credits or create if doesn't exist
    const userCredits = await collection.findOne({ address: normalizedAddress });

    if (!userCredits) {
      // New user - create with initial allocation
      const now = new Date();

      await collection.insertOne({
        address: normalizedAddress,
        totalCredits: FREE_TIER_CREDIT_ALLOCATION,
        freeCredits: FREE_TIER_CREDIT_ALLOCATION,
        stakingCredits: 0,
        creditsUsed: 0,
        creditsRemaining: FREE_TIER_CREDIT_ALLOCATION,
        lastResetTime: now,
      });

      return res.status(200).json({
        totalCredits: FREE_TIER_CREDIT_ALLOCATION,
        freeCredits: FREE_TIER_CREDIT_ALLOCATION,
        stakingCredits: 0,
        creditsUsed: 0,
        creditsRemaining: FREE_TIER_CREDIT_ALLOCATION,
        lastResetTime: now.toISOString(),
      });
    }

    // Return existing user's credit information with all the new fields
    const creditsRemaining = userCredits.creditsRemaining || userCredits.totalCredits - (userCredits.creditsUsed || 0);

    return res.status(200).json({
      totalCredits: userCredits.totalCredits,
      freeCredits: userCredits.freeCredits || FREE_TIER_CREDIT_ALLOCATION,
      stakingCredits: userCredits.stakingCredits || 0,
      creditsUsed: userCredits.creditsUsed || 0,
      creditsRemaining: creditsRemaining,
      lastResetTime: new Date(userCredits.lastResetTime).toISOString(),
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Helper function to calculate the next midnight UTC
function getNextMidnightUTC() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return tomorrow;
}
