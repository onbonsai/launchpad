// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

if (!!process.env.NEXT_PUBLIC_VERCEL_ENV) {
  Sentry.init({
    dsn: "https://04796f722151ea9b1fae0d561cff9c00@o4509125817073664.ingest.us.sentry.io/4509125819039744",
    debug: false,
    ignoreErrors: [
      "Proposal expired",
      "Cannot redefine property: ethereum"
    ],
    environment: process.env.NEXT_PUBLIC_LAUNCHPAD_CHAIN_ID === "8453" ? "production" : "testnet",
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
      }),
    ],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });
} else {
  console.log("Sentry not initialized because not in vercel environment");
}