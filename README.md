# launchpad

A token launchpad for Lens Chain and Base.

## Overview

Launchpad is a Next.js app for creating and launching tokens across Lens Chain and Base, with first‑class support for wallet connectivity, media, and social integrations.

## Tech stack

- Next.js 15, React 18, TypeScript
- Tailwind CSS
- wagmi + viem for web3
- Apollo GraphQL
- Sentry (optional)

## Quickstart

Prerequisites:

- Node.js 18.18+ (LTS recommended)
- pnpm 8+

Install and run locally:

```bash
nvm use
pnpm install
pnpm dev
```

Build and run production locally:

```bash
nvm use
pnpm build
pnpm start
```

## Scripts

- `pnpm dev`: Start the development server (Turbopack)
- `pnpm build`: Build the production bundle
- `pnpm start`: Start the production server
- `pnpm lint`: Run eslint
- `pnpm lint:fix`: Fix lint issues

## Environment variables

Create a `.env.local` in the repo root and set the variables you need. Many are optional; only set the ones required for the features you use. Reference `.env.example` for the required variables.

Notes:

- Set `NEXT_PUBLIC_LAUNCHPAD_CHAIN_ID=8453` for production (Base mainnet). Use `84532` for Base Sepolia testnet.
- Some features (e.g., media uploads, notifications) require the corresponding keys to be present.

## Deployment

This is a standard Next.js app and deploys well on Vercel. Configure the same environment variables in your hosting provider. The build command is `pnpm build` and the output is a Next.js server.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

NOTE: due to license restrictions, we cannot include the private assets (TradingView charting library and private fonts) in the repo. Instead, we fetch them at build time from the URLs specified in the environment variables.
