import { SITE_URL } from "@src/constants/constants";
import { MetadataAttribute } from "@lens-protocol/metadata";
import { ELIZA_API_URL } from "@src/services/madfi/studio";

export const roundedToFixed = (input: number, digits = 4): string => {
  const rounder = Math.pow(10, digits);
  const value = Math.round(input * rounder) / rounder;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export function shortAddress(address: string, num = 5, onlyFirst = false) {
  if (onlyFirst) return address.slice(0, num);
  return address.slice(0, num) + "..." + address.slice(address.length - (num - 1));
}

export function trimText(text: string, length: number) {
  return text.length > length ? text.substring(0, length) + "..." : text;
}

export const toQueryString = (params: any) => {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null) // filter out undefined and null values
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
};

export const pattern = /^[a-z0-9.]*$/;

export const parsePublicationLink = (link: string) => {
  const parts = link.split("/");
  return parts[parts.length - 1];
};

export const kFormatter = (num, asInteger = false) => {
  if (typeof num === "string") return num;

  if (Math.abs(num) > 999_999) {
    return Math.sign(num) * (Math.abs(num) / 1_000_000).toFixed(1) + "m";
  } else if (Math.abs(num) > 999) {
    return Math.sign(num) * (Math.abs(num) / 1000).toFixed(1) + "k";
  }

  return !asInteger
    ? Number((Math.sign(num) * Math.abs(num)).toFixed(2)).toFixed(2)
    : Number(Math.sign(num) * Math.abs(num));
};

export function openSeaUrl(address: string, tokenId: string, chainId?: string | number) {
  chainId = Number(chainId);
  return `https://${chainId === 80001 ? "testnets." : ""}opensea.io/assets/${
    chainId === 137 ? "matic" : "mumbai"
  }/${address}/${parseInt(tokenId)}`;
}

export const SUPPORTED_MIMETYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/x-ms-bmp",
  "image/svg+xml",
  "image/webp",
];

interface IntentUrlProps {
  text: string;
  referralAddress: string;
  chain: string;
  tokenAddress: string;
}

export function tweetIntentTokenReferral({ text, chain, tokenAddress, referralAddress }: IntentUrlProps) {
  const url = `${SITE_URL}/token/${chain}/${tokenAddress}?ref=${referralAddress}`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURI(`${url}`)}`;
}

export function castIntentTokenReferral({ text, chain, tokenAddress, referralAddress }: IntentUrlProps) {
  const url = `${SITE_URL}/token/${chain}/${tokenAddress}?ref=${referralAddress}`;
  return `https://farcaster.xyz/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURI(`${url}`)}`;
}

export const capitalizeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

/** Calendar related date math functions */

export const jsonLtoJson = (data: any) => data.split("\n").filter(Boolean).map(JSON.parse);

export const getLensPfp = (profile: any) => profile?.metadata?.picture ?? "/sage.webp";

export const parseBase64Image = (imageBase64: string): File | undefined => {
  try {
    // If it's a URL, create a File object from it
    if (imageBase64.startsWith("http")) {
      const fileName = `bonsai_generated_${Date.now()}.jpg`;
      const blob = new File([], fileName, { type: "image/jpeg" });
      return Object.assign(blob, {
        preview: imageBase64,
      });
    }

    // Extract image type from base64 string
    const matches = imageBase64.match(/^data:image\/(\w+);base64,/);
    if (!matches) {
      throw new Error("parseBase64Image:: failed to infer image type");
    }

    const imageType = matches[1];
    const mimeType = `image/${imageType}`;

    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Create a file object that can be used with FormData
    const blob = new File([imageBuffer], `bonsai_generated_${Date.now()}.${imageType}`, {
      type: mimeType,
    });

    return Object.assign(blob, {
      preview: URL.createObjectURL(blob),
    });
  } catch (error) {
    console.log(error);
  }
};

export const getSmartMediaUrl = (attributes: MetadataAttribute[]): string | undefined => {
  const isBonsaiPlugin = attributes.some((attr) => attr.key === "template");

  if (!isBonsaiPlugin) return;

  return attributes.find((attr) => attr.key === "apiUrl")?.value;
};

export const getPostContentSubstring = (string, length = 100): string => {
  // 250 characters and we show "Show more"
  if (!string) return "";
  if (string.length <= length) {
    return string;
  } else {
    return `${string.substring(0, length)}...`;
  }
};

export const formatCustomDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const cacheImageToStorj = async (imageData: string | Blob, id: string, bucket: string) => {
  let base64Data: string;

  if (imageData instanceof Blob) {
    // Convert Blob to base64
    const arrayBuffer = await imageData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = imageData.type;
    base64Data = `data:${mimeType};base64,${buffer.toString("base64")}`;
  } else {
    // If it's already a base64 string, use it as is
    base64Data = imageData;
  }

  const response = await fetch("/api/storj/cache-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageData: base64Data,
      id,
      bucket,
    }),
  });
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to cache image");
  }
  return result.url;
};

export const cacheVideoToStorj = async (videoData: string | Blob, id: string, bucket: string = "videos") => {
  let videoBlob: Blob;

  if (videoData instanceof Blob) {
    videoBlob = videoData;
  } else {
    // Convert base64 string to Blob
    const response = await fetch(videoData);
    videoBlob = await response.blob();
  }

  // Use FormData to send the video file directly
  const formData = new FormData();
  formData.append("video", videoBlob);
  formData.append("id", id);
  formData.append("bucket", bucket);

  const response = await fetch(`${ELIZA_API_URL}/storj/cache-video`, {
    method: "POST",
    body: formData, // No need to set Content-Type, browser will set it with boundary
  });
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Failed to cache video");
  }
  return result.url;
};

// Utility function to convert VAPID key
export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const getFileExtensionFromMimeType = (mimeType: string) => {
  if (mimeType === "image/png") return "png";
  else if (mimeType === "image/jpeg") return "jpg";
  else if (mimeType === "image/gif") return "gif";
  else if (mimeType === "image/svg+xml") return "svg";
  else if (mimeType === "image/webp") return "webp";
  return "webp";
};
