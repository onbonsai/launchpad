import crypto from "crypto";

import OAuth from "oauth-1.0a";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";

import { getClientWithBids, getClientWithTwitter } from "@src/services/mongo/client";
import { storjGatewayURL } from "@src/utils/storj";


const endpointURL = `https://api.twitter.com/2/tweets`;
const mediaUploadURL = `https://upload.twitter.com/1.1/media/upload.json`;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { text, address, media, bidId } = req.body;

    const { collection} = await getClientWithTwitter();
    const oauth_data = await collection.findOne({ address });

    if (!oauth_data) {
      throw new Error("No Twitter OAuth data found for this address");
    }

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
      key: oauth_data.oauth_token,
      secret: oauth_data.oauth_token_secret,
    };

    // Download and upload the images
    const mediaPromises = media.map(async ({ item }: { item: string }) => {
      const url = storjGatewayURL(item);
      const imageData = await axios.get(url, { responseType: "arraybuffer" });

      // Upload the image
      const mediaResponse = await axios.post(
        mediaUploadURL,
        {
          media_data: Buffer.from(imageData.data, "binary").toString("base64"),
        },
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: oauth.toHeader(oauth.authorize({ url: mediaUploadURL, method: "POST" }, token))[
              "Authorization"
            ],
          },
        },
      );

      // Return media id
      return mediaResponse.data.media_id_string;
    });

    // Wait for all images to be uploaded
    const media_ids = await Promise.all(mediaPromises);

    const authHeader = oauth.toHeader(
      oauth.authorize(
        {
          url: endpointURL,
          method: "POST",
        },
        token,
      ),
    );

    let tweet: any = { text };
    if (media_ids.length > 0) {
      tweet = {
        ...tweet,
        media: { media_ids },
      };
    }

    const response = await axios.post(endpointURL, tweet, {
      headers: {
        Authorization: authHeader["Authorization"],
        "user-agent": "v2CreateTweetJS",
        "content-type": "application/json",
        accept: "application/json",
      },
    });

    try {
      // Update the bid for the provided bidId with "tweetId: response.data.data.id"
      const { collection: bidCollection } = await getClientWithBids();
      await bidCollection.updateOne({ _id: new ObjectId(bidId) }, { $set: { tweetId: response.data.data.id } });
    } catch (e) {
      console.error(e);
    }

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message ?? "error" });
  }
};

export default handler;
