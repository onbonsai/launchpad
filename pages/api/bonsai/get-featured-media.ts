import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithMedia } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { collection } = await getClientWithMedia();
    const records = await collection.find({ featured: true }, { postId: 1 }).toArray();

    // cache 60s
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate");

    return res.status(200).json({ postIds: records.map(({ postId}) => postId ) });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
