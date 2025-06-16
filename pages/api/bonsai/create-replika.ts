import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithMedia } from "@src/services/mongo/client";
import verifyIdToken from "@src/services/lens/verifyIdToken";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { source, fid } = req.body;
  const authorization = req.headers.authorization;
  if (!authorization) return res.status(401).json({ error: "Missing authorization header" });
  const token = authorization.split(" ")[1];

  const { database } = await getClientWithMedia();
  const collection = database.collection("replikas");

  try {
    const user = await verifyIdToken(token);
    if (!user) return res.status(403).json({ error: "Invalid lens id token" });

    const owner = user.sub as `0x${string}`;
    const account = user.act.sub as `0x${string}`;

    await collection.insertOne({ account, owner, source, fid });

    res.status(200).json({ message: "Creator info updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default handler;
