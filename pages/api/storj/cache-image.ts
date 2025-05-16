import { NextApiRequest, NextApiResponse } from 'next';
import { cacheImageStorj } from '../../../src/utils/storj-backend';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Set appropriate size limit for your images
    },
  },
};

const getContentTypeFromBase64 = (base64String: string): string => {
  console.log(base64String.slice(0, 100));
  const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return 'image/png'; // Default to png if we can't determine
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
    const { imageData, id, bucket } = req.body;

    if (!imageData || !id || !bucket) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: imageData, id, or bucket' 
      });
    }

    // Get content type from base64 string
    const contentType = getContentTypeFromBase64(imageData);

    // Convert base64 image data to buffer
    const buffer = Buffer.from(imageData.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    const result = await cacheImageStorj({ id, buffer, bucket, contentType });
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error caching image:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
}
