import { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http } from "viem";
import { polygon, polygonMumbai } from "viem/chains";

import {
  bufferToPng,
  overlayImageAdvanced,
  resizeImage,
  resizeImageFromUrl,
  withBlackSquare,
  withWhiteCircle,
} from "@src/utils/imgUtilsBackend";
import { getLensPfp, bucketImageLinkStorj } from "@src/utils/utils";
import { overlaysmallbase64 } from "@src/utils/overlaysmallbase64";
import { cacheImageStorj } from "@src/utils/storj-backend";
import { IS_PRODUCTION } from "@src/constants/constants";
import { getEventFromReceipt } from "@src/utils/viem";
import { LENSHUB_PROXY } from "@src/services/lens/utils";

import { Events } from "../../../src/services/lens/events";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let { pubIdOrTxHash, profile, image_url } = req.body;

    let pubId;
    if (!pubIdOrTxHash.includes("-")) {
      // if we only have a tx hash, get the pub id
      const publicClient = createPublicClient({
        chain: IS_PRODUCTION ? polygon : polygonMumbai,
        transport: http(),
      });
      const transactionReceipt = await publicClient.waitForTransactionReceipt({
        hash: pubIdOrTxHash,
      });
      const postCreatedEvent = getEventFromReceipt({
        contractAddress: LENSHUB_PROXY,
        transactionReceipt,
        abi: Events,
        eventName: "PostCreated",
      });

      const profileHexValue = postCreatedEvent.args.postParams.profileId.toString(16);
      const profileId = `0x${
        profileHexValue.length === 3 ? profileHexValue.padStart(4, "0") : profileHexValue.padStart(2, "0")
      }`;
      const pubHexValue = postCreatedEvent.args.pubId.toString(16);
      const eventPubId = `0x${pubHexValue.length === 3 ? pubHexValue.padStart(4, "0") : pubHexValue.padStart(2, "0")}`;
      pubId = `${profileId}-${eventPubId}`;
    } else {
      // if we have a pub id, use it
      pubId = pubIdOrTxHash;
    }

    // fallback to default image if none provided
    if (!image_url) image_url = bucketImageLinkStorj("card-bg-tower.png");

    // crop to seo size/ratio
    let outputBuffer;
    try {
      outputBuffer = await resizeImageFromUrl(image_url);
    } catch (e) {
      outputBuffer = await resizeImageFromUrl(bucketImageLinkStorj("card-bg-tower.png"));
    }

    // get profile image
    const ouptutBufferProfile = await resizeImageFromUrl(getLensPfp(profile), 220, 220, 150);

    // overlay profile pic with white background
    outputBuffer = await withWhiteCircle(outputBuffer, 250, 250, 25, 25, 0.5);
    outputBuffer = await overlayImageAdvanced(outputBuffer, ouptutBufferProfile, 40, 40);

    // overlay madfi logo in right with a black background
    outputBuffer = await withBlackSquare(outputBuffer, 260, 130, 910, 480, 30, 0.5);
    let overlayBuffer = Buffer.from(overlaysmallbase64.split(",")[1], "base64");
    overlayBuffer = await resizeImage(overlayBuffer, 180, 90);
    outputBuffer = await overlayImageAdvanced(outputBuffer, overlayBuffer, 950, 500);

    // upload to s3
    const id = `${pubId}.png`;
    const outputPng = await bufferToPng(outputBuffer);
    await cacheImageStorj(id, outputPng, "seo", undefined);

    return res.status(200).json({ id });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: true });
  }
};

export default handler;
