import { NextApiRequest, NextApiResponse } from 'next';
import { cacheVideoStorj } from '../../../src/utils/storj-backend';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle multipart/form-data
  },
};

const parseForm = (req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseForm(req);

    const id = Array.isArray(fields.id) ? fields.id[0] : fields.id;
    const bucket = Array.isArray(fields.bucket) ? fields.bucket[0] : fields.bucket;
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;

    if (!videoFile || !id || !bucket) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: video file, id, or bucket'
      });
    }

    // Read the video file into a buffer
    const buffer = fs.readFileSync(videoFile.filepath);
    const contentType = videoFile.mimetype || 'video/mp4';

    const result = await cacheVideoStorj({ id, buffer, bucket, contentType });

    // Clean up the temporary file
    fs.unlinkSync(videoFile.filepath);

    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error caching video:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}