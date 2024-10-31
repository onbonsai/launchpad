import { NextApiRequest, NextApiResponse } from "next";

import { addJson } from "@src/utils/storj-backend";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { json } = req.body;

    const result = await addJson(json);

    return res.status(200).json({ success: true, data: result });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
