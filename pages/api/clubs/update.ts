import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { privateKeyToAccount } from "viem/accounts";
import { http, createWalletClient, PublicClient } from "viem";
import { base, baseSepolia } from "viem/chains";

import { lensClient } from "@src/services/lens/client";
import { parseJwt } from "@src/services/lens/login";
import { publicClient } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { IS_PRODUCTION, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { getClientWithClubs } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let { txHash, strategy, identityToken, token, featureEndAt, updateRecord, handle: _handle, chain } = req.body;
    chain = chain || "base";

    if (updateRecord) {
      const { id, pubId, liquidityReleasedTxHash, clubId } = updateRecord;
      const { collection } = await getClientWithClubs();

      if (liquidityReleasedTxHash) {
        // NOTE: no agent swap required
        // const club = await collection.findOne({ clubId });
        // if (!club || club.agentSwapTxHash != undefined)
        //   return res.status(400).json({ error: "no club or liquidity released event already processed" });
        // const agentSwapTxHash = await swapAgentCreatorFee(clubId, liquidityReleasedTxHash);
        // if (!agentSwapTxHash) return res.status(500).json({ error: "failed to swap" });
        // await collection.updateOne({ clubId }, { $set: { agentSwapTxHash } });
      } else {
        await collection.updateOne({ _id: new ObjectId(id) }, { $set: { pubId } });
      }

      return res.status(200).end();
    }

    let profileId;
    let handle;
    if (strategy === "lens" && identityToken) {
      const { id } = parseJwt(identityToken);
      if (!id) return res.status(403).end();
      profileId = id;

      const profile = await lensClient.profile.fetch({ forProfileId: profileId });
      handle = profile?.handle?.localName;
    } else {
      handle = _handle;
    }

    const client = publicClient();
    const transactionReceipt = await client.waitForTransactionReceipt({ hash: txHash });
    const registeredClubEvent = getEventFromReceipt({
      contractAddress: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
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
      featureEndAt
    });

    res.status(200).json({ id: result.insertedId.toString() });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
};

export default handler;
