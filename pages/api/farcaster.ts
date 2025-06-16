import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  let accountAssociation;
  let homeUrl;
  let iconUrl;
  let splashImageUrl;
  if (process.env.NEXT_PUBLIC_LAUNCHPAD_CHAIN_ID === "84532") {
    accountAssociation = {
      "header": "eyJmaWQiOjk0ODQzMSwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEVhMDUwNDliYjg5QjkwMmNCQTM3QjA1YTg4Mzk5MzExMTVDRmYxNjcifQ",
      "payload": "eyJkb21haW4iOiJ0ZXN0bmV0Lm9uYm9ucy5haSJ9",
      "signature": "MHgwZGUwM2U1MmEwYjY2MWJjOTcyMDA3MzI0YjYzNzM1YjRmOTU2MWZiODM0Y2RlMzNmOTlmOTg1MDczMTdiNmY5MDVhMDY3MmFhN2E3YmY2YjJlODRkYTJhNjkxNmY0Yzk1OTQ1NjdkYjg1M2U0NWFhYWM2YTZhYjEwZWEzNGNiNTFj"
    };
    homeUrl = "https://testnet.onbons.ai"
    splashImageUrl = "https://testnet.onbons.ai/splash.jpg";
    iconUrl = "https://app.onbons.ai/logo-spaced.png";
  } else {
    accountAssociation = {
      "header": "eyJmaWQiOjg2NDY3NCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEMzYjQ4ZkY1NmQ3QzY0YUZhMUYzMzQ1NDcwNEY1YTczMkM3NDgwNWQifQ",
      "payload": "eyJkb21haW4iOiJhcHAub25ib25zLmFpIn0",
      "signature": "MHg2ZWM3MzEyODg2NTc4YWI1YjRhYjlkMjFjMzQ2M2E3NmYxOTFlMjg5YjFlMjBjMjE0YzlkZjVmZDFjMGY4MDI3NTQ0NjViOTA5MGRiMWZjZmYzMTM1OTdjMGY3MzgxYmRlODY5ZmFkYTEzY2UxODhhZGJhMTYyMjAzNTI3YmFiYzFj"
    }
    homeUrl = "https://app.onbons.ai";
    splashImageUrl = "https://app.onbons.ai/splash.jpg";
    iconUrl = "https://testnet.onbons.ai/logo-spaced.png";
  }

  const config = {
    accountAssociation,
    "frame": {
      "version": "1",
      "name": "Bonsai",
      iconUrl,
      homeUrl,
      "buttonTitle": "Remix AI media",
      splashImageUrl,
      "splashBackgroundColor": "#000000",
      "webhookUrl": "https://api.neynar.com/f/app/8d476d5a-532d-4865-aedb-416481cf00c7/event",
      "primaryCategory": "social",
      "tags": [
        "remix",
        "smart-media",
        "ai",
        "generative-ai",
        "generative"
      ]
    }
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(config);
}