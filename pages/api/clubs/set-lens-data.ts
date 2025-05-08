import { NextApiRequest, NextApiResponse } from "next";
import { TransactionReceipt } from "viem";
import { publicClient } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { getLaunchpadAddress } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
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

    const account = await getProfileByAddress(user.act.sub as `0x${string}`);
    if (!account) return res.status(400).json({ error: "Account not found "});

    let { txHash, postId, chain } = req.body;
    if (!txHash || !postId) return res.status(400).json({ error: "Missing txHash or postId" });
    chain = chain || "lens";
    if (!["base", "lens"].includes(chain)) return res.status(400).json({ error: "Invalid chain" });

    const transactionReceipt: TransactionReceipt = await publicClient(chain).waitForTransactionReceipt({ hash: txHash });
    const registeredClubEvent = getEventFromReceipt({
      contractAddress: getLaunchpadAddress("BonsaiLaunchpad", 0, chain),
      transactionReceipt,
      abi: BonsaiLaunchpadAbi,
      eventName: "RegisteredClub",
    });
    const { clubId , tokenAddress}: { clubId: bigint, tokenAddress } = registeredClubEvent?.args || {};
    if (!clubId) throw new Error("No registered club");

    const { collection } = await getClientWithClubs();

    // link the token to a post and creator, for display purposes on the bonsai app
    await collection.updateOne(
      { clubId: parseInt(clubId.toString()) },
      { $setOnInsert: { postId, handle: account?.username?.localName, tokenAddress } },
      { upsert: true }
    );

    res.status(200).json({ success: true, url: `${SITE_URL}/token/${chain}/${tokenAddress}` });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
};

export default handler;
