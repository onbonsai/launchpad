// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://04796f722151ea9b1fae0d561cff9c00@o4509125817073664.ingest.us.sentry.io/4509125819039744",

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // https://github.com/reown-com/appkit/blob/887e27c9ab0e5a746096ba45b10bcb6c70ab6ea2/apps/demo/sentry.client.config.ts#L15
  ignoreErrors: [
    "Proposal expired",
    "Cannot redefine property: ethereum"
  ],
});
