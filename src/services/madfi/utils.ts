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

interface ProtocolDeployment {
  base: Record<string, `0x${string}`>;
  lens: Record<string, `0x${string}`>;
}

const PROTOCOL_DEPLOYMENT_TESTNET: ProtocolDeployment = {
  base: {
    Bonsai: "0x3d2bd0e15829aa5c362a4144fdf4a1112fa29b5c",
    BonsaiNFT: "0xE9d2FA815B95A9d087862a09079549F351DaB9bd",
    BonsaiLaunchpad: "0x717138EbACFbbD9787b84c220E7BDA230C93dfB8", // v2
    CreatorNFT: "0x282E7D06DA9f52392664eC2988fbeA8d8c12C4d3",
    // v2 with token vesting fix
    BonsaiLaunchpadFix: "0xEd724DAD5e23C8e3E9A8dB8D252825F86E8Dd5b5",
    CreatorNFTFix: "0xF8154ad1e28c216d5b8A0FA37a8bB1fe417E1c70",
    RevenueSplitter: "0xcccb97b148ae30bfbc29e831278778f0b24cf044",
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
    StakingRewards: "0x652fA04CfaD90c06DF785c6eD3A404176b1b4dd1",
    RevenueSplitter: "0xcccb97b148ae30bfbc29e831278778f0b24cf044",
  },
};

const PROTOCOL_DEPLOYMENT_MAINNET: ProtocolDeployment = {
  base: {
    Bonsai: "0x474f4cb764df9da079D94052fED39625c147C12C",
    BonsaiNFT: "0xf060fd6b66B13421c1E514e9f10BedAD52cF241e",
    BonsaiLaunchpad: "0xb43a85C7369FA6535abCbBB9Da71f8eDCE067E03",
    CreatorNFT: "0x598cbeAce49CfE711D5AD75fb71e81e5B81c2eB5",
    // v2 with token vesting fix
    BonsaiLaunchpadFix: "0x1EEC8b1338d36f189D8bc075d801bbd4b0d04caa",
    CreatorNFTFix: "0xfC9A94c0788511356EFF2E304b9258a3688A899e",
    RevenueSplitter: "0xcccb97b148ae30bfbc29e831278778f0b24cf044",
  },
  lens: {
    Bonsai: "0x302AC2BF6D20572F125e21bEB83e5a4e5F1Fe4B5",
    BonsaiNFT: "0x40df0F8C263885093DCCEb4698DE3580FC0C9D49",
    BonsaiLaunchpad: "0x609910215d39485c0CC3b9745777209BbF4b05c7",
    CreatorNFT: "0xDfe6F129F33207cCCf3DaA8A10Ad1929edCAB4Fc",
    Periphery: "0x7D3bbcE32892Af1eE12dd7F760a0A5c4f2B18EaE",
    Staking: "0xD51C163134Fd3f2403AD68860C02B123503bf3BD",
    AccountTokenClaim: "0xDD25E29840daB77Daab42FeEB4174364A89037d1",
    RewardSwap: "0x80Dc28a9Dc227ee5EC717C509c8d6ceB7Bd43C25",
    // v3 with token vesting fix
    // BonsaiLaunchpadFix: "0xaB7311a413a39C4F640D152Eec00f70eD3889066",
    // CreatorNFTFix: "0xA89102015780aE5aBF460811FB1bb246d4f5cc18",
    // PeripheryFix: "0x59b8e5a2141db6e39d19EEbE33Fcb9714c2FF719",
    // StakingRewards: "0x7BeB726Bb3D1E7249d6cdF6B5B08E40Cb6D4F284",
    RevenueSplitter: "0xcccb97b148ae30bfbc29e831278778f0b24cf044",
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
export const SAGE_EVM_ADDRESS = "0x7022Ab96507d91De11AE9E64b7183B9fE3B2Bf61";

export const LENS_BONSAI_DEFAULT_FEED = IS_PRODUCTION
  ? process.env.NEXT_PUBLIC_LENS_DEFAULT_FEED || "0x075083417a0e58cE665c7E0E9970187f4053928F"
  : "0xeCb72dCabFC9288CB96aA65042b9f9cF93d10DB1";

export const LENS_GLOBAL_FEED = IS_PRODUCTION
  ? "0xcB5E109FFC0E15565082d78E68dDDf2573703580"
  : "0x31232Cb7dE0dce17949ffA58E9E38EEeB367C871";

export const BONSAI_NAMESPACE = IS_PRODUCTION
  ? "0x1dDD492A541E16A9dC506aAEF5Aa1e3E8afAC4cC"
  : "0x5585fddD720111909c99A835D94B16Bac28Dd569";

// HELPER FUNCTIONS FOR CORRECT LAUNCHPAD DEPLOYMENT
type ContractType = "BonsaiLaunchpad" | "CreatorNFT" | "Periphery";

export const getLaunchpadAddress = (contractType: ContractType, chain = "lens"): `0x${string}` => {
  const deployment = IS_PRODUCTION ? PROTOCOL_DEPLOYMENT_MAINNET : PROTOCOL_DEPLOYMENT_TESTNET;

  return deployment[chain][contractType];
};
