import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithMedia } from "@src/services/mongo/client";
import verifyIdToken from "@src/services/lens/verifyIdToken";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { source, fid, address } = req.body;
  const authorization = req.headers.authorization;
  const { database } = await getClientWithMedia();
  const collection = database.collection("replikas");

  // when a lens account was not created
  if (!authorization) {
    try {
      await collection.insertOne({ owner: address, source, fid });
    } catch {} // unique: true
    return res.status(200).end();
  }

  const token = authorization.split(" ")[1];

  try {
    const user = await verifyIdToken(token);
    if (!user) return res.status(403).json({ error: "Invalid lens id token" });

    const owner = user.sub as `0x${string}`;
    const account = (user.act as any)?.sub as `0x${string}`;

    await collection.insertOne({ account, owner, source, fid });

    res.status(200).json({ message: "Creator info updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default handler;
