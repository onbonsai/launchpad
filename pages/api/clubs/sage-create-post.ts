import { NextApiRequest, NextApiResponse } from "next";
import { privateKeyToAccount } from "viem/accounts";
import { TransactionReceipt } from "viem";
import { publicClient } from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { createPostMomokaWithAccount } from "@src/services/lens/createPost";
import { storjGatewayURL } from "@src/utils/storj";
import { getProfileById } from "@src/services/lens/getProfiles";
import { lensClient } from "@src/services/lens/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { txHash, postIpfsHash } = req.body;

    const transactionReceipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash: txHash });
    const registeredClubEvent = getEventFromReceipt({
      contractAddress: LAUNCHPAD_CONTRACT_ADDRESS,
      transactionReceipt,
      abi: BonsaiLaunchpadAbi,
      eventName: "RegisteredClub",
    });
    const { clubId } = registeredClubEvent.args;
    if (!clubId) throw new Error("No registered club");

    const account = privateKeyToAccount(process.env.SAGE_EVM_PRIVATE_KEY as `0x${string}`);
    const profile = await getProfileById(process.env.SAGE_LENS_PROFILE_ID as `0x${string}`);
    const { id, text } = await lensClient.authentication.generateChallenge({
      signedBy: account.address,
      for: profile!.id,
    });
    const signature = await account.signMessage({ message: text });
    await lensClient.authentication.authenticate({ id, signature });
    const broadcastResult = await createPostMomokaWithAccount(
      account,
      storjGatewayURL(`ipfs://${postIpfsHash}`),
      profile,
    );

    let pubId;
    if (broadcastResult) {
      pubId = typeof broadcastResult === "string"
        ? broadcastResult
        : broadcastResult.id || broadcastResult.txHash || `${profile?.id}-${broadcastResult?.toString(16)}`;
    }

    res.status(200).json({ pubId });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
};

export default handler;
