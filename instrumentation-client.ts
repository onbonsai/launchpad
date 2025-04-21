// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
if (!!process.env.NEXT_RUNTIME) {

  Sentry.init({
    dsn: "https://04796f722151ea9b1fae0d561cff9c00@o4509125817073664.ingest.us.sentry.io/4509125819039744",

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
} else {
  console.log("Sentry not initialized because NEXT_RUNTIME is not set");
}