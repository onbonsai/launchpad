import crypto from "crypto";

import OAuth from "oauth-1.0a";
import axios from "axios";

import { getClientWithTwitter } from "@src/services/mongo/client";

const verifyCredentialsURL = "https://api.twitter.com/1.1/account/verify_credentials.json";

export const verifyCredentials = async (addresses: string[]) => {
  const { collection } = await getClientWithTwitter();

  const query = { address: { $in: addresses } };
  const documents = await collection.find(query).toArray();

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

  const promises = documents.map(async (doc) => {
    const { oauth_token, oauth_token_secret, address } = doc;

    const authHeader = oauth.toHeader(
      oauth.authorize(
        {
          url: verifyCredentialsURL,
          method: "GET",
        },
        {
          key: oauth_token,
          secret: oauth_token_secret,
        },
      ),
    );

    try {
      const response = await axios.get(verifyCredentialsURL, {
        headers: {
          Authorization: authHeader["Authorization"],
        },
      });
      if (response.data) {
        return address;
      }
    } catch (error) {
      return null;
    }
  });

  const results = await Promise.all(promises);
  const validAddresses = new Set<string>();
  results.forEach((address: string | null) => {
    if (address) validAddresses.add(address);
  });

  return validAddresses;
};
