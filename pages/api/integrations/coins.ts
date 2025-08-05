import { NextApiRequest, NextApiResponse } from 'next';
import { fetchTopCoins } from '@src/services/farcaster/tbd';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { coins } = await fetchTopCoins();

    // Set cache-control header for 1 hour (3600 seconds)
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=3600');

    res.status(200).json(coins);
  } catch (error) {
    res.status(500).end();
  }
}