import { NextApiRequest, NextApiResponse } from "next";
import { TransactionReceipt } from "viem";
import { publicClient } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { getLaunchpadAddress } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { getClientWithClubs } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let { txHash, postId, profileId, handle, chain } = req.body;
    chain = chain || "base";

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
      { $setOnInsert: { postId, profileId, handle, tokenAddress } },
      { upsert: true }
    );

    res.status(200).end();
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
};

export default handler;
