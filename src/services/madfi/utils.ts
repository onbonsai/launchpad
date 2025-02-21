import { Chain, zeroAddress } from "viem";

export const IS_PRODUCTION = process.env.NEXT_PUBLIC_LAUNCHPAD_CHAIN_ID === "8453";

const PROTOCOL_DEPLOYMENT_TESTNET = {
  base: {
    Bonsai: "0x3d2bd0e15829aa5c362a4144fdf4a1112fa29b5c",
    BonsaiNFT: "0xE9d2FA815B95A9d087862a09079549F351DaB9bd",
    BonsaiLaunchpad: "0x717138EbACFbbD9787b84c220E7BDA230C93dfB8", // v2
  },
  lens: {
    Bonsai: "0x795cc31B44834Ff1F72F7db73985f9159Bd51ac2",
    BonsaiNFT: "0xD51C163134Fd3f2403AD68860C02B123503bf3BD",
    BonsaiLaunchpad: "0x717138EbACFbbD9787b84c220E7BDA230C93dfB8",
    Periphery: zeroAddress, // TODO: add periphery address
  },
};

const PROTOCOL_DEPLOYMENT_MAINNET = {
  base: {
    Bonsai: "0x3d2bd0e15829aa5c362a4144fdf4a1112fa29b5c",
    BonsaiNFT: "0xf060fd6b66B13421c1E514e9f10BedAD52cF241e",
    BonsaiLaunchpad: "0xb43a85C7369FA6535abCbBB9Da71f8eDCE067E03",
  },
  lens: {
    Bonsai: "0x795cc31B44834Ff1F72F7db73985f9159Bd51ac2",
    BonsaiNFT: "0xD51C163134Fd3f2403AD68860C02B123503bf3BD",
    BonsaiLaunchpad: "0x717138EbACFbbD9787b84c220E7BDA230C93dfB8",
    Periphery: zeroAddress, // TODO: add periphery address
  },
};

export const PROTOCOL_DEPLOYMENT = IS_PRODUCTION ? PROTOCOL_DEPLOYMENT_MAINNET : PROTOCOL_DEPLOYMENT_TESTNET;

// NETWORKS

// TODO: mainnet
export const lens: Chain = {
  id: 37111,
  name: "Lens Testnet",
  nativeCurrency: { name: "Grass", symbol: "GRASS", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.lens.dev"] } },
  blockExplorers: { default: { name: "Lens Testnet", url: "https://testnet.lens.xyz" } },
};

export const lensTestnet: Chain = {
  id: 37111,
  name: "Lens Testnet",
  nativeCurrency: { name: "Grass", symbol: "GRASS", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.lens.dev"] } },
  blockExplorers: { default: { name: "Lens Testnet", url: "https://testnet.lens.xyz" } },
};
