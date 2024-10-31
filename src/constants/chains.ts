import {
  mainnet,
  polygon,
  base,
  baseSepolia,
  baseGoerli,
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
  [base.id]: "https://mainnet.base.org",
  [baseGoerli.id]: "https://goerli.base.org",
  [baseSepolia.id]: "https://sepolia.base.org",
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC!,
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
