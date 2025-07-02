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

    const { userAddress } = req.body;

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

    // Remove subscription from database
    const { collection } = await getClientWithPushSubscriptions();
    await collection.deleteOne({ userAddress: normalizedUserAddress });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling push unsubscribe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
