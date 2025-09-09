import { NextApiRequest, NextApiResponse } from "next";
import { TransactionReceipt } from "viem";
import { publicClient } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { getLaunchpadAddress } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/Launchpad.json";
import { getClientWithClubs } from "@src/services/mongo/client";
import verifyIdToken from "@src/services/lens/verifyIdToken";
import { getProfileByAddress } from "@src/services/lens/getProfiles";
import { SITE_URL } from "@src/constants/constants";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const authorization = req.headers.authorization;
  if (!authorization) return res.status(401).json({ error: "Missing authorization header" });
  const token = authorization.split(" ")[1];

  try {
    const user = await verifyIdToken(token);
    if (!user) return res.status(403).json({ error: "Invalid lens id token" });

    const account = await getProfileByAddress((user.act as any)?.sub as `0x${string}`);
    if (!account) return res.status(400).json({ error: "Account not found "});

    let { txHash, postId, chain, tokenAddress } = req.body;
    if (!postId) return res.status(400).json({ error: "Missing postId" });
    chain = chain || "lens";
    if (!["base", "lens"].includes(chain)) return res.status(400).json({ error: "Invalid chain" });

    const { collection } = await getClientWithClubs();

    // If we have a txHash, verify it's from the launchpad and get the clubId
    if (txHash) {
      const transactionReceipt: TransactionReceipt = await publicClient(chain).waitForTransactionReceipt({ hash: txHash });
      const registeredClubEvent = getEventFromReceipt({
        contractAddress: getLaunchpadAddress("BonsaiLaunchpad", chain),
        transactionReceipt,
        abi: BonsaiLaunchpadAbi,
        eventName: "RegisteredClub",
      });
      const { clubId, tokenAddress: launchpadTokenAddress }: { clubId: bigint, tokenAddress: string } = registeredClubEvent?.args || {};
      if (!clubId) throw new Error("No registered club");

      tokenAddress = launchpadTokenAddress;

      // Update with clubId for launchpad tokens
      await collection.updateOne(
        { clubId: parseInt(clubId.toString()) },
        { $setOnInsert: { postId, handle: account?.username?.localName, tokenAddress } },
        { upsert: true }
      );
    } else {
      // For non-launchpad tokens, we need tokenAddress in the request
      if (!tokenAddress) return res.status(400).json({ error: "Missing tokenAddress for non-launchpad token" });

      // Create a document without clubId for non-launchpad tokens and define the chain
      await collection.updateOne(
        { tokenAddress, externalTokenChain: chain },
        { $setOnInsert: { postId, handle: account?.username?.localName } },
        { upsert: true }
      );
    }

    res.status(200).json({ success: true, url: `${SITE_URL}/token/${chain}/${tokenAddress}` });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
};

export default handler;
