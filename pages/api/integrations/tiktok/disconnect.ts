import { NextApiRequest, NextApiResponse } from 'next';
import { getClientWithIntegrations } from '@src/services/mongo/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userAddress } = req.body;

  if (!userAddress) {
    return res.status(400).json({ error: 'User address is required' });
  }

  try {
    // Connect to MongoDB
    const { collection } = await getClientWithIntegrations();

    // Remove the integration
    const result = await collection.deleteOne({
      userAddress: userAddress.toLowerCase(),
      type: 'tiktok'
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'TikTok integration not found' });
    }

    res.status(200).json({
      success: true,
      message: 'TikTok integration disconnected successfully'
    });

  } catch (error) {
    console.error('TikTok disconnect error:', error);
    res.status(500).json({
      error: 'Failed to disconnect TikTok integration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}