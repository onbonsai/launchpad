import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithApiCredits } from "@src/services/mongo/client";

const DAILY_CREDIT_ALLOCATION = 100;

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
    
    // Get or create user credits
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const userCredits = await collection.findOne({ address: normalizedAddress });
    
    if (!userCredits || userCredits.lastResetTimestamp < startOfDay) {
      // Either new user or needs reset
      await collection.updateOne(
        { address: normalizedAddress },
        {
          $set: {
            dailyAllocation: DAILY_CREDIT_ALLOCATION,
            creditsUsed: 0,
            lastResetTimestamp: now
          }
        },
        { upsert: true }
      );
      
      return res.status(200).json({
        totalCredits: DAILY_CREDIT_ALLOCATION,
        creditsUsed: 0,
        creditsRemaining: DAILY_CREDIT_ALLOCATION,
        nextResetTime: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        usagePercentage: 0
      });
    }

    const creditsRemaining = DAILY_CREDIT_ALLOCATION - (userCredits.creditsUsed || 0);
    const usagePercentage = ((userCredits.creditsUsed || 0) / DAILY_CREDIT_ALLOCATION) * 100;

    return res.status(200).json({
      totalCredits: DAILY_CREDIT_ALLOCATION,
      creditsUsed: userCredits.creditsUsed || 0,
      creditsRemaining,
      nextResetTime: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      usagePercentage
    });

  } catch (error) {
    console.error("Error fetching credits:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
} 