import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithStakingRewards } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "Missing address in query" });

    const { collection } = await getClientWithStakingRewards();

    const record = await collection.findOne({ address }, { projection: { _id: 0 } });

    return res.status(!!record ? 200 : 404).json(record);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
