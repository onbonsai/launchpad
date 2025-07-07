import { NextApiRequest, NextApiResponse } from 'next';
import { createTikTokService } from '@src/services/tiktok';
import { getClientWithIntegrations } from '@src/services/mongo/client';
import { SITE_URL } from '@src/constants/constants';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, userAddress } = req.body;

  if (!code || !userAddress) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Create TikTok service instance
    const tikTokService = createTikTokService({
      clientKey: process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY!,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
      redirectUri: `${SITE_URL}/studio/integrations`,
      sandboxMode: process.env.TIKTOK_SANDBOX_MODE === 'true'
    });

    // Exchange code for tokens
    const tokenData = await tikTokService.getTokenFromCode(code);

    // Get user info from TikTok
    const userInfo = await tikTokService.getUserInfo();

    // Connect to MongoDB
    const { collection } = await getClientWithIntegrations();

    // Store integration data
    const integrationData: Integration = {
      type: 'tiktok',
      userAddress: userAddress.toLowerCase(),
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      openId: tokenData.openId || '',
      username: userInfo.data.user.username,
      displayName: userInfo.data.user.display_name,
      scopes: ['user.info.basic', 'user.info.profile', 'user.info.stats', 'video.upload', 'video.publish'],
      connectedAt: new Date(),
      updatedAt: new Date()
    };

    // Upsert the integration (update if exists, insert if new)
    await collection.replaceOne(
      { userAddress: userAddress.toLowerCase(), type: 'tiktok' },
      integrationData,
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      integration: {
        connected: true,
        username: userInfo.data.user.username,
        displayName: userInfo.data.user.display_name,
        scopes: integrationData.scopes,
        connectedAt: integrationData.connectedAt
      }
    });

    } catch (error) {
    console.error('TikTok integration error:', error);
    res.status(500).json({
      error: 'Failed to connect TikTok account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}