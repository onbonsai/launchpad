import crypto from "crypto";

import OAuth from "oauth-1.0a";

const params = "user.fields=profile_image_url"; // Edit optional query parameters here

const endpointURL = `https://api.twitter.com/2/users/me?${params}`;

// Function to get the URL of a Twitter user's profile photo
export async function getUserProfilePhotoUrl(twitterStatus: any) {
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

  const token = {
    key: twitterStatus.oauth_token,
    secret: twitterStatus.oauth_token_secret,
  };

  const authHeader = oauth.toHeader(
    oauth.authorize(
      {
        url: endpointURL,
        method: "GET",
      },
      token,
    ),
  );
  const response = await fetch(endpointURL, {
    method: "GET",
    headers: {
      Authorization: authHeader["Authorization"],
      "user-agent": "v2UserLookupJS",
    },
  });

  const json = JSON.parse(await response.text());

  if (json && json.data) {
    return json.data.profile_image_url;
  } else {
    console.error(json);
    return null;
  }
}
