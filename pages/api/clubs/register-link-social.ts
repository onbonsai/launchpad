import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";

import { lensClient } from "@src/services/lens/client";
import { parseJwt } from "@src/services/lens/login";
import { publicClient } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { getClientWithClubs } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { txHash, strategy, identityToken, token, featureStartAt, updateRecord } = req.body;

    if (updateRecord) {
      const { id, pubId } = updateRecord;
      const { collection } = await getClientWithClubs();
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { pubId } }
      );

      return res.status(200).end();
    }

    let profileId;
    let handle;
    if (strategy === "lens") {
      const { id } = parseJwt(identityToken);
      if (!id) return res.status(403).end();
      profileId = id;

      const profile = await lensClient.profile.fetch({ forProfileId: profileId });
      handle = profile?.handle?.localName;
    }

    const client = publicClient();
    const transactionReceipt = await client.waitForTransactionReceipt({ hash: txHash });
    const registeredClubEvent = getEventFromReceipt({
      contractAddress: LAUNCHPAD_CONTRACT_ADDRESS,
      transactionReceipt,
      abi: BonsaiLaunchpadAbi,
      eventName: "RegisteredClub",
    });

    const { clubId } = registeredClubEvent.args;
    const { collection } = await getClientWithClubs();

    const result = await collection.insertOne({
      clubId,
      profileId,
      strategy,
      handle,
      token,
      featureStartAt
    });

    res.status(200).json({ id: result.insertedId.toString() });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
};

export default handler;
