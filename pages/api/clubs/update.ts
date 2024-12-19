import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { privateKeyToAccount } from "viem/accounts";
import { http, createWalletClient, PublicClient } from "viem";
import { base, baseSepolia } from "viem/chains";

import { lensClient } from "@src/services/lens/client";
import { parseJwt } from "@src/services/lens/login";
import { publicClient, IS_PRODUCTION } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { getClientWithClubs } from "@src/services/mongo/client";
import { swapExactIn } from "@src/services/uniswap/swap";
import { bToHexString } from "@src/services/lens/utils";

const swapAgentCreatorFee = async (_clubId: `0x${string}`, txHash: `0x${string}`) => {
  const client = publicClient();
  const transactionReceipt = await client.waitForTransactionReceipt({ hash: txHash });
  const event = getEventFromReceipt({
    contractAddress: LAUNCHPAD_CONTRACT_ADDRESS,
    transactionReceipt,
    abi: BonsaiLaunchpadAbi,
    eventName: "LiquidityReleased",
  });

  const { agentCreatorAmount, clubId } = event.args;
  if (bToHexString(clubId) != _clubId) return; // invalid clubId

  const account = privateKeyToAccount(process.env.AGENT_CREATOR_PRIVATE_KEY as `0x${string}`);
  const chain = IS_PRODUCTION ? base : baseSepolia;
  const wallet = createWalletClient({ account, chain, transport: http() });

  return await swapExactIn(client as PublicClient, wallet, agentCreatorAmount, chain, account);
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { txHash, strategy, identityToken, token, featureStartAt, updateRecord } = req.body;

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
