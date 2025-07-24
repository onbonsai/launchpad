import { NextApiRequest, NextApiResponse } from 'next';
import { getPost } from '@src/services/lens/posts';
import { fetchTokenMetadata } from '@src/utils/tokenMetadata';
import { ELIZA_API_URL } from '@src/services/madfi/studio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postId, prompt, frameSelection, animateImage } = req.body;
    const authHeader = req.headers.authorization;

    if (!postId || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: postId and prompt' });
    }

    // Get the original post data
    const post = await getPost({ postId });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Extract media from post
    const metadata = post.metadata as any;
    let imageUrl: string | undefined;
    let videoUrl: string | undefined;
    let isVideo = false;

    // Check for video
    if (metadata?.video?.item) {
      videoUrl = metadata.video.item;
      isVideo = true;
    } else if (metadata?.image?.item) {
      imageUrl = metadata.image.item;
    }

    // Extract smart media data if available
    const smartMedia = (metadata as any)?.attributes?.find(
      (attr: any) => attr.key === 'smartmedia'
    )?.value;

    let templateData: any = {};
    if (smartMedia) {
      try {
        const parsed = JSON.parse(smartMedia);
        templateData = parsed.templateData || {};
      } catch (e) {
        console.error('Failed to parse smart media:', e);
      }
    }

    // Prepare the remix request
    let remixImageUrl = imageUrl;

    // If it's a video and we need to extract a frame
    if (isVideo && videoUrl) {
      const extractFrameResponse = await fetch(`${ELIZA_API_URL}/video/extract-frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          framePosition: frameSelection || 'start', // 'start' or 'end'
        }),
      });

      if (!extractFrameResponse.ok) {
        throw new Error('Failed to extract frame from video');
      }

      const frameData = await extractFrameResponse.json();
      remixImageUrl = frameData.imageUrl;
    }

    if (!remixImageUrl) {
      return res.status(400).json({ error: 'No media found in post to remix' });
    }

    // Call the remix endpoint
    const remixResponse = await fetch(`${ELIZA_API_URL}/remix/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify({
        imageUrl: remixImageUrl,
        prompt,
        originalTemplateData: templateData,
        aspectRatio: templateData.aspectRatio || '9:16',
        animateImage: !isVideo && animateImage, // Only animate if source is an image
      }),
    });

    if (!remixResponse.ok) {
      const error = await remixResponse.json();
      return res.status(remixResponse.status).json(error);
    }

    const result = await remixResponse.json();

    // Format the response
    return res.status(200).json({
      preview: {
        image: animateImage ? undefined : result.imageUrl,
        video: animateImage ? result.videoUrl || result.video : undefined,
        text: prompt,
        templateData: {
          prompt,
          ...result.templateData,
        },
        agentId: result.agentId,
        agentMessageId: result.agentMessageId,
      },
    });

  } catch (error) {
    console.error('Error in remix API:', error);
    return res.status(500).json({ 
      error: 'Failed to generate remix',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 