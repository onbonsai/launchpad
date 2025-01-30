import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithClubs } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { clubIds, featured } = req.body;
    const { collection } = await getClientWithClubs();

    let clubs;
    if (featured) {
      const currentUnixTimestamp = Math.floor(Date.now() / 1000);
      clubs = await collection.find(
        { featureEndAt: { $exists: true, $gt: currentUnixTimestamp } },
        { projection: { _id: 0 } }
      ).toArray();
    } else {
      clubs = await collection.find(
        { clubId: { $in: clubIds } },
        { projection: { _id: 0 } }
      ).toArray();
    }

    return res.status(200).json({ clubs });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
