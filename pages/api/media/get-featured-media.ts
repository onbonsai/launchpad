import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithMedia } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { collection } = await getClientWithMedia();
    const records = await collection.find({ featured: true }, { postId: 1, remixContest: 1 }).toArray();

    // Sort records to put remix contest posts first
    const sortedRecords = records.sort((a, b) => {
      if (a.remixContest && !b.remixContest) return -1;
      if (!a.remixContest && b.remixContest) return 1;
      return 0;
    });

    // cache 60s
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate");

    return res.status(200).json({ 
      postIds: records.map(({ postId }) => postId),
      remixContest: records.find(record => record.remixContest)?.postId || undefined 
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
