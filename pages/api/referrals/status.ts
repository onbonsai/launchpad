import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithStakingReferrals } from "@src/services/mongo/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ message: "Missing address parameter" });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ message: "Invalid address format" });
    }

    const { collection } = await getClientWithStakingReferrals();

    // Check if this user has a referrer
    const referral = await collection.findOne({ user: address });

    // Check if this user has referred others
    const hasReferred = await collection.findOne({ referrer: address });

    return res.status(200).json({ 
      hasReferrer: !!referral,
      referrer: referral?.referrer || null,
      hasReferred: !!hasReferred
    });
  } catch (error) {
    console.error("Error checking referral status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
} 