import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";

import { sendMessage } from "@src/services/xmtp/send_dm";
import { getClientWithBounties } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { recipients, bountyId, newInvites, newInviteSingle } = req.body;

    if (!recipients) {
      return res.status(400).json({ success: false });
    }

    const message = `You've been invited to bid on this bounty! Check it out here: https://creators.madfinance.xyz/bounties/${bountyId}`;

    // send messages
    for (const recipient of recipients) {
      const success = await sendMessage(
        { address: recipient.ownedBy, handle: recipient.handle, profile_id: recipient.id },
        message,
      );
      recipient.success = success;
    }

    // update failed messages
    if (!newInvites || newInviteSingle) {
      const { collection } = await getClientWithBounties();
      const objectId = new ObjectId(bountyId);

      if (newInviteSingle) {
        if (recipients[0].success) {
          // only save it if successful
          try {
            await collection.updateOne({ _id: objectId }, { $push: { invites: recipients[0] } });
          } catch (error) {
            console.log(error);
          }
        }
      } else {
        await collection.updateOne({ _id: objectId }, { $set: { invites: recipients } });
      }
    }

    return res.status(200).json({ recipients });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
