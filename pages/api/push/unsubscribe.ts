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
    
    // Verify the token for authentication
    try {
      const payload = await verifyIdToken(token) as any;
      if (!payload || !payload.act?.sub) {
        return res.status(401).json({ error: 'Invalid token payload' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({ error: 'Missing userAddress' });
    }

    // Validate and normalize the connected wallet address
    let normalizedUserAddress: string;
    try {
      normalizedUserAddress = getAddress(userAddress as `0x${string}`);
    } catch {
      return res.status(400).json({ error: 'Invalid userAddress format' });
    }

    // Forward the unsubscribe request to your backend server
    const response = await fetch(`${ELIZA_API_URL}/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userAddress: normalizedUserAddress
      })
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const result = await response.json();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error handling push unsubscribe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 