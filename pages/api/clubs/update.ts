import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { privateKeyToAccount } from "viem/accounts";
import { http, createWalletClient, PublicClient } from "viem";
import { base, baseSepolia } from "viem/chains";

import { lensClient } from "@src/services/lens/client";
import { parseJwt } from "@src/services/lens/login";
import { publicClient } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { getLaunchpadAddress, IS_PRODUCTION, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/Launchpad.json";
import { getClientWithClubs } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let { txHash, strategy, identityToken, token, featureEndAt, updateRecord, handle: _handle, chain } = req.body;
    chain = chain || "lens";

    if (updateRecord) {
      const { id, postId, liquidityReleasedTxHash, clubId } = updateRecord;
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
        await collection.updateOne({ _id: new ObjectId(id) }, { $set: { postId } });
      }

      return res.status(200).end();
    }

    let profileId: any;
    let handle: any;
    if (strategy === "lens" && identityToken) {
      const { id } = parseJwt(identityToken);
      if (!id) return res.status(403).end();
      profileId = id;

      const profile = await (lensClient as any).profile.fetch({ forProfileId: profileId });
      handle = profile?.handle?.localName;
    } else {
      handle = _handle;
    }

    const client = publicClient(chain);
    const transactionReceipt = await client.waitForTransactionReceipt({ hash: txHash });
    const registeredClubEvent = getEventFromReceipt({
      contractAddress: getLaunchpadAddress("BonsaiLaunchpad", chain),
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
