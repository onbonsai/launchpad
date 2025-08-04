import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithMedia } from "@src/services/mongo/client";
import verifyIdToken from "@src/services/lens/verifyIdToken";
import { ELIZA_API_URL } from "@src/services/madfi/studio";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { source, fid, address } = req.body;
  const authorization = req.headers.authorization;
  const { database } = await getClientWithMedia();
  const collection = database.collection("replikas");

  // FARCASTER: when a lens account was not created
  if (!authorization) {
    try {
      // Use upsert: insert if doesn't exist, update address if it does exist
      await collection.updateOne(
        { source, fid },
        { $set: { owner: address, source, fid } },
        { upsert: true }
      );
    } catch (error) {
      console.error("Error upserting replika:", error);
    }
    let generating = false;
    try {
      // Assuming they just approved a budget, notify any pending casts on eliza to continue
      await fetch(`${ELIZA_API_URL}/webhook/cast/pending`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.MADFI_API_KEY as string,
        },
        body: JSON.stringify({ fid }),
      });
      generating = true;
    } catch (error) {
      console.error("Failed or no pending cast on eliza")
    }
    return res.status(200).json({ generating });
  }

  const token = authorization.split(" ")[1];

  // LENS: lens account was created
  try {
    const user = await verifyIdToken(token);
    if (!user) return res.status(403).json({ error: "Invalid lens id token" });

    const owner = user.sub as `0x${string}`;
    const account = (user.act as any)?.sub as `0x${string}`;

    // Use upsert: insert if doesn't exist, update address if it does exist
    await collection.updateOne(
      { account, owner, source, fid },
      { $set: { account, owner, source, fid } },
      { upsert: true }
    );

    res.status(200).json({ message: "Creator info updated successfully" });
  } catch (error) {
    console.error("Error upserting replika:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default handler;
