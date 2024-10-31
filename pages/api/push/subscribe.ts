import { NextApiRequest, NextApiResponse } from "next";
import { getAddress, parseEther, erc20Abi, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getClientWithPushSubscriptions } from "@src/services/mongo/client";
import { PROTOCOL_DEPLOYMENT, getChain } from "@src/services/madfi/utils";

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

    const { subscription, userAddress, lensAddress } = req.body;

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

    // Validate and normalize the lens address if provided
    let normalizedLensAddress: `0x${string}` | undefined;
    if (lensAddress) {
      try {
        normalizedLensAddress = getAddress(lensAddress as `0x${string}`).toLowerCase() as `0x${string}`;
      } catch {
        return res.status(400).json({ error: "Invalid lensAddress format" });
      }
    }

    // Check if there's already an entry with either the user address or lens address
    const { collection } = await getClientWithPushSubscriptions();
    const existingEntry = await collection.findOne({
      $or: [
        { userAddress: normalizedUserAddress },
        ...(normalizedLensAddress ? [{ lensAddress: normalizedLensAddress }] : [])
      ]
    });

    const isNewUser = !existingEntry;

    // Store subscription in database
    await collection.updateOne(
      { userAddress: normalizedUserAddress, lensAddress: normalizedLensAddress },
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

    // If this is a new user and we have a lens address, send 1000 BONSAI tokens
    if (isNewUser && normalizedLensAddress && process.env.OWNER_PRIVATE_KEY) {
      try {
        const account = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`);
        const walletClient = createWalletClient({ 
          account, 
          chain: getChain("lens"), 
          transport: http() 
        });

        const amount = parseEther("1000");

        const hash = await walletClient.writeContract({
          address: PROTOCOL_DEPLOYMENT.lens.Bonsai,
          abi: erc20Abi,
          functionName: "transfer",
          args: [normalizedLensAddress, amount],
          chain: getChain("lens"),
        });

        console.log(`Sent 1000 BONSAI tokens to new user ${normalizedLensAddress}, tx: ${hash}`);
        
        res.status(200).json({ success: true, bonusTokensSent: true });
      } catch (tokenError) {
        console.error("Error sending bonus tokens:", tokenError);
        // Don't fail the subscription creation if token sending fails
        res.status(200).json({ success: true, bonusTokensSent: false });
      }
    } else {
      res.status(200).json({ success: true, bonusTokensSent: false });
    }
  } catch (error) {
    console.error("Error handling push subscription:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
