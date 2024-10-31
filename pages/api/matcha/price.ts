import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { base } from "viem/chains";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { chainId, sellToken, buyToken, sellAmount, taker } = req.body;

  console.log("matcha price", req.body);

  if (!chainId || !sellToken || !buyToken || !sellAmount) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const apiKey = process.env.MATCHA_API_KEY;
    if (!apiKey) {
      throw new Error("MATCHA_API_KEY is not configured");
    }

    // Construct the API URL with chainId as a query parameter
    const baseUrl = `https://api.0x.org/swap/permit2/price`;

    const params = new URLSearchParams({
      chainId: chainId.toString(),
      sellToken,
      buyToken,
      sellAmount,
      ...(taker && { taker }),
      swapFeeRecipient: PROTOCOL_DEPLOYMENT[chainId === base.id ? "base" : "lens"].RevenueSplitter,
      swapFeeBps: "10", // 0.1% = 10 basis points
      swapFeeToken: sellToken, // Collect fee in sell token
    });

    const response = await axios.get(`${baseUrl}?${params}`, {
      headers: {
        "0x-api-key": apiKey,
        "0x-version": "v2",
      },
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error("Error fetching price from Matcha:", error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      error: error?.response?.data?.reason || error.message || "Failed to fetch price",
    });
  }
}
