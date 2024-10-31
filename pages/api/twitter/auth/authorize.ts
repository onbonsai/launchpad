import crypto from "crypto";

import OAuth from "oauth-1.0a";
import { NextApiRequest, NextApiResponse } from "next";

const requestTokenURL = "https://api.twitter.com/oauth/request_token?oauth_callback=oob&x_auth_access_type=write";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const oauth = new OAuth({
    consumer: {
      key: process.env.TWITTER_API_KEY!,
      secret: process.env.TWITTER_API_SECRET_KEY!,
    },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto.createHmac("sha1", key).update(base_string).digest("base64");
    },
  });

  const authHeader = oauth.toHeader(
    oauth.authorize({
      url: requestTokenURL,
      method: "POST",
    }),
  );

  const response = await fetch(requestTokenURL, {
    method: "POST",
    headers: {
      Authorization: authHeader["Authorization"],
    },
  });

  const text = await response.text();
  const params = new URLSearchParams(text);
  const oauth_token = params.get("oauth_token");

  if (oauth_token) {
    res
      .status(200)
      .json({ redirect: `https://api.twitter.com/oauth/authorize?oauth_token=${oauth_token}`, oauth_token });
  } else {
    res.status(500).json({ message: "Twitter Auth failed" });
  }
};
