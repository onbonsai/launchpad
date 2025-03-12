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
        dailyAllocation: FREE_TIER_CREDIT_ALLOCATION,
        creditsUsed: 0,
        lastResetTimestamp: now,
      });

      return res.status(200).json({
        totalCredits: FREE_TIER_CREDIT_ALLOCATION,
        creditsUsed: 0,
        creditsRemaining: FREE_TIER_CREDIT_ALLOCATION,
        nextResetTime: null,
        usagePercentage: 0,
      });
    }

    // Return existing user's credit information
    const creditsRemaining = userCredits.dailyAllocation - (userCredits.creditsUsed || 0);
    const usagePercentage = ((userCredits.creditsUsed || 0) / userCredits.dailyAllocation) * 100;

    return res.status(200).json({
      totalCredits: userCredits.dailyAllocation,
      creditsUsed: userCredits.creditsUsed || 0,
      creditsRemaining,
      nextResetTime: null,
      usagePercentage,
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
