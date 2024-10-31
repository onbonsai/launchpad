import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";

import { sendMessage } from "@src/services/xmtp/send_dm";
import { getClientWithBounties } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { recipient, bountyId } = req.body;

    if (!recipient) {
      return res.status(400).json({ success: false });
    }

    const message = `You've been invited to bid on a private MadFi Bounty! Check it out here: https://creators.madfinance.xyz/bounties/${bountyId}`;

    // send message
    const success = await sendMessage(
      { address: recipient.ownedBy, handle: recipient.handle, profile_id: recipient.id },
      message,
    );
    recipient.success = success;

    // update failed messages
    if (success) {
      const { collection } = await getClientWithBounties();
      const objectId = new ObjectId(bountyId);
      await collection.updateOne(
        { _id: objectId },
        { $set: { "invites.$[elem].success": success } },
        { arrayFilters: [{ "elem.id": recipient.id }] },
      );
    }

    return res.status(200).json({ success });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
