import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithStakingReferrals } from "@src/services/mongo/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { user, referrer } = req.body;

    if (!user || !referrer) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate addresses
    if (!/^0x[a-fA-F0-9]{40}$/.test(user) || !/^0x[a-fA-F0-9]{40}$/.test(referrer)) {
      return res.status(400).json({ message: "Invalid address format" });
    }
    const { collection } = await getClientWithStakingReferrals();

    // Check if this user has already been referred
    const existingReferral = await collection.findOne({ user });
    if (existingReferral) {
      return res.status(409).json({ message: "User already has a referrer" });
    }

    // Record the referral
    await collection.insertOne({
      user,
      referrer,
      timestamp: new Date(),
    });

    return res.status(200).json({ message: "Referral recorded successfully" });
  } catch (error) {
    console.error("Error recording referral:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
