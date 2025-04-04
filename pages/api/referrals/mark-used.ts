import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithStakingReferrals } from "@src/services/mongo/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ message: "Missing address" });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ message: "Invalid address format" });
    }

    const { collection } = await getClientWithStakingReferrals();

    // Update the referral to mark it as used
    await collection.updateOne(
      { user: address },
      { $set: { firstPostUsed: true } }
    );

    return res.status(200).json({ message: "Referral marked as used" });
  } catch (error) {
    console.error("Error marking referral as used:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
} 