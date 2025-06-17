import { NextApiRequest, NextApiResponse } from 'next';
import { cacheVideoStorj } from '../../../src/utils/storj-backend';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Set larger size limit for videos
    },
  },
};

const getContentTypeFromBase64 = (base64String: string): string => {
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return 'video/mp4'; // Default to mp4 if we can't determine
  }
  return matches[1];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoData, id, bucket } = req.body;

    if (!videoData || !id || !bucket) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: videoData, id, or bucket' 
      });
    }

    // Get content type from base64 string
    const contentType = getContentTypeFromBase64(videoData);

    // Convert base64 video data to buffer
    const buffer = Buffer.from(videoData.replace(/^data:video\/\w+;base64,/, ''), 'base64');

    const result = await cacheVideoStorj({ id, buffer, bucket, contentType });
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error caching video:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
} 