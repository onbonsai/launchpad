import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithHookSubmissions } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { name, description, address, sourceUrl, telegramUsername, additionalInfo } = req.body;

    const { collection } = await getClientWithHookSubmissions();

    await collection.insertOne({ name, description, address, sourceUrl, telegramUsername, additionalInfo });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: true });
  }
};

export default handler;
