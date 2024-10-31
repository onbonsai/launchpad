import { NextApiRequest, NextApiResponse } from "next";

import {
  bufferToPng,
  overlayImageAdvanced,
  resizeImage,
  resizeImageFromUrl,
  withBlackSquare,
  withWhiteCircle,
} from "@src/utils/imgUtilsBackend";
import { bucketImageLinkStorj } from "@src/utils/utils";
import { overlaysmallbase64 } from "@src/utils/overlaysmallbase64";
import { cacheImageStorj } from "@src/utils/storj-backend";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let { profileHandle, profileAvatarURL, profileBannerURL } = req.body;

    // fallback to default image if none provided
    if (!profileBannerURL) profileBannerURL = bucketImageLinkStorj("card-bg-tower.png");

    // crop to seo size/ratio
    let outputBuffer;
    try {
      outputBuffer = await resizeImageFromUrl(profileBannerURL);
    } catch (e) {
      outputBuffer = await resizeImageFromUrl(bucketImageLinkStorj("card-bg-tower.png"));
    }

    // get profile image
    const ouptutBufferProfile = await resizeImageFromUrl(profileAvatarURL, 220, 220, 150);

    // overlay profile pic with white background
    outputBuffer = await withWhiteCircle(outputBuffer, 250, 250, 25, 25, 0.5);
    outputBuffer = await overlayImageAdvanced(outputBuffer, ouptutBufferProfile, 40, 40);

    // overlay madfi logo in right with a black background
    outputBuffer = await withBlackSquare(outputBuffer, 260, 130, 910, 480, 30, 0.5);
    let overlayBuffer = Buffer.from(overlaysmallbase64.split(",")[1], "base64");
    overlayBuffer = await resizeImage(overlayBuffer, 180, 90);
    outputBuffer = await overlayImageAdvanced(outputBuffer, overlayBuffer, 950, 500);

    // upload to s3
    const id = `live/${profileHandle}`;
    const outputPng = await bufferToPng(outputBuffer);
    await cacheImageStorj(id, outputPng, "seo", undefined);

    return res.status(200).json({ id });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: true });
  }
};

export default handler;
