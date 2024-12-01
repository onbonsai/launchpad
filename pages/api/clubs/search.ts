import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithClubs } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { query } = req.body;
    const { collection } = await getClientWithClubs();

    const searchQuery = {
      $text: {
        $search: query,
      }
    };

    const results = await collection.aggregate([
      { $match: searchQuery },
      { $project: { _id: 0, score: { $meta: "textScore" }, token: 1, handle: 1, clubId: 1 } },
      // Add a sort stage to sort by the text score
      { $sort: { score: { $meta: "textScore" } } }
    ]).toArray();

    return res.status(200).json({ results });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
