import { NextApiRequest, NextApiResponse } from "next";
import { TransactionReceipt } from "viem";
import { publicClient } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { getClientWithClubs } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { txHash, pubId, profileId, handle } = req.body;

    const transactionReceipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash: txHash });
    const registeredClubEvent = getEventFromReceipt({
      contractAddress: LAUNCHPAD_CONTRACT_ADDRESS,
      transactionReceipt,
      abi: BonsaiLaunchpadAbi,
      eventName: "RegisteredClub",
    });
    const { clubId }: { clubId: bigint } = registeredClubEvent.args;
    if (!clubId) throw new Error("No registered club");

    const { collection } = await getClientWithClubs();

    // only update where pubId does not exist
    await collection.updateOne(
      { clubId: parseInt(clubId.toString()), pubId: { $exists: false } },
      { $set: { pubId, profileId, handle } }
    );

    res.status(200);
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
};

export default handler;
