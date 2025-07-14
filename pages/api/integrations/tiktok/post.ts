import { NextApiRequest, NextApiResponse } from 'next';
import { getClientWithIntegrations } from '@src/services/mongo/client';

interface TikTokIntegration {
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

  const { userAddress, videoUrl, title, description } = req.body;

  if (!userAddress || !videoUrl || !title) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Get user's TikTok integration from database
    const { collection } = await getClientWithIntegrations();
    const integration = await collection.findOne({
      userAddress: userAddress.toLowerCase(),
      type: 'tiktok'
    }) as TikTokIntegration | null;

    if (!integration) {
      return res.status(404).json({ error: 'TikTok integration not found' });
    }

    // Check if token is expired
    if (Date.now() >= integration.expiresAt) {
      return res.status(401).json({ error: 'TikTok token expired' });
    }



    // Fetch the video file from the URL for direct upload
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to fetch video from URL');
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoSize = videoBuffer.byteLength;

    // For TikTok API, if video is small enough, send as single chunk
    // Otherwise use 10MB chunks as recommended
    const maxChunkSize = 10 * 1024 * 1024; // 10MB
    const chunkSize = videoSize <= maxChunkSize ? videoSize : maxChunkSize;
    const totalChunks = Math.ceil(videoSize / chunkSize);

    // Step 1: Initialize direct upload with TikTok
    const requestBody = {
      post_info: {
        title: title.substring(0, 150),
        description: description ? description.substring(0, 2200) : undefined,
        privacy_level: process.env.TIKTOK_SANDBOX_MODE === 'true' ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunks,
      },
        };

    const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const initData = await initResponse.json();

    if (!initResponse.ok || initData.error.code !== 'ok') {
      console.error('TikTok init error:', initData);
      throw new Error(initData.error.message || 'Failed to initialize TikTok upload');
    }

    const { publish_id, upload_url } = initData.data;

    // Step 2: Upload video file to TikTok (in chunks if necessary)
    if (totalChunks === 1) {
      // Single chunk upload
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
          'Content-Type': 'video/mp4',
        },
        body: videoBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload video to TikTok');
      }
    } else {
      // Multi-chunk upload
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize - 1, videoSize - 1);
        const chunk = videoBuffer.slice(start, end + 1);

        const uploadResponse = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${start}-${end}/${videoSize}`,
            'Content-Type': 'video/mp4',
          },
          body: chunk,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks} to TikTok`);
        }
      }
    }

    // Step 3: Check upload status
    let statusAttempts = 0;
    const maxStatusAttempts = 30; // Wait up to 5 minutes
    let postStatus = 'PROCESSING_UPLOAD';
    let videoId = null;

    while (statusAttempts < maxStatusAttempts && postStatus === 'PROCESSING_UPLOAD') {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

      const statusResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publish_id: publish_id,
        }),
      });

      const statusData = await statusResponse.json();
      if (statusResponse.ok && statusData.error.code === 'ok') {
        postStatus = statusData.data.status;
        if (statusData.data.publicly_available_post_id && statusData.data.publicly_available_post_id.length > 0) {
          videoId = statusData.data.publicly_available_post_id[0];
        }
      }

      statusAttempts++;
    }

    const result = {
      publishId: publish_id,
      videoId: videoId,
      status: postStatus,
      videoUrl: videoId ? `https://www.tiktok.com/@${integration.username}/video/${videoId}` : null,
      username: integration.username,
      sandboxMode: process.env.TIKTOK_SANDBOX_MODE === 'true'
    };

    res.status(200).json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('TikTok video posting error:', error);
    res.status(500).json({
      error: 'Failed to post video to TikTok',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}