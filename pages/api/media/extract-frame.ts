import { ELIZA_API_URL } from '@src/services/madfi/studio';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl, framePosition = 'start' } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Call the Eliza API for frame extraction
    const response = await fetch(`${ELIZA_API_URL}/video/extract-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl,
        framePosition, // 'start' or 'end'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Frame extraction failed:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to extract frame from video',
        details: errorText 
      });
    }

    const result = await response.json();
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error in frame extraction API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}