import axios from "axios";
import FormData from "form-data";
// import { S3 } from "aws-sdk";

import { _hash } from "./pinata";

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

export const addJson = async (json: any) => {
  if (typeof json !== "string") {
    json = JSON.stringify(json);
  }
  const formData = new FormData();
  formData.append("path", Buffer.from(json, "utf-8").toString());

  const headers = {
    "Content-Type": "multipart/form-data",
    ...formData.getHeaders(),
  };

  const { data } = await _client().post("add?cid-version=1", formData.getBuffer(), {
    headers,
  });

  return data.Hash;
};

export const peers = async () => {
  const { data } = await _client().post("swarm/peers");
  return data.Peers;
};

export const getViaStorjGateway = async (uriOrHash: string) => {
  const { data } = await axios.get(storjGatewayURL(uriOrHash));
  return data;
};

const storjGatewayURL = (uriOrHash: string) => `${STORJ_API_URL}/ipfs/${_hash(uriOrHash)}`;

export const cacheImageStorj = async (id, imageBuffer, bucket = "temp", lifecycle = "+1d") => {
  // TODO: move to server
  // const s3 = new S3({
  //   accessKeyId: process.env.STORJ_ACCESS_KEY,
  //   secretAccessKey: process.env.STORJ_SECRET_KEY,
  //   endpoint: process.env.STORJ_ENDPOINT,
  //   s3ForcePathStyle: true,
  //   signatureVersion: "v4",
  // });

  // const params = {
  //   Bucket: bucket,
  //   Key: id,
  //   Body: imageBuffer,
  //   ContentType: "image/png",
  // };

  // if (lifecycle) {
  //   params["Metadata"] = {
  //     "x-amz-meta-object-expires": lifecycle,
  //   };
  // }

  // try {
  //   await s3.upload(params).promise();
  //   return true;
  // } catch (error) {
  //   console.log(error);
  //   return false;
  // }
};

export const fetchImagesStorj = async (ids: string[]) => {
  const s3 = new S3({
    accessKeyId: process.env.STORJ_ACCESS_KEY,
    secretAccessKey: process.env.STORJ_SECRET_KEY,
    endpoint: process.env.STORJ_ENDPOINT,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  try {
    const images = await Promise.all(
      ids.map(async (id) => {
        const params = {
          Bucket: "temp",
          Key: id,
        };

        const data = await s3.getObject(params).promise();

        // assuming the images are stored as 'image/png'
        const image = `data:image/png;base64,${data.Body.toString("base64")}`;

        return image;
      }),
    );

    return images;
  } catch (error) {
    console.log(error);
    return [];
  }
};
