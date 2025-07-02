import { NextApiRequest, NextApiResponse } from "next";
import { getAddress } from "viem";
import { getClientWithPushSubscriptions } from "@src/services/mongo/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const { subscription, userAddress } = req.body;

    // Validate request data
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "Invalid subscription data" });
    }

    if (!userAddress) {
      return res.status(400).json({ error: "Missing userAddress" });
    }

    // Validate and normalize the connected wallet address
    let normalizedUserAddress: string;
    try {
      normalizedUserAddress = getAddress(userAddress as `0x${string}`).toLowerCase();
    } catch {
      return res.status(400).json({ error: "Invalid userAddress format" });
    }

    // Store subscription in database
    const { collection } = await getClientWithPushSubscriptions();
    await collection.updateOne(
      { userAddress: normalizedUserAddress },
      {
        $set: {
          subscription,
          lastUsed: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling push subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
