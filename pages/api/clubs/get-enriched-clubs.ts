import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithClubs, getClientWithMedia } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { clubIds, featured, tokenAddresses } = req.body;

    let clubs;
    if (featured) {
      const currentUnixTimestamp = Math.floor(Date.now() / 1000);
      const { collection } = await getClientWithClubs();
      clubs = await collection.find(
        { featureEndAt: { $exists: true, $gt: currentUnixTimestamp } },
        { projection: { _id: 0 } }
      ).toArray();
    } else {
      if (!!clubIds?.length) {
        const { collection } = await getClientWithClubs();
        clubs = await collection.find(
          { clubId: { $in: clubIds } },
          { projection: { _id: 0 } }
        ).toArray();
      } else {
        const { collection } = await getClientWithMedia();
        const posts = await collection.find(
          { "token.address": { $in: tokenAddresses } },
          { projection: { _id: 0, postId: 1, 'token.address': 1 } }
        ).toArray();

        clubs = posts.map(post => ({ ...post, strategy: "lens", tokenAddress: post.token?.address?.toLowerCase() }));
      }
    }

    return res.status(200).json({ clubs });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
