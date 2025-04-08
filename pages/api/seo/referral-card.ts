import { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";

import {
  bufferToPng,
  overlayImageAdvanced,
  resizeImage,
  resizeImageFromUrl,
  withBlackSquare,
  withWhiteCircle,
  saveToFile,
} from "@src/utils/imgUtilsBackend";
import { bucketImageLinkStorj } from "@src/utils/utils";
import { overlaysmallbase64 } from "@src/utils/overlaysmallbase64";
import { cacheImageStorj } from "@src/utils/storj-backend";
import sharp from "sharp";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let { address, profile } = req.body;
    address = address.toLowerCase();

    const image_url = profile?.metadata?.coverPicture ?? bucketImageLinkStorj("opengraph-image.jpg", "referrals");
    const pfp = profile?.metadata?.picture ?? bucketImageLinkStorj("sage.webp", "referrals");

    // crop to seo size/ratio 512x268
    let outputBuffer;
    try {
      outputBuffer = await resizeImageFromUrl(image_url);
    } catch (e) {
      outputBuffer = await resizeImageFromUrl(bucketImageLinkStorj("opengraph-image.jpg"));
    }

    // get profile image
    const ouptutBufferProfile = await resizeImageFromUrl(pfp, 220, 220, 150);

    // overlay profile pic with white background
    outputBuffer = await withWhiteCircle(outputBuffer, 250, 250, 25, 25, 0.3);
    outputBuffer = await overlayImageAdvanced(outputBuffer, ouptutBufferProfile, 40, 40);

    // Add Bonsai Word Mark to bottom right
    const wordMarkPath = path.join(process.cwd(), "public", "bonsai-word-mark.svg");
    const wordMarkBuffer = await sharp(wordMarkPath)
      .resize(200, null, { // resize to 200px width, maintain aspect ratio
        withoutEnlargement: true,
        fit: 'inside'
      })
      .toBuffer();
    
    // Calculate position for bottom right (1200 - 200 - 20 = 980 for x, 630 - height - 20 = y)
    const wordMarkMetadata = await sharp(wordMarkBuffer).metadata();
    const wordMarkHeight = wordMarkMetadata.height || 0;
    const x = 980; // 20px from right
    const y = 630 - wordMarkHeight - 20; // 20px from bottom
    
    outputBuffer = await overlayImageAdvanced(outputBuffer, wordMarkBuffer, x, y);

    // upload to s3
    const id = `${address}.png`;
    
    // Save locally as JPG
    const localPath = path.join(process.cwd(), "public", "temp", `${address}.jpg`);
    // Ensure the temp directory exists
    const tempDir = path.join(process.cwd(), "public", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    console.log(`Saving to ${localPath}`);
    // Convert to JPG and save locally
    // await sharp(outputBuffer).jpeg().toFile(localPath);
    
    // Save the buffer as a PNG file and upload to storj
    // const outputPng = await bufferToPng(outputBuffer);
    // await cacheImageStorj(id, outputPng, "referrals", undefined);

    return res.status(200).json({ id, localPath: `/temp/${address}.jpg` });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: true });
  }
};

export default handler;
