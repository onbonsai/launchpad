import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithApiCredits } from "@src/services/mongo/client";
import { isAddress, parseAbi, formatUnits } from "viem";
import { publicClient, WGHO_CONTRACT_ADDRESS, ADMIN_WALLET } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { txHash } = req.body;
    if (!txHash || typeof txHash !== "string") {
      return res.status(400).json({ error: "Invalid transaction hash" });
    }

    const _publicClient = publicClient("lens");

    // Fetch transaction receipt
    const txReceipt = await _publicClient.getTransactionReceipt({ hash: txHash });
    if (!txReceipt || txReceipt.status !== "success") {
      return res.status(400).json({ error: "Transaction not successful or not found" });
    }

    // Parse logs for Transfer event
    const iface = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
    let found = false;
    const transferEvent = getEventFromReceipt({
      contractAddress: WGHO_CONTRACT_ADDRESS,
      transactionReceipt: txReceipt,
      abi: iface,
      eventName: "Transfer",
    });
    const { from, to, value } = transferEvent.args;
    if (from && to && value) {
      found = true;
    }
    if (!found) {
      return res.status(400).json({ error: "No valid WGHO Transfer event found in transaction" });
    }
    if (to.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
      return res.status(400).json({ error: "Transfer was not sent to admin wallet" });
    }
    if (!isAddress(from)) {
      return res.status(400).json({ error: "Invalid sender address" });
    }
    // Calculate credits: 1.25 GHO = 100 credits, so 1 GHO = 80 credits
    const credits = Math.floor(Number(formatUnits(value, 18)) * 80);
    if (!credits || credits <= 0) {
      return res.status(400).json({ error: "Invalid transfer amount" });
    }
    // Normalize the address to lowercase for consistency
    const normalizedAddress = from.toLowerCase();
    const { collection } = await getClientWithApiCredits();
    // Get user credits or create if doesn't exist
    const userCredits = await collection.findOne({ address: normalizedAddress });
    if (!userCredits) {
      // Create new user with purchased credits
      await collection.insertOne({
        address: normalizedAddress,
        totalCredits: credits,
        freeCredits: 0,
        stakingCredits: 0,
        creditsUsed: 0,
        creditsPurchased: credits,
        creditsRemaining: credits,
        lastResetTime: new Date(),
      });
    } else {
      // Update existing user's credits
      await collection.updateOne(
        { address: normalizedAddress },
        {
          $inc: {
            totalCredits: credits,
            creditsPurchased: credits,
            creditsRemaining: credits,
          },
        },
      );
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error purchasing credits:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
