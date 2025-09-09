import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  let accountAssociation;
  let homeUrl;
  if (process.env.NEXT_PUBLIC_LAUNCHPAD_CHAIN_ID === "84532") {
    accountAssociation = {
      "header": "eyJmaWQiOjg2NDY3NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEMzYjQ4ZkY1NmQ3QzY0YUZhMUYzMzQ1NDcwNEY1YTczMkM3NDgwNWQifQ",
      "payload": "eyJkb21haW4iOiJ0ZXN0bmV0Lm9uYm9ucy5haSJ9",
      "signature": "MHhiMjlkYzA4ZmQ1OGYzOTI3NjY2MzEzMjY1ZGJmMTg2YmJiOGM5ZmM2ZmZmYWVmYjUyOTgyN2VjM2JmYmE2NGZlNWI1NDcyNWFkNTFkNThkY2Y5NzkwMjlmYThmZGVjZjI2MmQ4NDBiN2U5NWFhNTI4MWEzYWE2NmZlZTk2YzIwMDFj"
    };
    homeUrl = "https://testnet.onbons.ai"
  } else {
    accountAssociation = {
      "header": "eyJmaWQiOjg2NDY3NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEMzYjQ4ZkY1NmQ3QzY0YUZhMUYzMzQ1NDcwNEY1YTczMkM3NDgwNWQifQ",
      "payload": "eyJkb21haW4iOiJhcHAub25ib25zLmFpIn0",
      "signature": "MHg2ZWM3MzEyODg2NTc4YWI1YjRhYjlkMjFjMzQ2M2E3NmYxOTFlMjg5YjFlMjBjMjE0YzlkZjVmZDFjMGY4MDI3NTQ0NjViOTA5MGRiMWZjZmYzMTM1OTdjMGY3MzgxYmRlODY5ZmFkYTEzY2UxODhhZGJhMTYyMjAzNTI3YmFiYzFj"
    }
    homeUrl = "https://launch.onbons.ai";
  }

  const config = {
    accountAssociation,
    "frame": {
      "version": "1",
      "name": "Bonsai",
      "subtitle": "Create & monetize AI media",
      "description": "Create, remix, and trade viral ai media. When others remix your media, they must swap into your content coin to generate.",
      "screenshotUrls": [],
      "primaryCategory": "entertainment",
      "iconUrl": "https://launch.onbons.ai/logo-spaced.png",
      homeUrl,
      "buttonTitle": "Remix AI media",
      "heroImageUrl": "https://launch.onbons.ai/frame-hero.jpg",
      "splashImageUrl": "https://launch.onbons.ai/splash.jpg",
      "splashBackgroundColor": "#000000",
      "webhookUrl": "https://api.neynar.com/f/app/8d476d5a-532d-4865-aedb-416481cf00c7/event",
      "tags": [
        "remix",
        "genai",
        "ai",
        "slop",
        "generative"
      ],
      "ogTitle": "Bonsai - Remix AI Media",
      "ogDescription": "Create, remix, and trade viral ai media",
      "ogImageUrl": "https://launch.onbons.ai/frame-hero.jpg"
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(config);
}