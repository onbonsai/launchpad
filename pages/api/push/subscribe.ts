import { NextApiRequest, NextApiResponse } from 'next';
import { getAddress } from 'viem';
import verifyIdToken from '@src/services/lens/verifyIdToken';
import { ELIZA_API_URL } from '@src/services/madfi/studio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.substring(7);
    let userAddress: string;
    
    try {
      const payload = await verifyIdToken(token) as any;
      if (!payload || !payload.act?.sub) {
        return res.status(401).json({ error: 'Invalid token payload' });
      }
      userAddress = getAddress(payload.act.sub as `0x${string}`);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const subscription = req.body;

    // Validate subscription object
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Forward the subscription to your backend server
    const response = await fetch(`${ELIZA_API_URL}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userAddress,
        subscription
      })
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error handling push subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 