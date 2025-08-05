import { NextApiRequest, NextApiResponse } from 'next';
import { fetchTopCoins } from '@src/services/farcaster/tbd';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { coins } = await fetchTopCoins();

    // Set cache-control header for 12 hours (43200 seconds)
    res.setHeader('Cache-Control', 'public, max-age=43200, stale-while-revalidate=43200');

    res.status(200).json(coins);
  } catch (error) {
    res.status(500).end();
  }
}