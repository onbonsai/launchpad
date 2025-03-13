import { IS_PRODUCTION } from "@src/services/madfi/utils";
import { base, polygon, zkSync } from "viem/chains";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const MAX_UINT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
export const EMPTY_BYTES = "0x0000000000000000000000000000000000000000000000000000000000000000";

export const WMATIC_TOKEN_ADDRESS = IS_PRODUCTION
  ? "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
  : "0x9c3c9283d3e44854697cd22d3faa240cfb032889";

export const ADMIN_WALLET = "0xB00B28559ae01D962dc72B6AaeDA7395cf8A4ecA";

export const LOCALSTORAGE_DEFAULT_PROFILE_ID = "DEFAULT_PROFILE_ID";

export const PRIVY_FIELD_PUBLISHER_INFO = "publisher-info";

export const CURRENCY_STABLE = IS_PRODUCTION ? "USDC" : "fUSDC";
export const CURRENCY_SUPERTOKEN = IS_PRODUCTION ? "USDCx" : "fUSDCx";

export const ACCEPTED_PAYMENT_TOKENS = IS_PRODUCTION
  ? [
      { symbol: "BONSAI", address: "0x3d2bD0e15829AA5C362a4144FdF4A1112fa29B5c", decimals: 18 },
      { symbol: "USDC", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
      { symbol: "wMATIC", address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
      // { symbol: "DAI", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" },
      // { symbol: "USDT", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" },
    ]
  : [
      { symbol: "BONSAI", address: "0x3d2bD0e15829AA5C362a4144FdF4A1112fa29B5c", decimals: 18 },
      { symbol: "USDC", address: "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e", decimals: 6 },
      { symbol: "wMATIC", address: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889", decimals: 18 },
      { symbol: "fUSDCx", address: "0x42bb40bF79730451B11f6De1CbA222F17b87Afd7" },
      // { symbol: "TT", address: "0x11AE455A85DeB9c34E14db1662E269080b408544" },
    ];
export const ACCEPTED_PAYMENT_STABLE = IS_PRODUCTION
  ? { symbol: "USDC", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" }
  : { symbol: "fUSDCx", address: "0x42bb40bF79730451B11f6De1CbA222F17b87Afd7" };

export const ACCEPTED_PAYMENT_STABLE_CHAINID = {
  137: ACCEPTED_PAYMENT_STABLE,
  80001: ACCEPTED_PAYMENT_STABLE,
  8453: { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
};

export const ACCEPTED_PAYMENT_SUPERTOKEN = IS_PRODUCTION
  ? { symbol: "USDCx", address: "0x07b24BBD834c1c546EcE89fF95f71D9F13a2eBD1" }
  : { symbol: "fUSDCx", address: "0x42bb40bF79730451B11f6De1CbA222F17b87Afd7" };

export const ACCEPTED_PAYMENT_SUPERTOKEN_BASE = IS_PRODUCTION
  ? { symbol: "USDCx", address: "0xD04383398dD2426297da660F9CCA3d439AF9ce1b" }
  : { symbol: "fUSDCx", address: "0x15da1146dc9a7e10b3a9b256c9bebfa79fa8edc3" };

export const BOOST_PROFILE_COST = "1"; // 10 USDC
export const BOOST_PROFILE_MAX_PROFILES = 3;
export const REDIS_PROMOTED_KEY = "promoted";
export const REDIS_PROMOTED_EXP = 21_600; // 6hrs

export const MADFI_COVER_IMG =
  "https://www.storj-ipfs.com/ipfs/bafkreigsz2o25wemigkibg2mckex5btkqqxh35lywa2ewp7o7icbhl3eha";
export const CREATOR_BADGE_SLATE_IMG =
  "https://link.storjshare.io/raw/jvqnv3qqutv5lzsinvtt5dzu4xaa/misc%2Fcreator-badge-slate.png";
export const MADFI_BANNER_IMAGE_SMALL =
  "https://link.storjshare.io/raw/jvnvg6pove7qyyfbyo5hqggdis6a/misc%2Fmadfi-banner.jpeg";
export const MADFI_BOUNTIES_URL = IS_PRODUCTION ? "https://madfi.xyz/bounties" : "https://testnet.madfi.xyz/bounties";
export const MADFI_SITE_URL = IS_PRODUCTION ? "https://madfi.xyz" : "https://testnet.madfi.xyz";
export const MADFI_CLUBS_URL = "https://launch.bonsai.meme";
export const MADFI_POST_URL = IS_PRODUCTION ? "https://madfi.xyz/post" : "https://testnet.madfi.xyz/post";
export const MADFI_WALLET_ADDRESS = "0x7F0408bc8Dfe90C09072D8ccF3a1C544737BcDB6";
export const MADFI_GENESIS_COLLECTION_ID = "1";

export const BONSAI_POST_URL = IS_PRODUCTION ? "https://launch.bonsai.meme/post" : "https://launch.bonsai.meme/post";

export const MONGO_DB_CREATORS = "creators";
export const MONGO_COLLECTION_BOUNTIES = `bounties${IS_PRODUCTION ? "" : "-testnet"}`;
export const MONGO_COLLECTION_BIDS = `bids${IS_PRODUCTION ? "" : "-testnet"}`;
export const MONGO_COLLECTION_PROMOTED = `promoted${IS_PRODUCTION ? "" : "-testnet"}`;
export const REDIS_EXP_IMPRESSION_MAP = 604_800; // 7 days

export const ADMIN_ADDRESSES = [
  "0xDC4471ee9DFcA619Ac5465FdE7CF2634253a9dc6",
  "0x28ff8e457feF9870B9d1529FE68Fbb95C3181f64",
  "0x7F0408bc8Dfe90C09072D8ccF3a1C544737BcDB6",
];

export const PLATFORM_FLATLAY = "flatlay";
export const ACCEPTED_PLATFORMS = [PLATFORM_FLATLAY];
export const platforms = ["lens", "twitter", "insta", "tiktok", "deso", "farcaster"];

export const FREE_CREDITS = 50000;

export const FOLLOWER_ELIGIBILITY_OPTIONS = [0, 100, 500, 1000, 10000];

export const SPACES_API_URL = process.env.SPACES_API_URL || "https://live.madfi.xyz/api";
export const MADFI_API_KEY = process.env.MADFI_API_KEY;
export const appId = "MadFi";

// legals etc; when submitting a bid
export const CUSTOM_BID_HEADERS = {
  theblockpodcasts:
    "The Block retains all intellectual property rights and otherwise for the podcast episode clips, including all derivative works made by members of The Block Community.",
};

export const MEDIA_SERVER_URL =
  process.env.NEXT_PUBLIC_MEDIA_SERVER_URL || "https://madfi-media-server-af3d6b164e42.herokuapp.com";

export const BICONOMY_BUNDLER_URL_BLAST = IS_PRODUCTION
  ? ``
  : `https://bundler.biconomy.io/api/v2/168587773/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`;
