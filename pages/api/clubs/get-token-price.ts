import { NextApiRequest, NextApiResponse } from "next";

const BIRDEYE_API_URL = "https://public-api.birdeye.so";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { tokenAddress } = req.query;

    const response = await fetch(`${BIRDEYE_API_URL}/defi/price?address=${tokenAddress}`, {
      method: 'GET',
      headers: {
        'x-chain': 'base',
        'X-API-KEY': process.env.BIRDEYE_API_KEY!
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch token price');
    }

    const { data } = (await response.json());
    const tokenPrice = data?.value;

    if (tokenPrice === undefined) {
      throw new Error('Token price not found');
    }

    // cache 15s
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate');

    return res.status(200).json({ tokenPrice });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
