import { NextApiRequest, NextApiResponse } from 'next';
import { getClientWithIntegrations } from '@src/services/mongo/client';

interface Integration {
  type: string;
  userAddress: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  openId: string;
  username?: string;
  displayName?: string;
  scopes: string[];
  connectedAt: Date;
  updatedAt: Date;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userAddress } = req.query;

  if (!userAddress || typeof userAddress !== 'string') {
    return res.status(400).json({ error: 'User address is required' });
  }

  try {
    // Connect to MongoDB
    const { collection } = await getClientWithIntegrations();

    // Find user's TikTok integration
    const integration = await collection.findOne({
      userAddress: userAddress.toLowerCase(),
      type: 'tiktok'
    });

    if (!integration) {
      return res.status(200).json({
        connected: false,
        integration: null
      });
    }

    // Check if token is expired
    const isExpired = Date.now() >= integration.expiresAt;

    res.status(200).json({
      connected: true,
      integration: {
        username: integration.username,
        displayName: integration.displayName,
        scopes: integration.scopes,
        connectedAt: integration.connectedAt,
        isExpired: isExpired
      }
    });

  } catch (error) {
    console.error('TikTok status check error:', error);
    res.status(500).json({
      error: 'Failed to check TikTok integration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}