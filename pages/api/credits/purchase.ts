import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithApiCredits } from "@src/services/mongo/client";
import { isAddress, parseAbi, formatUnits } from "viem";
import {
  publicClient,
  WGHO_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
} from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { transferTx, chain, price, fid } = req.body;

    if (chain !== "lens" && chain !== "base") {
      return res.status(400).json({ error: "Invalid chain" });
    }

    if (!transferTx || !transferTx.txHash) {
      return res.status(400).json({ error: "Invalid transfer transaction data" });
    }

    const { txHash, creditsAmount, user } = transferTx;

    let credits;
    let normalizedAddress;

    // Handle batched transactions differently
    if (txHash === "batched") {
      // For batched transactions, use the provided credits amount and user address
      if (!creditsAmount || !user) {
        return res.status(400).json({ error: "Credits amount and user address required for batched transactions" });
      }

      if (!isAddress(user)) {
        return res.status(400).json({ error: "Invalid user address" });
      }

      credits = parseInt(creditsAmount);
      if (!credits || credits <= 0) {
        return res.status(400).json({ error: "Invalid credits amount" });
      }

      normalizedAddress = user.toLowerCase();
      console.log(`Processing batched transaction for user ${normalizedAddress} with ${credits} credits`);
    } else {
      // Original flow for regular transactions
      if (!txHash || typeof txHash !== "string") {
        return res.status(400).json({ error: "Invalid transaction hash" });
      }

      const _publicClient = publicClient(chain);

      // Fetch transaction receipt
      const txReceipt = await _publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (!txReceipt || txReceipt.status !== "success") {
        return res.status(400).json({ error: "Transaction not successful or not found" });
      }

      // Parse logs for Transfer event
      const iface = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
      const transferEvent = getEventFromReceipt({
        contractAddress: chain === "base" ? USDC_CONTRACT_ADDRESS : WGHO_CONTRACT_ADDRESS,
        transactionReceipt: txReceipt,
        abi: iface,
        eventName: "Transfer",
      });

      const { from, to, value } = transferEvent.args;
      if (!from || !to || !value) {
        return res.status(400).json({ error: "Invalid transfer event data" });
      }

      if (to.toLowerCase() !== PROTOCOL_DEPLOYMENT[chain].RevenueSplitter.toLowerCase()) {
        return res.status(400).json({ error: "Transfer was not sent to RevenueSplitter" });
      }

      if (!isAddress(from)) {
        return res.status(400).json({ error: "Invalid sender address" });
      }

      // Calculate credits - use provided price if available, otherwise use dynamic pricing
      if (price && typeof price === "number" && price > 0) {
        // Use the provided price override (credits per dollar)
        const decimals = chain === "base" ? USDC_DECIMALS : 18;
        const amountPaid = Number(formatUnits(value, decimals));
        credits = Math.floor(amountPaid * price);
      } else {
        // Calculate credits based on the amount paid with dynamic pricing
        const decimals = chain === "base" ? USDC_DECIMALS : 18;
        const amountPaid = Number(formatUnits(value, decimals));

        // Dynamic pricing:
        // - Less than $35: 1.5 cents per credit
        // - $35 or greater: 1.25 cents per credit
        // Then subtract 1 cent from the total price
        const adjustedAmount = amountPaid + 0.01; // Add back the 1 cent that was subtracted

        let creditsPerDollar;
        if (adjustedAmount < 35) {
          creditsPerDollar = 100 / 1.5; // 1.5 cents per credit = 66.67 credits per dollar
        } else {
          creditsPerDollar = 100 / 1.25; // 1.25 cents per credit = 80 credits per dollar
        }

        credits = Math.floor(adjustedAmount * creditsPerDollar);
      }

      if (!credits || credits <= 0) {
        return res.status(400).json({ error: "Invalid transfer amount" });
      }

      // Normalize the address to lowercase for consistency
      normalizedAddress = from.toLowerCase();
    }
    const normalizedFid = fid ? fid.toString() : undefined;
    const { collection } = await getClientWithApiCredits();

    credits += 2; // add 2 credits for free to ensure good experience

    // Get user credits or create if doesn't exist
    const userCredits = await collection.findOne(fid ? { fid: normalizedFid } : { address: normalizedAddress });
    if (!userCredits) {
      // Create new user with purchased credits
      await collection.insertOne({
        fid: fid ? normalizedFid : undefined,
        address: fid ? normalizedFid : normalizedAddress, // using fid to be able to query in eliza
        normalizedAddress, // for backwards compat
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
        fid ? { fid: normalizedFid } : { address: normalizedAddress },
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
