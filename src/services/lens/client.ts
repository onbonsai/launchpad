import { PublicClient, mainnet, testnet, IStorageProvider } from "@lens-protocol/client";
import { StorageClient } from "@lens-chain/storage-client";
import { IS_PRODUCTION } from "../madfi/utils";
import { SITE_URL } from "@src/constants/constants";

export const LENS_ENVIRONMENT = IS_PRODUCTION ? mainnet : testnet;

let storage: IStorageProvider;

if (typeof window !== "undefined") {
  storage = window.localStorage;
} else {
  storage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

export const lensClient = PublicClient.create({
  environment: LENS_ENVIRONMENT,
  origin: SITE_URL,
  storage,
});

export const storageClient = StorageClient.create();
