import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithCreatorInfo } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { creatorHandle, welcomePostUrl, address } = req.body;

  if (!(address && creatorHandle && welcomePostUrl)) {
    res.status(400).json({ error: "creatorHandle and address and welcomePostUrl are required" });
    return;
  }

  const { collection } = await getClientWithCreatorInfo();

  try {
    await collection.updateOne({ creatorHandle }, { $set: { welcomePostUrl, creatorHandle, address } }, { upsert: true });

    res.status(200).json({ message: "Creator info updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default handler;
