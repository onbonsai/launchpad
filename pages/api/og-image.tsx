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
    
    // Get the host from the request URL
    const host = req.headers.get('host') || 'app.onbons.ai';
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    // Use absolute URLs for all images
    const logoUrl = `${baseUrl}/favicon.png`;
    const wordMarkUrl = `${baseUrl}/bonsai-word-mark.svg`;

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
          {/* Content overlay */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '40px 60px',
              borderRadius: '12px',
              maxWidth: '80%',
              zIndex: 10,
            }}
          >
            <h1
              style={{
                fontSize: 60,
                fontWeight: 800,
                color: 'white',
                marginBottom: 20,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: 30,
                color: 'rgba(255, 255, 255, 0.8)',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              {description}
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: 30,
              }}
            >
              <img
                src={logoUrl}
                alt="Bonsai Logo"
                width={40}
                height={40}
                style={{ marginRight: 10 }}
              />
              <span
                style={{
                  fontSize: 24,
                  color: 'white',
                  fontWeight: 600,
                }}
              >
                Bonsai
              </span>
            </div>
          </div>

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
              src={wordMarkUrl}
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