import crypto from "crypto";

import OAuth from "oauth-1.0a";
import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithTwitter } from "@src/services/mongo/client";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const address = req.query.address;
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

  const request_data = {
    url: "https://api.twitter.com/oauth/access_token",
    method: "POST",
    data: {
      oauth_verifier: req.query.oauth_verifier,
      oauth_token: req.query.oauth_token,
    },
  };

  const token = {
    key: req.query.oauth_token,
    secret: "",
  };

  const response = await fetch(request_data.url, {
    method: request_data.method,
    headers: oauth.toHeader(oauth.authorize(request_data, token)),
  });

  const text = await response.text();
  const params = new URLSearchParams(text);
  const oauth_token = params.get("oauth_token");
  const oauth_token_secret = params.get("oauth_token_secret");
  const user_id = params.get("user_id");
  const screen_name = params.get("screen_name");

  // Here, you can save the user and their access token to your MongoDB database
  const user = {
    address,
    user_id,
    screen_name,
    oauth_token,
    oauth_token_secret,
  };
  const { collection } = await getClientWithTwitter();
  await collection.insertOne(user);

  res.redirect("/dashboard"); // Redirect to home page
};
