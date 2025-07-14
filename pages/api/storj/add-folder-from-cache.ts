import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import FormData from "form-data";

import { fetchImagesStorj } from "@src/utils/storj-backend";
import { overlayImage } from "@src/utils/imgUtilsBackend";

const SLS_STAGE = "production";
const STORJ_API_URL = "https://www.storj-ipfs.com";
const STORJ_API_PORT = process.env.STORJ_API_PORT!;
const STORJ_API_USERNAME = process.env.STORJ_API_USERNAME!;
const STORJ_API_PASSWORD = process.env.STORJ_API_PASSWORD!;

// prod service uses default port (443)
const _baseURL = `${STORJ_API_URL}${SLS_STAGE === "production" ? "" : `:${STORJ_API_PORT}`}/api/v0`;
const _client = () =>
  axios.create({
    baseURL: _baseURL,
    auth: { username: STORJ_API_USERNAME, password: STORJ_API_PASSWORD },
  });

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { ids } = req.body;
    const images = await fetchImagesStorj(ids);

    // watermark images
    const overlaidImages = await Promise.all(
      images.map(async (img) => {
        const overlaidImage = img; // await overlayImage(img, overlaybase64);
        return overlaidImage;
      }),
    );

    // create a form data object
    const formData = new FormData();
    overlaidImages.forEach((image, index) => {
      const blob = Buffer.from(image.split(",")[1], "base64");
      formData.append(`file_${index + 1}`, blob, {
        filename: `${index + 1}.png`,
        contentType: "image/png",
      });
    });

    // Pin the folder to storj
    const response = await _client().post("add?wrap-with-directory&cid-version=1", formData, {
      headers: {
        "Content-Type": `multipart/form-data; boundary=${(formData as any)._boundary}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const data = response.data
      .split("\n")
      .filter((line) => line !== "")
      .map((line) => JSON.parse(line));

    res.status(response.status).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false });
  }
};

export const config = {
  api: {
    maxDuration: 180,
  },
};
