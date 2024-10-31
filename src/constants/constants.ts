import { IS_PRODUCTION } from "@src/services/madfi/utils";

export const MADFI_BANNER_IMAGE_SMALL =
  "https://link.storjshare.io/raw/jvnvg6pove7qyyfbyo5hqggdis6a/misc%2Fmadfi-banner.jpeg";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || (IS_PRODUCTION ? "https://app.onbons.ai" : "https://testnet.onbons.ai");

export const MONGO_DB_CREATORS = "creators";
export const MONGO_COLLECTION_BOUNTIES = `bounties${IS_PRODUCTION ? "" : "-testnet"}`;
export const MONGO_COLLECTION_BIDS = `bids${IS_PRODUCTION ? "" : "-testnet"}`;
export const MONGO_COLLECTION_PROMOTED = `promoted${IS_PRODUCTION ? "" : "-testnet"}`;

export const platforms = ["lens", "twitter", "insta", "tiktok", "deso", "farcaster"];

export const MADFI_API_KEY = process.env.MADFI_API_KEY;

export const MEDIA_SERVER_URL =
  process.env.NEXT_PUBLIC_MEDIA_SERVER_URL || "https://madfi-media-server-af3d6b164e42.herokuapp.com";
