import { PublicClient, testnet, staging } from "@lens-protocol/client";
import { IS_PRODUCTION } from "../madfi/utils";

// TODO: update to production
export const LENS_ENVIRONMENT = IS_PRODUCTION ? staging : staging;

// TODO: something cleaner
let storage;
if (typeof window !== 'undefined') {
  storage = window.localStorage;
}
export const lensClient = PublicClient.create({
  environment: LENS_ENVIRONMENT,
  origin: "https://launch.bonsai.meme",
  storage,
});

export const handleBroadcastResult = (broadcastResult: any) => {
  const broadcastValue = broadcastResult.unwrap();

  if ("id" in broadcastValue || "txId" in broadcastValue) {
    // TODO: success?
    console.log(broadcastValue);
    return broadcastValue;
  } else {
    console.log(broadcastValue);
    throw new Error();
  }
};
