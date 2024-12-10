import axios from "axios";
import { formatUnits, getAddress, hashMessage, hexToSignature, recoverAddress } from "viem";

import { getRecentPosts } from "@src/services/lens/getRecentPosts";
import { IS_PRODUCTION, MADFI_BOUNTIES_URL } from "@src/constants/constants";

// only .png files are supported (this is what the publication-image endpoint does by default)
export const bucketImageLinkStorj = (id: string, bucket = "seo") => {
  const linkKey = bucket === "referrals" ? "jxjnhzuaz5wrox7k2qjvhcwcb5qq" : "jvxdv5ynbbikx455wrdynvc7tyhq";
  return `https://link.storjshare.io/raw/${linkKey}/${bucket}/${id}${id.endsWith(".png") ? "" : ".png"}`;
};

export const MAX_UINT256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

// removes floating point precision error for display
// @ts-ignore
export const trimNumber = (x: number) => `${1 * x.toFixed(9)}`;

export const roundedToFixed = (input: number, digits = 4): string => {
  const rounder = Math.pow(10, digits);
  return parseFloat((Math.round(input * rounder) / rounder).toFixed(digits)).toLocaleString();
};

export function shortAddress(address: string, num = 5) {
  return address.slice(0, num) + " ... " + address.slice(address.length - (num - 1));
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

export const kFormatter = (num) => {
  if (typeof num === "string") return num;

  if (Math.abs(num) > 999_999) {
    return Math.sign(num) * (Math.abs(num) / 1_000_000).toFixed(1) + "mil";
  } else if (Math.abs(num) > 999) {
    return Math.sign(num) * (Math.abs(num) / 1000).toFixed(1) + "k";
  }

  return Math.sign(num) * Math.abs(num);
};

export function polygonScanUrl(address: string, chainId?: string | number | undefined, route?: string) {
  chainId = Number(chainId || process.env.NEXT_PUBLIC_CHAIN_ID);
  return `https://${chainId === 80001 ? "mumbai." : ""}polygonscan.com/${route || 'address'}/${address}`;
}

export function openSeaUrl(address: string, tokenId: string, chainId?: string | number) {
  chainId = Number(chainId || process.env.NEXT_PUBLIC_CHAIN_ID);
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

export function getPictureToDisplay(picture: any) {
  if (picture) {
    if (picture && picture.__typename === "NftImage") {
      return picture.uri || null;
    } else {
      return picture.original ? picture.original.url : null;
    }
  } else {
    return null;
  }
}

export function tweetIntentUrlMinted(handle: string) {
  return `https://twitter.com/intent/tweet?text=I just minted a Follow NFT from ${handle} via @madfiprotocol. You can too &url=https://madfinance.xyz/follow/${handle}`;
}

interface IntentUrlProps {
  text: string;
  url: string;
  ref: string;
  tokenId: string;
}

export function tweetIntentDashboardUrl({ text, url, ref, tokenId }: IntentUrlProps) {
  const _ref = encodeURIComponent(`${ref}|${tokenId}`);
  return `https://twitter.com/intent/tweet?text=${text}&url=${encodeURI(`${url}?ref=${_ref}`)}`;
}

export function lensterIntentDashboardUrl({ text, url, ref, tokenId }: IntentUrlProps) {
  const _ref = encodeURIComponent(`${ref}|${tokenId}`);
  return `https://${!IS_PRODUCTION ? "testnet." : ""}hey.xyz/?text=${text}&url=${encodeURI(`${url}?ref=${_ref}`)}`;
}

export type BountyType = "post" | "mirror" | "comment" | "follow" | "collect";

export interface SettleData {
  ids?: string[];
  createdAts?: number[];
  platform?: string;
}

export const capitalizeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const displayBudget = (budget: string, decimals = 18) => {
  return formatUnits(BigInt(budget), decimals).toString();
};

export const TokenFormatter = (number: string | number, token = "Ξ") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  })
    .format(Number(number))
    .replace("$", `${token} `);
};

// token = "Ξ"
export const budgetFormatter = (budget: any, decimals = 18, token = "") => {
  let _budget;
  if (typeof budget === "object" && budget._isBigNumber) {
    _budget = parseInt(budget._hex, 16).toString(); // convert hex to decimal string
  } else if (typeof budget === "string") {
    _budget = budget;
  } else {
    _budget = budget.toString();
  }
  return TokenFormatter(displayBudget(_budget, decimals), token);
};

export const lensterUrl = (_handle: any) => {
  const handle = typeof _handle !== "string"
    ? _handle?.localName
    : _handle;
  return process.env.NEXT_PUBLIC_CHAIN_ID! === "137"
    ? `https://hey.xyz/u/${handle}`
    : `https://testnet.hey.xyz/u/${handle}`;
};

export const lensterPostUrl = (handlePub: string) =>
  process.env.NEXT_PUBLIC_CHAIN_ID! === "137"
    ? `https://hey.xyz/posts/${handlePub}`
    : `https://testnet.hey.xyz/posts/${handlePub}`;

export const getAiResults = async (profileId?: string, bountyObjectId?: number) => {
  const recentPosts = profileId ? await getRecentPosts(profileId) : null;
  return await axios.post("/api/ai/ghostwriter", {
    bountyObjectId,
    profileId,
    recentPosts,
  });
};

