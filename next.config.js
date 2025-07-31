/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        module: false,
        path: false,
      };
    }

    // Additional CSS optimization in production
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.(css|scss|sass)$/,
        chunks: 'all',
        enforce: true,
      };
    }

    return config;
  },
  reactStrictMode: true,
  // CSS optimization in production
  productionBrowserSourceMaps: false,
  // compiler: {
  //   removeConsole: process.env.NODE_ENV === 'production',
  // },
  // Compress responses
  compress: true,
  transpilePackages: ["@lens-protocol", "@farcaster/miniapp-sdk"],
  async rewrites() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: '/api/farcaster',
      },
    ];
  },
  experimental: {
    esmExternals: true,
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: [
      '@emotion/css',
      '@emotion/styled',
      '@apollo/client',
      '@ensdomains/ensjs',
      '@farcaster/miniapp-sdk',
      '@farcaster/miniapp-wagmi-connector',
      '@lens-chain/sdk',
      '@lens-chain/storage-client',
      '@lens-protocol/client',
      '@lens-protocol/gated-content',
      '@lens-protocol/metadata',
      '@sentry/nextjs',
      '@tailwindcss/forms',
      '@tanstack/react-query',
      '@vercel/analytics',
      '@vercel/og',
      '@wagmi/chains',
      'react-confetti-explosion',
      'react-datepicker',
      'react-dropzone',
      'react-fast-marquee',
      'react-hot-toast',
      'react-hotkeys-hook',
      'react-intersection-observer',
      'react-masonry-css',
      'react-responsive',
      'react-select',
      'react-use-cookie',
      'react-window',
      'framer-motion',
      'thirdweb',
      'tss-react',
      'use-debounce',
      'wagmi',
      '@wavesurfer/react',
      'wavesurfer.js',
      "date-fns",
      "aws-sdk",
    ]
  },
  i18n: {
    locales: ['en-US', 'zh-CN'],
    defaultLocale: 'en-US',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/.well-known/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/opengraph-image.jpg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/splash.jpg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/og-image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*.jpg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Service Worker headers - Allow everything
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Disable CSP entirely - allow everything
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src * data: blob:; media-src * data: blob:; object-src *; child-src *; frame-src * blob: data:; worker-src * blob: data:; form-action *; frame-ancestors *;"
          }
        ],
      },
    ];
  },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      "arweave.net",
      "api.grove.storage",
      "media.firefly.land",
      "lh3.googleusercontent.com",
      "img.seadn.io",
      "ipfs.infura.io",
      "ipfs.io",
      "madfinance.mypinata.cloud",
      "placeimg.com",
      "ik.imagekit.io",
      "www.storj-ipfs.com",
      "link.storjshare.io",
      "lens.infura-ipfs.io",
      "gateway.storjshare.io",
      "pbs.twimg.com",
      "cdn.stamp.fyi",
      "oaidalleapiprodscus.blob.core.windows.net",
      "statics-polygon-lens.s3.*.amazonaws.com",
      "gw.ipfs-lens.dev",
      "nft-cdn.alchemy.com",
      "ipfs.4everland.io",
      "imagedelivery.net",
      "wrpcd.net",
      "raw.seadn.io",
      "pink-splendid-urial-219.mypinata.cloud",
      "storage.googleapis.com",
      "app.onbons.ai",
      "onbonsai.mypinata.cloud",
      "token-media.defined.fi",
      "imagedelivery.net",
      "picsum.photos",
    ].map((domain) => ({
      protocol: "https",
      hostname: domain,
      port: "",
      pathname: "/**",
    })),
  },
  env: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
};

const sentryWebpackPluginOptions = {
  org: "bonsai-labs-ek",
  project: "sentry-launchpad",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
};

// Make sure to add the following to your deployment environment variables:
// SENTRY_AUTH_TOKEN

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
