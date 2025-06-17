import axios from "axios";
import FormData from "form-data";
import { S3 } from "aws-sdk";

import { _hash } from "./pinata";

interface StorjUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

const SLS_STAGE = "production";
const STORJ_API_URL = "https://www.storj-ipfs.com";
const STORJ_API_PORT = process.env.STORJ_API_PORT!;
const STORJ_API_USERNAME = process.env.STORJ_API_USERNAME!;
const STORJ_API_PASSWORD = process.env.STORJ_API_PASSWORD!;
const STORJ_ACCESS_KEY = process.env.STORJ_ACCESS_KEY!;
const STORJ_SECRET_KEY = process.env.STORJ_SECRET_KEY!;
const STORJ_ENDPOINT = process.env.STORJ_ENDPOINT || "https://gateway.storjshare.io";

// prod service uses default port (443)
const _baseURL = `${STORJ_API_URL}${SLS_STAGE === "production" ? "" : `:${STORJ_API_PORT}`}/api/v0`;
const _client = () =>
  axios.create({
    baseURL: _baseURL,
    auth: { username: STORJ_API_USERNAME, password: STORJ_API_PASSWORD },
  });

const getStorjPublicUrl = (bucket: string, key: string): string => {
  const keys = {
    "publication-history-media": "jw5fzwqqirjuu6i2aambbebh4uza",
    "publication-history-metadata": "jw3iog3dy7frukpkum5xo6tklyxq",
    previews: "jwrsmshtwuktk3mv4r242qejirrq",
    audio: "jxs2vvpwyboomtmpa6vpa2bvxmma",
    "token-images": "jwqnkhask2gfydqrp2zkawmbo6hq",
    videos: "jvusxqy7gycsriztqimvlis5wnfa",
  };
  const endpoint = `https://link.storjshare.io/raw/${keys[bucket]}/${bucket}`;
  return `${endpoint}/${key}`;
};

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

const getExtensionFromContentType = (contentType: string): string => {
  const contentTypeMap: { [key: string]: string } = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogg',
    'video/avi': '.avi',
    'video/mov': '.mov',
    'video/quicktime': '.mov'
  };
  return contentTypeMap[contentType] || '';
};

export const cacheImageStorj = async ({ id, buffer, bucket, contentType = 'image/png' }): Promise<StorjUploadResult> => {
  if (!STORJ_ACCESS_KEY || !STORJ_SECRET_KEY || !STORJ_ENDPOINT) {
    return {
      success: false,
      error: "Storj credentials are not properly configured",
    };
  }

  // Add file extension if not present
  const extension = getExtensionFromContentType(contentType);
  const finalId = extension && !id.toLowerCase().endsWith(extension) ? `${id}${extension}` : id;

  const s3 = new S3({
    accessKeyId: STORJ_ACCESS_KEY,
    secretAccessKey: STORJ_SECRET_KEY,
    endpoint: STORJ_ENDPOINT,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  const params = {
    Bucket: bucket,
    Key: finalId,
    Body: buffer,
    ContentType: contentType,
  };

  try {
    await s3.upload(params).promise();
    return {
      success: true,
      url: getStorjPublicUrl(bucket, finalId),
    };
  } catch (error) {
    console.error("Failed to upload image to Storj:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
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

export const cacheVideoStorj = async ({ 
  id, 
  buffer, 
  bucket = 'videos', 
  contentType = 'video/mp4' 
}: {
  id: string;
  buffer: Buffer;
  bucket?: string;
  contentType?: string;
}): Promise<StorjUploadResult> => {
  if (!STORJ_ACCESS_KEY || !STORJ_SECRET_KEY || !STORJ_ENDPOINT) {
    return {
      success: false,
      error: "Storj credentials are not properly configured",
    };
  }

  // Add file extension if not present
  const extension = getExtensionFromContentType(contentType);
  const finalId = extension && !id.toLowerCase().endsWith(extension) ? `${id}${extension}` : id;

  const s3 = new S3({
    accessKeyId: STORJ_ACCESS_KEY,
    secretAccessKey: STORJ_SECRET_KEY,
    endpoint: STORJ_ENDPOINT,
    s3ForcePathStyle: true,
    signatureVersion: "v4",
  });

  const params = {
    Bucket: bucket,
    Key: finalId,
    Body: buffer,
    ContentType: contentType,
  };

  try {
    await s3.upload(params).promise();
    return {
      success: true,
      url: getStorjPublicUrl(bucket, finalId),
    };
  } catch (error) {
    console.error("Failed to upload video to Storj:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
