import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithCreatorInfo } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { address, creatorHandle } = req.query;

  if (!(creatorHandle || address)) {
    res.status(400).json({ error: "address or creatorHandle are required" });
    return;
  }

  const { collection } = await getClientWithCreatorInfo();
  try {
    const query = address ? { address } : { creatorHandle };
    const info = await collection.findOne(query, { projection: { _id: 0 } });

    res.status(200).json({ info });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default handler;
