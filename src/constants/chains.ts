import {
  mainnet,
  goerli,
  polygon,
  polygonMumbai,
  base,
  baseSepolia,
  baseGoerli,
  avalanche,
  avalancheFuji,
} from "viem/chains";

import { chainIdNumber } from "./validChainId";

export enum Chains {
  MAINNET = 1,
  POLYGON = 137,
  BASE = 8453,
  AVALANCHE = 43114,
  RINKEBY = 4,
  GOERLI = 5,
  MUMBAI = 80001,
  LOCALHOST = 31337,
  BASE_SEPOLIA = 84532,
  AVALANCHE_FUJI = 43113,
  BLAST_SEPOLIA = 168587773,
  BLAST = 168587773, // TODO: mainnet
}

export const ChainsById = {
  "1": "mainnet",
  "4": "rinkeby",
  "80001": "polygonMumbai",
  "31337": "hardhat",
  "137": "polygon",
};

export const ChainRpcs = {
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_RPC!,
  [polygonMumbai.id]: process.env.NEXT_PUBLIC_MUMBAI_RPC!,
  [base.id]: "https://mainnet.base.org",
  [baseGoerli.id]: "https://goerli.base.org",
  [baseSepolia.id]: "https://sepolia.base.org",
  [goerli.id]: process.env.NEXT_PUBLIC_GOERLI_RPC!,
  [avalanche.id]: "https://api.avax.network/ext/bc/C/rpc",
  [avalancheFuji.id]: "https://api.avax-test.network/ext/bc/C/rpc",
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC!,
};

export const ChainNames = {
  [Chains.MAINNET]: "Ethereum Mainnet",
  [Chains.RINKEBY]: "Rinkeby",
  [Chains.GOERLI]: "Goerli",
  [Chains.MUMBAI]: "Polygon (Mumbai)",
  [Chains.LOCALHOST]: "Localhost",
  [Chains.POLYGON]: "Polygon",
  [Chains.BASE]: "Base",
  [Chains.BASE_SEPOLIA]: "Base Sepolia",
  [Chains.AVALANCHE]: "Avalanche",
  [Chains.AVALANCHE_FUJI]: "Avalanche Fuji",
};

export const ChainNamesRpc = {
  [Chains.MAINNET]: "MAINNET",
  [Chains.RINKEBY]: "RINKEBY",
  [Chains.MUMBAI]: "MUMBAI",
  [Chains.LOCALHOST]: "LOCALHOST",
  [Chains.POLYGON]: "POLYGON",
};

export enum ChainsRPC {
  MAINNET = "homestead",
  RINKEBY = "rinkeby",
  MUMBAI = "maticmum",
  LOCALHOST = "localhost",
  POLYGON = "polygon",
}


// 0xSplits
export const SUPPORTED_SPLIT_CHAINS_TESTNET = [Chains.GOERLI, Chains.MUMBAI, Chains.BASE_SEPOLIA, Chains.AVALANCHE_FUJI];
export const SUPPORTED_SPLIT_CHAINS = [Chains.MAINNET, Chains.BASE, Chains.POLYGON, Chains.AVALANCHE];

// 0xSplits + Blast (TODO: mainnet)
export const SUPPORTED_CHAINS = chainIdNumber === 137
  ? [polygon, mainnet, base, avalanche, blastSepolia] // TODO: mainnet
  : [polygonMumbai, goerli, avalancheFuji, blastSepolia];