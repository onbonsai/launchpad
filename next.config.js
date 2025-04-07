/** @type {import('next').NextConfig} */

const defaultExports = {
  webpack: (config, options) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };

    return config;
  },
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@lens-protocol", "@madfi", "@farcaster/frame-sdk"],
  experimental: {
    esmExternals: true,
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
  // async redirects() {
  //   return [
  //     {
  //       source: '/',
  //       destination: '/studio/stake',
  //       permanent: false,
  //     },
  //   ];
  // },
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
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
      "nft-cdn.alchemy.com"
    ].map((domain) => ({
      protocol: "https",
      hostname: domain,
      port: "",
      pathname: "/**",
    })),
  },
  // async headers() {
  //   return [
  //     {
  //       source: "/(.*)",
  //       headers: [
  //         {
  //           key: "Content-Security-Policy",
  //           value: "script-src 'self' https://pay.coinbase.com 'unsafe-eval'; object-src 'none';"
  //         }
  //       ]
  //     }
  //   ];
  // }
};

module.exports = defaultExports;
