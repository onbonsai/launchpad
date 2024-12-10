import { NextApiRequest, NextApiResponse } from "next";
import { getClubs } from "@src/services/madfi/moneyClubs";

// super basic, the club that has the most buys in the last 100 trades
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { page } = req.query;

    const data = await getClubs(page ? parseInt(page as string) : 0);

    return res.status(200).json(data);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