export const updateAiResults = (profileId: string, original: string, newTone: string) => {
  return axios.post("/api/ai/ghostwriter", {
    update: true,
    profileId,
    original,
    newTone,
  });
};

export const bountyLensPost = (title: string, bountyObjectId?: string) => {
  const text = `💸 Live bounty on MadFi 💸\n\n${title}`;

  if (!bountyObjectId) return text;

  return `${text}\n\n${`Get paid for making a Lens post👇\n${MADFI_BOUNTIES_URL}/${bountyObjectId}`}`;
};

export const isObjectEmpty = (obj: any) => {
  return Object.keys(obj).length === 0;
};

export const verifyOwnership = async (walletClient: any) => {
  try {
    // Prompt the user to sign a message
    const min = 1000;
    const max = 10000;
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

    // Get the signer's public address
    const [address] = await walletClient.getAddresses();

    const message = `Please sign this message to verify you own this Ethereum address. Nonce: ${randomNumber}`;
    const signature = await walletClient.signMessage({
      account: address,
      message,
    });

    // Use the signed message and the signer's public address to verify the signature
    const hash = hashMessage(message);
    const recoveredAddress = await recoverAddress({ hash, signature });

    // Check if the recovered address matches the signer's address
    return getAddress(address) === getAddress(recoveredAddress);
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const validateTweetLength = (tweet: string) => {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  let match;
  let totalLength = tweet.length;

  while ((match = urlPattern.exec(tweet)) != null) {
    totalLength -= match[0].length;
    totalLength += 23;
  }

  return totalLength <= 280;
};

export const toFixedUsingString = (numStr: string, decimalPlaces: number) => {
  const [wholePart, decimalPart] = numStr.split(".");

  if (!decimalPart || decimalPart.length <= decimalPlaces) {
    return numStr.padEnd(wholePart.length + 1 + decimalPlaces, "0");
  }

  const decimalPartBigInt = BigInt(decimalPart.slice(0, decimalPlaces + 1));

  const round = decimalPartBigInt % 10n >= 5n;
  const roundedDecimal = decimalPartBigInt / 10n + (round ? 1n : 0n);

  return wholePart + "." + roundedDecimal.toString().padStart(decimalPlaces, "0");
};

export const formatSentence = (input: string) => {
  const words = input.split("_");
  const formattedWords = words.map((word) => capitalizeFirstLetter(word));
  return formattedWords.join(" ");
};

export const splitSignature = (signature: string) => {
  const splitSig = hexToSignature(signature as `0x${string}`);
  if (splitSig.v == 0n) {
    splitSig.v = 27n;
  } else if (splitSig.v == 1n) {
    splitSig.v = 28n;
  }
  return splitSig;
};

/** Calendar related date math functions */

export function addDays(dirtyDate, dirtyAmount) {
  const date = toDate(dirtyDate);
  const amount = toInteger(dirtyAmount);

  if (isNaN(amount)) {
    return new Date(NaN);
  }

  if (!amount) {
    // If 0 days, no-op to avoid changing times in the hour before end of DST
    return date;
  }

  date.setDate(date.getDate() + amount);
  return date;
}

export function subDays(dirtyDate, dirtyAmount) {
  const amount = toInteger(dirtyAmount);
  return addDays(dirtyDate, -amount);
}

function toInteger(dirtyNumber) {
  if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
    return NaN;
  }

  const number = Number(dirtyNumber);

  if (isNaN(number)) {
    return number;
  }

  return number < 0 ? Math.ceil(number) : Math.floor(number);
}

function toDate(argument) {
  const argStr = Object.prototype.toString.call(argument); // Clone the date

  if (argument instanceof Date || (typeof argument === "object" && argStr === "[object Date]")) {
    // Prevent the date to lose the milliseconds when passed to new Date() in IE10
    return new Date(argument.getTime());
  } else if (typeof argument === "number" || argStr === "[object Number]") {
    return new Date(argument);
  } else {
    if ((typeof argument === "string" || argStr === "[object String]") && typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        "Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule",
      ); // eslint-disable-next-line no-console

      console.warn(new Error().stack);
    }

    return new Date(NaN);
  }
}

export const jsonLtoJson = (data: any) => data.split("\n").filter(Boolean).map(JSON.parse);

export const getLensPfp = (profile: any) => profile?.metadata?.picture?.optimized?.uri ?? "/anon.png";

export const convertIntToHexLensId = (profileId: string) => {
  let hexProfileId = parseInt(profileId).toString(16);
  // If the hex parsed profile id is an odd number length then it needs to be padded with a zero after the 0x
  if (hexProfileId.length % 2 !== 0) {
    hexProfileId = "0x0" + hexProfileId;
  } else {
    hexProfileId = "0x" + hexProfileId;
  }
  return hexProfileId;
};

export const formatFarcasterProfileToMatchLens = (profile) => ({
  dappName: "farcaster",
  metadata: {
    coverPicture: null,
    picture: {
      optimized: { uri: profile.profileImage }
    },
    bio: profile.profileBio,
    displayName: profile.profileDisplayName,
  },
  stats: {
    following: profile.followingCount,
    followers: profile.followerCount,
  },
  handle: {
    localName: profile.profileHandle,
    suggestedFormatted: {
      localName: profile.profileHandle
    }
  }
});
export const FARCASTER_BANNER_URL = "https://link.storjshare.io/raw/jxz2u2rv37niuhe6d5xpf2kvu7eq/misc%2Ffarcaster.png";