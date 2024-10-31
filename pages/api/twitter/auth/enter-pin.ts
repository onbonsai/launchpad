import crypto from "crypto";

import OAuth from "oauth-1.0a";
import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithBids, getClientWithTwitter } from "@src/services/mongo/client";

const accessTokenURL = "https://api.twitter.com/oauth/access_token";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { address, pin, oauth_token } = req.body;

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
      url: accessTokenURL,
      method: "POST",
    }),
  );

  const url = `https://api.twitter.com/oauth/access_token?oauth_verifier=${pin.trim()}&oauth_token=${oauth_token}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader["Authorization"],
    },
  });

  const text = await response.text();
  const params = new URLSearchParams(text);
  const oauth_token_new = params.get("oauth_token");
  const oauth_token_secret = params.get("oauth_token_secret");
  const user_id = params.get("user_id");
  const screen_name = params.get("screen_name");

  if (oauth_token_secret) {
    // Store the oauth_token and oauth_token_secret for the user
    const user = {
      address,
      user_id,
      screen_name,
      oauth_token: oauth_token_new,
      oauth_token_secret,
    };
    const { collection} = await getClientWithTwitter();
    await collection.replaceOne({ address }, user, { upsert: true });

    const { collection: bidCollection } = await getClientWithBids();
    await bidCollection.updateMany(
      { creator: address, twitter: { $exists: true } },
      { $set: { "twitter.invalid": false } },
    );

    res.status(200).json({ message: "Twitter Auth succeeded" });
  } else {
    res.status(500).json({ message: "Twitter Auth failed" });
  }
};
