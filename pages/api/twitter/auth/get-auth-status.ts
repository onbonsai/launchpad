import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithTwitter } from "@src/services/mongo/client";
import { getUserProfilePhotoUrl } from "@src/services/twitter/getProfile";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { address } = req.query;

    const { collection } = await getClientWithTwitter();

    const twitterStatus = await collection.findOne({ address });

    if (!twitterStatus) {
      return res.status(200).json({ authorized: false });
    }
    const avatar_url = await getUserProfilePhotoUrl(twitterStatus);

    if (!avatar_url) {
      return res.status(200).json({ authorized: false });
    }

    return res.status(200).json({ authorized: true, handle: twitterStatus.screen_name, avatar_url });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: true });
  }
};

export default handler;
