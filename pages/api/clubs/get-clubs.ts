import { NextApiRequest, NextApiResponse } from "next";
import { getClubs } from "@src/services/madfi/moneyClubs";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { page } = req.query;

    const data = await getClubs(page ? parseInt(page as string) : 0);

    // cache 60s
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate');

    return res.status(200).json(data);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
