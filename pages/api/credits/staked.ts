import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithApiCredits } from "@src/services/mongo/client";
import { isAddress } from "viem";
import { lens } from "@src/services/madfi/utils";
import { createPublicClient, http } from "viem";

const lensPublicClient = createPublicClient({
  chain: lens,
  transport: http(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { txHash, address, estimatedCredits } = req.body;

    if (!txHash || typeof txHash !== "string") {
      return res.status(400).json({ error: "Invalid transaction hash" });
    }

    if (!address || !isAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    if (!estimatedCredits || typeof estimatedCredits !== "number" || estimatedCredits <= 0) {
      return res.status(400).json({ error: "Invalid estimated credits" });
    }

    // Fetch transaction receipt to verify it was successful
    const txReceipt = await lensPublicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!txReceipt || txReceipt.status !== "success") {
      return res.status(400).json({ error: "Transaction not successful or not found" });
    }

    // Verify the transaction is from the provided address
    const transaction = await lensPublicClient.getTransaction({ hash: txHash as `0x${string}` });
    if (transaction.from.toLowerCase() !== address.toLowerCase()) {
      return res.status(400).json({ error: "Transaction sender does not match provided address" });
    }

    // Normalize the address to lowercase for consistency
    const normalizedAddress = address.toLowerCase();
    const { collection } = await getClientWithApiCredits();

    // Get user credits or create if doesn't exist
    const userCredits = await collection.findOne({ address: normalizedAddress });
    if (!userCredits) {
      // Create new user with staking credits
      await collection.insertOne({
        address: normalizedAddress,
        totalCredits: estimatedCredits,
        freeCredits: 0,
        stakingCredits: estimatedCredits,
        creditsUsed: 0,
        creditsPurchased: 0,
        creditsRemaining: estimatedCredits,
        lastResetTime: new Date(),
      });
    } else {
      // Update existing user's credits
      await collection.updateOne(
        { address: normalizedAddress },
        {
          $inc: {
            totalCredits: estimatedCredits,
            stakingCredits: estimatedCredits,
            creditsRemaining: estimatedCredits,
          },
        },
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating staking credits:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
