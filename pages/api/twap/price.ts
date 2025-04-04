import type { NextApiRequest, NextApiResponse } from "next";
import { getClientWithTwap } from "@src/services/mongo/client";

// Response type
type TwapResponse = {
  price: number;
  period: string;
  lastUpdated: string;
  success: boolean;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<TwapResponse>) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      price: 0,
      period: "",
      lastUpdated: "",
      error: "Method not allowed",
    });
  }

  try {
    // Connect to MongoDB
    const { collection } = await getClientWithTwap();

    // Get the 30-day TWAP data
    const twapData = await collection.findOne({ period: "30 day" });

    if (!twapData) {
      return res.status(404).json({
        success: false,
        price: 0,
        period: "30 day",
        lastUpdated: new Date().toISOString(),
        error: "TWAP data not found",
      });
    }

    // Return the TWAP price
    return res.status(200).json({
      success: true,
      price: twapData.price,
      period: twapData.period,
      lastUpdated: new Date(twapData.lastUpdated).toISOString(),
    });
  } catch (error) {
    console.error("Error fetching TWAP price:", error);
    return res.status(500).json({
      success: false,
      price: 0,
      period: "30 day",
      lastUpdated: new Date().toISOString(),
      error: "Failed to fetch TWAP price",
    });
  }
}
