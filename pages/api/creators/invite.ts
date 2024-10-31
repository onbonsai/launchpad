import { NextApiRequest, NextApiResponse } from "next";

import { sendMessage } from "@src/services/xmtp/send_dm";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { profile, handle } = req.body;

    if (!profile) {
      return res.status(400).json({ success: false });
    }

    // send message
    const success = await sendMessage(
      { address: profile.ownedBy, handle: profile.handle.fullHandle, profile_id: profile.id },
      `Hey! ${handle} on Lens is inviting you to join their Social Club on MadFi. You can join here: https://madfi.xyz/profile/${handle}`,
    );

    return res.status(200).json({ success });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
