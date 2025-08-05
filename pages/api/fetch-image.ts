import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch the image from the external URL
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LaunchpadBot/1.0)',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return res.status(response.status).json({
        error: 'Failed to fetch image',
        details: `${response.status} ${response.statusText}`
      });
    }

    // Get the content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'URL does not point to an image' });
    }

    // Get the image data as buffer
    const imageBuffer = await response.arrayBuffer();
    let processedBuffer = Buffer.from(imageBuffer);
    let finalContentType = contentType;

    // Convert GIFs to static images (PNG)
    if (contentType === 'image/gif') {
      try {
        // Extract the first frame of the GIF and convert to PNG
        processedBuffer = await sharp(Buffer.from(imageBuffer))
          .png()
          .toBuffer();
        finalContentType = 'image/png';
        console.log('Converted GIF to static PNG image');
      } catch (error) {
        console.error('Failed to convert GIF to static image:', error);
        // Fallback to original if conversion fails
      }
    }

    // Convert to base64 for client-side usage
    const base64 = processedBuffer.toString('base64');
    const dataUrl = `data:${finalContentType};base64,${base64}`;

    return res.status(200).json({
      imageUrl: dataUrl,
      contentType: finalContentType,
      size: processedBuffer.byteLength,
      originalContentType: contentType
    });

  } catch (error) {
    console.error('Error in image fetch API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}