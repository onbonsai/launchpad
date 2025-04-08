import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'Bonsai';
    const description = searchParams.get('description') || 'Smart Media';
    const imageUrl = searchParams.get('image') || 'https://app.onbons.ai/opengraph-image.jpg';
    const type = searchParams.get('type') || 'website';
    const handle = searchParams.get('handle');
    const pubId = searchParams.get('pubId');
    const tokenSymbol = searchParams.get('tokenSymbol');
    
    // Create a dynamic image based on the parameters
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#141414',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >

          {/* Bonsai Word Mark in bottom right corner */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              zIndex: 20,
            }}
          >
            <img
              src="https://launchpad-git-seo-mad-finance.vercel.app/bonsai-brand-mark.png"
              alt="Bonsai Word Mark"
              width={200}
              height={50}
            />
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
} 