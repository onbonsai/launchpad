import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithMedia } from "@src/services/mongo/client";
import verifyIdToken from "@src/services/lens/verifyIdToken";
import { SET_FEATURED_ADMINS } from "@src/services/madfi/studio";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return
  }

  let { postId, featured } = req.body;
  if (!(!!postId)) {
    res.status(400).json({ message: "Missing postId or featured" });
    return;
  }

  const authorization = req.headers.authorization;
  if (!authorization){
    res.status(401).json({ error: "Missing authorization header" });
    return;
  }
  const token = authorization.split(" ")[1];

  try {
    const user = await verifyIdToken(token);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    };

    const address = (user.sub as `0x${string}`).toLowerCase();
    if (!SET_FEATURED_ADMINS.includes(address)) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const { collection } = await getClientWithMedia();

    if (featured === undefined) {
      const record = await collection.findOne({ postId });
      featured = record.featured === undefined ? true : !record.featured;
      await collection.updateOne(
        { postId },
        { $set: { featured } }
      );
    } else {
      await collection.updateOne(
        { postId },
        { $set: { featured } }
      );
    }

    res.status(200).end();
  } catch (error) {
    console.error("Error setting featured:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}