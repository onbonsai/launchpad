import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const url = req.query.url as string;

  if (!url) {
    return res.status(400).json({ message: 'URL parameter is required' });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const svgContent = await response.text();
    // Remove style tags to prevent animation performance issues
    const stripped = svgContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    // Set proper content type for SVG
    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(stripped);
  } catch (error) {
    console.error('Error fetching SVG:', error);
    res.status(500).json({ message: 'Failed to fetch SVG' });
  }
}