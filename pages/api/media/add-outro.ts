import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb', // Allow large video files
    },
  },
};


const OUTRO_URLS = {
  landscape: 'https://link.storjshare.io/raw/jxerucjisvr44nn6mstamnkn7zra/videos/outro-16x9.mp4', // 1364 x 768
  portrait: 'https://link.storjshare.io/raw/jwbcaopoewafxcocbfa23h7srpta/videos/outro-9x16.mp4' // 768 x 1364
};

const OUTRO_URLS_720 = {
  landscape: 'https://link.storjshare.io/raw/jwsmds4guwditngyg3ybrbxahnla/videos/outro-16x9-720.mp4', // 1280 x 720
  portrait: 'https://link.storjshare.io/raw/ju5b5ku7xdow7zvfyw3almkohmdq/videos/outro-9x16-720.mp4' // 720 x 1280
};

const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

// Get video resolution
function getVideoResolution(videoPath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height',
      '-of', 'csv=s=x:p=0',
      videoPath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString().trim();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0 || !output) {
        reject(new Error('Failed to get video resolution'));
        return;
      }

      const [width, height] = output.split('x').map(Number);
      if (!width || !height) {
        reject(new Error('Invalid video resolution data'));
        return;
      }

      resolve({ width, height });
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`FFprobe process error: ${error.message}`));
    });
  });
}

// Extract thumbnail at 1 second mark
function extractThumbnail(videoPath: string, thumbnailPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-ss', '1', // Seek to 1 second
      '-vframes', '1', // Extract 1 frame
      '-q:v', '2', // High quality JPEG
      thumbnailPath,
      '-y'
    ]);

    let errorOutput = '';
    
    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error('Thumbnail extraction error:', errorOutput);
        reject(new Error(`Failed to extract thumbnail: ${code}`));
        return;
      }
      resolve();
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg thumbnail error: ${error.message}`));
    });
  });
}

// Add thumbnail metadata to video (not all players respect this, but it helps)
function addThumbnailMetadata(videoPath: string, thumbnailPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tempPath = videoPath.replace('.mp4', '_with_thumb.mp4');
    
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-i', thumbnailPath,
      '-map', '0',
      '-map', '1',
      '-c', 'copy',
      '-disposition:v:1', 'attached_pic',
      tempPath,
      '-y'
    ]);

    let errorOutput = '';
    
    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error('Add thumbnail metadata error:', errorOutput);
        // Not critical if this fails, just continue
        resolve();
        return;
      }
      
      // Replace original with thumbnail version
      try {
        fs.renameSync(tempPath, videoPath);
      } catch (error) {
        console.error('Failed to replace video with thumbnail version:', error);
      }
      
      resolve();
    });

    ffmpeg.on('error', (error) => {
      console.error('FFmpeg thumbnail metadata error:', error);
      // Not critical if this fails
      resolve();
    });
  });
}

function concatenateVideos(inputPath: string, outroPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Simple concatenation with keyframe at 1 second for thumbnail
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-i', outroPath,
      '-filter_complex',
      '[0:v][1:v]concat=n=2:v=1:a=0[outv]',
      '-map', '[outv]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      // Force keyframes at specific times (0s and 1s)
      '-force_key_frames', 'expr:gte(t,n_forced*1)',
      // Optimize for streaming and set poster at 1s
      '-movflags', '+faststart',
      outputPath,
      '-y'
    ]);

    let errorOutput = '';
    
    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('FFmpeg:', data.toString());
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error('FFmpeg error output:', errorOutput);
        reject(new Error(`FFmpeg exited with code ${code}`));
        return;
      }
      resolve();
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg process error: ${error.message}`));
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoUrl, filename = 'video.mp4', aspectRatio, isBlob = false } = req.body;

  if (!videoUrl || !aspectRatio) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sessionId = uuidv4();
  const inputPath = path.join(TEMP_DIR, `input_${sessionId}.mp4`);
  const outroPath = path.join(TEMP_DIR, `outro_${sessionId}.mp4`);
  const outputPath = path.join(TEMP_DIR, `output_${sessionId}.mp4`);
  const thumbnailPath = path.join(TEMP_DIR, `thumb_${sessionId}.jpg`);
  
  const tempFiles = [inputPath, outroPath, outputPath, thumbnailPath];

  try {
    console.log('Downloading input video...');
    
    if (isBlob && videoUrl.startsWith('data:')) {
      // Handle blob data URL
      const base64Data = videoUrl.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid data URL format');
      }
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(inputPath, buffer);
    } else {
      // Handle regular URL
      await downloadFile(videoUrl, inputPath);
    }

    console.log(`Using provided aspect ratio: ${aspectRatio}`);
    
    // Get input video resolution to choose the right outro
    console.log('Detecting video resolution...');
    const resolution = await getVideoResolution(inputPath);
    console.log(`Input video resolution: ${resolution.width}x${resolution.height}`);
    
    // Choose the right outro URL set based on resolution
    let outroUrls;
    if (resolution.height === 720 || resolution.height === 1280) {
      // 720p videos: 1280x720 (landscape) or 720x1280 (portrait)
      outroUrls = OUTRO_URLS_720;
      console.log('Using 720p outro videos');
    } else {
      // 768p videos: 1364x768 (landscape) or 768x1364 (portrait) 
      outroUrls = OUTRO_URLS;
      console.log('Using 768p outro videos');
    }
    
    console.log('Downloading outro...');
    // Use the actual video aspect ratio instead of the passed one
    const actualAspectRatio = resolution.width / resolution.height;
    const outroUrl = actualAspectRatio > 1 ? outroUrls.landscape : outroUrls.portrait;
    console.log(`Video is ${actualAspectRatio > 1 ? 'landscape' : 'portrait'} (${actualAspectRatio.toFixed(2)}), using ${actualAspectRatio > 1 ? 'landscape' : 'portrait'} outro`);
    await downloadFile(outroUrl, outroPath);

    console.log('Processing video...');
    
    // First, extract thumbnail from 1 second mark of input video
    await extractThumbnail(inputPath, thumbnailPath);
    
    // Then concatenate videos
    await concatenateVideos(inputPath, outroPath, outputPath);
    
    // Finally, add the thumbnail as metadata
    await addThumbnailMetadata(outputPath, thumbnailPath);

    console.log('Video processing complete, sending response...');

    // Read the processed video and send as response
    const processedVideo = fs.readFileSync(outputPath);
    
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', processedVideo.length.toString());
    
    res.status(200).send(processedVideo);

  } catch (error) {
    console.error('Video processing error:', error);
    res.status(500).json({ 
      error: 'Video processing failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  } finally {
    // Cleanup temp files
    tempFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (err) {
        console.error(`Failed to cleanup temp file ${file}:`, err);
      }
    });
  }
} 