import { Chain, zeroAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { base } from "viem/chains";
import { chains } from "@lens-chain/sdk/viem";

export const IS_PRODUCTION = process.env.NEXT_PUBLIC_LAUNCHPAD_CHAIN_ID === "8453";

export const getChain = (chain: string) => {
  if (IS_PRODUCTION) {
    return chain == "base" ? base : chain == "lens" ? lens : baseSepolia;
  } else {
    return chain == "base" ? baseSepolia : chain == "lens" ? lensTestnet : baseSepolia;
  }
};

const PROTOCOL_DEPLOYMENT_TESTNET = {
  base: {
    Bonsai: "0x3d2bd0e15829aa5c362a4144fdf4a1112fa29b5c",
    BonsaiNFT: "0xE9d2FA815B95A9d087862a09079549F351DaB9bd",
    BonsaiLaunchpad: "0x717138EbACFbbD9787b84c220E7BDA230C93dfB8", // v2
    CreatorNFT: "0x282E7D06DA9f52392664eC2988fbeA8d8c12C4d3",
    // v2 with token vesting fix
    BonsaiLaunchpadFix: "0xEd724DAD5e23C8e3E9A8dB8D252825F86E8Dd5b5",
    CreatorNFTFix: "0xF8154ad1e28c216d5b8A0FA37a8bB1fe417E1c70",
  },
  lens: {
    Bonsai: "0x795cc31B44834Ff1F72F7db73985f9159Bd51ac2",
    BonsaiNFT: "0xD51C163134Fd3f2403AD68860C02B123503bf3BD",
    BonsaiLaunchpad: "0x33F706555fc08E2A035083aFb1e7F6d594f9BD16",
    CreatorNFT: "0xa9Fbeb45021d5c9b10384aeC4d3Cf28f723978C1",
    Periphery: "0xa5eeE8d1cECEa07220Bc5A7676c3F5357E639642",
    Staking: "0x80f836453113E01a673175CCB9eC66bDd4e2CB5F",
    AccountTokenClaim: "0x1C94ebD5D6B4242CC6b6163d12FbB215ABe0d902",
    RewardSwap: "0x652fA04CfaD90c06DF785c6eD3A404176b1b4dd1",
    // v3 with token vesting fix
    BonsaiLaunchpadFix: "0xAFcE1C785dD1c33F215B7aB5B2C23aF1Ed7cB7b9",
    CreatorNFTFix: "0xc860899A6006d0be1e86E534242E4F1542e501A1",
    PeripheryFix: "0xf3CD5925F22A08A54652e9d44CB804bC59498a54",
  },
};

const PROTOCOL_DEPLOYMENT_MAINNET = {
  base: {
    Bonsai: "0x474f4cb764df9da079D94052fED39625c147C12C",
    BonsaiNFT: "0xf060fd6b66B13421c1E514e9f10BedAD52cF241e",
    BonsaiLaunchpad: "0xb43a85C7369FA6535abCbBB9Da71f8eDCE067E03",
    CreatorNFT: "0x598cbeAce49CfE711D5AD75fb71e81e5B81c2eB5",
    // v2 with token vesting fix
    BonsaiLaunchpadFix: "0xC0Ffb22aCF44b5E8E66DAE180e5A23380C7ece16",
    CreatorNFTFix: "0x4DC6CC80198aB90cD094Ab13F3c582afbF0AAE74",
  },
  lens: {
    Bonsai: "0xB0588f9A9cADe7CD5f194a5fe77AcD6A58250f82",
    BonsaiNFT: "0x40df0F8C263885093DCCEb4698DE3580FC0C9D49",
    BonsaiLaunchpad: "0xe86B6e5381C2641c2dfA247628481f1dEd18DCC7",
    CreatorNFT: "0xb7ab564e86CC2b898A8003554815E1f464BE4D74",
    Periphery: "0x1C091216341e03a0A03Ed45fE052AEc66CF0d4ae",
    Staking: "0xD51C163134Fd3f2403AD68860C02B123503bf3BD",
    AccountTokenClaim: "0xDD25E29840daB77Daab42FeEB4174364A89037d1",
    RewardSwap: "0x80Dc28a9Dc227ee5EC717C509c8d6ceB7Bd43C25",
    // v3 with token vesting fix
    BonsaiLaunchpadFix: "0xaB7311a413a39C4F640D152Eec00f70eD3889066",
    CreatorNFTFix: "0xA89102015780aE5aBF460811FB1bb246d4f5cc18",
    PeripheryFix: "0xAFcE1C785dD1c33F215B7aB5B2C23aF1Ed7cB7b9",
  },
};

export const PROTOCOL_DEPLOYMENT = IS_PRODUCTION ? PROTOCOL_DEPLOYMENT_MAINNET : PROTOCOL_DEPLOYMENT_TESTNET;

export const ACTION_HUB_ADDRESS = IS_PRODUCTION
  ? "0xc6D57Ee750Ef2ee017a9E985A0C4198bEd16A802"
  : "0xc6D57Ee750Ef2ee017a9E985A0C4198bEd16A802";

// NETWORKS

export const lens: Chain = chains.mainnet;
export const lensTestnet: Chain = chains.testnet;
export const LENS_CHAIN_ID = IS_PRODUCTION ? lens.id : lensTestnet.id;
export const LENS_BONSAI_APP = IS_PRODUCTION
  ? "0x640c9184b31467C84096EB2829309756DDbB3f44"
  : "0x4Abd67c2c42ff2b8003C642D0d0e562A3F900805";

export const LENS_BONSAI_DEFAULT_FEED = IS_PRODUCTION
  ? process.env.NEXT_PUBLIC_LENS_DEFAULT_FEED || "0x075083417a0e58cE665c7E0E9970187f4053928F"
  : "0xeCb72dCabFC9288CB96aA65042b9f9cF93d10DB1";

export const LENS_GLOBAL_FEED = IS_PRODUCTION
  ? "0xcB5E109FFC0E15565082d78E68dDDf2573703580"
  : "0x31232Cb7dE0dce17949ffA58E9E38EEeB367C871";

// HELPER FUNCTIONS FOR CORRECT LAUNCHPAD DEPLOYMENT
type ContractType = "BonsaiLaunchpad" | "CreatorNFT" | "Periphery";

interface ContractThresholds {
  base: {
    [key in ContractType]: number;
  };
  lens: {
    [key in ContractType]: number;
  };
}

const CONTRACT_THRESHOLDS: ContractThresholds = {
  base: {
    BonsaiLaunchpad: 306,
    CreatorNFT: 306,
    Periphery: 306,
  },
  lens: {
    BonsaiLaunchpad: 177,
    CreatorNFT: 177,
    Periphery: 177,
  },
};

const TESTNET_THRESHOLDS: ContractThresholds = {
  base: {
    BonsaiLaunchpad: 22,
    CreatorNFT: 22,
    Periphery: 22,
  },
  lens: {
    BonsaiLaunchpad: 51,
    CreatorNFT: 51,
    Periphery: 51,
  },
};

export const getLaunchpadAddress = (contractType: ContractType, clubId: number | string, chain: string): string => {
  const thresholds = IS_PRODUCTION ? CONTRACT_THRESHOLDS : TESTNET_THRESHOLDS;
  const deployment = IS_PRODUCTION ? PROTOCOL_DEPLOYMENT_MAINNET : PROTOCOL_DEPLOYMENT_TESTNET;

  const chainKey = chain === "base" ? "base" : "lens";

  // Special case: clubId 0 always uses the fixed version
  if (Number(clubId) === 0) {
    return deployment[chainKey][`${contractType}Fix`];
  }

  const threshold = thresholds[chainKey][contractType];
  const contractKey = Number(clubId) <= threshold ? contractType : `${contractType}Fix`;

  return deployment[chainKey][contractKey];
};
