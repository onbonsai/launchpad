import { lens } from "@src/services/madfi/utils";
import {
  mainnet,
  polygon,
  base,
  baseSepolia,
  baseGoerli,
  zkSync,
  zkSyncSepoliaTestnet,
  lensTestnet,
} from "viem/chains";

export enum Chains {
  MAINNET = 1,
  POLYGON = 137,
  BASE = 8453,
  BASE_SEPOLIA = 84532,
}

export const ChainsById = {
  "1": "mainnet",
  "137": "polygon",
};

export const ChainRpcs = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_RPC!,
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC!,
  [baseSepolia.id]: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC!,
  [zkSync.id]: process.env.NEXT_PUBLIC_ZKSYNC_RPC!,
  [zkSyncSepoliaTestnet.id]: process.env.NEXT_PUBLIC_ZKSYNC_SEPOLIA_RPC!,
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC!,
  [lens.id]: process.env.NEXT_PUBLIC_LENS_RPC || "https://rpc.lens.xyz",
  [lensTestnet.id]: "https://rpc.testnet.lens.xyz",
};

export const ChainNames = {
  [Chains.MAINNET]: "Ethereum Mainnet",
  [Chains.POLYGON]: "Polygon",
  [Chains.BASE]: "Base",
  [Chains.BASE_SEPOLIA]: "Base Sepolia",
};

export const ChainNamesRpc = {
  [Chains.MAINNET]: "MAINNET",
  [Chains.POLYGON]: "POLYGON",
};

export enum ChainsRPC {
  MAINNET = "homestead",
  POLYGON = "polygon",
}
