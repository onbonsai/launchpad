import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs-extra";
import FormData from "form-data";

import { jsonLtoJson } from "@src/utils/utils";

// NOTE: storj ipfs is deprecated
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
  if (req.method === "POST") {
    try {
      // Parse the incoming form data
      const data: any = await new Promise((resolve, reject) => {
        const form = new formidable.IncomingForm({ maxFileSize: 500 * 1024 * 1024 });

        form.parse(req, (err: any, fields: any, files: any) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      const formData = new FormData();
      if (req.query.watermark) {
        // watermark images
        const overlaidImages = await Promise.all(
          Object.keys(data.files).map(async (key) => {
            const file = data.files[key];
            // Read the image file from the parsed form data
            const fileData = fs.readFileSync(file.filepath);
            // Convert the image data to base64
            const base64Image = "data:image/webp;base64," + Buffer.from(fileData).toString("base64");
            // Overlay the watermark on the base64 image
            const overlaidImage = base64Image; // await overlayImage(base64Image, overlaybase64);
            return overlaidImage;
          }),
        );
        // add to form data
        overlaidImages.forEach((image, index) => {
          const blob = Buffer.from(image.split(",")[1], "base64");
          formData.append(`file_${index + 1}`, blob, {
            filename: `${index + 1}.webp`,
            contentType: "image/webp",
          });
        });
      } else {
        // create form data from files
        Object.keys(data.files).forEach((key) => {
          const file = data.files[key];
          // Read the image file from the parsed form data
          const fileData = fs.readFileSync(file.filepath);

          // Create a FormData instance for the Axios request
          formData.append("file", fileData, file.originalFilename);
        });
      }

      // Perform the Axios request
      const response = await _client().post("add?wrap-with-directory&cid-version=1", formData, {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${(formData as any)._boundary}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      res.status(response.status).json(jsonLtoJson(response.data));
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false });
    }
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
};

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    maxDuration: 180,
  },
};
