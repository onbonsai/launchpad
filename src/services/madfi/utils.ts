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
}

const PROTOCOL_DEPLOYMENT_TESTNET = {
  base: {
    Bonsai: "0x3d2bd0e15829aa5c362a4144fdf4a1112fa29b5c",
    BonsaiNFT: "0xE9d2FA815B95A9d087862a09079549F351DaB9bd",
    BonsaiLaunchpad: "0x717138EbACFbbD9787b84c220E7BDA230C93dfB8", // v2
    CreatorNFT: "0x282E7D06DA9f52392664eC2988fbeA8d8c12C4d3",
  },
  lens: {
    Bonsai: "0x795cc31B44834Ff1F72F7db73985f9159Bd51ac2",
    BonsaiNFT: "0xD51C163134Fd3f2403AD68860C02B123503bf3BD",
    BonsaiLaunchpad: "0x33F706555fc08E2A035083aFb1e7F6d594f9BD16",
    CreatorNFT: "0xa9Fbeb45021d5c9b10384aeC4d3Cf28f723978C1",
    Periphery: "0xa5eeE8d1cECEa07220Bc5A7676c3F5357E639642",
    Staking: "0x80f836453113E01a673175CCB9eC66bDd4e2CB5F",
    AccountTokenClaim: "0x1C94ebD5D6B4242CC6b6163d12FbB215ABe0d902"
  },
};

const PROTOCOL_DEPLOYMENT_MAINNET = {
  base: {
    Bonsai: "0x474f4cb764df9da079D94052fED39625c147C12C",
    BonsaiNFT: "0xf060fd6b66B13421c1E514e9f10BedAD52cF241e",
    BonsaiLaunchpad: "0xb43a85C7369FA6535abCbBB9Da71f8eDCE067E03",
    CreatorNFT: "0x598cbeAce49CfE711D5AD75fb71e81e5B81c2eB5",
  },
  lens: {
    Bonsai: "0xB0588f9A9cADe7CD5f194a5fe77AcD6A58250f82",
    BonsaiNFT: "0x40df0F8C263885093DCCEb4698DE3580FC0C9D49",
    BonsaiLaunchpad: "0xe86B6e5381C2641c2dfA247628481f1dEd18DCC7",
    CreatorNFT: "0xb7ab564e86CC2b898A8003554815E1f464BE4D74",
    Periphery: "0x1C091216341e03a0A03Ed45fE052AEc66CF0d4ae",
    Staking: "0xD51C163134Fd3f2403AD68860C02B123503bf3BD",
    AccountTokenClaim: "0xDD25E29840daB77Daab42FeEB4174364A89037d1"
  },
};

export const PROTOCOL_DEPLOYMENT = IS_PRODUCTION ? PROTOCOL_DEPLOYMENT_MAINNET : PROTOCOL_DEPLOYMENT_TESTNET;

// NETWORKS

export const lens: Chain = chains.mainnet;
export const lensTestnet: Chain = chains.testnet;
export const LENS_CHAIN_ID = IS_PRODUCTION ? lens.id : lensTestnet.id;
export const LENS_BONSAI_APP = IS_PRODUCTION
  ? "0x640c9184b31467C84096EB2829309756DDbB3f44"
  : "0x4Abd67c2c42ff2b8003C642D0d0e562A3F900805"

export const LENS_BONSAI_DEFAULT_FEED = IS_PRODUCTION
  ? "0x075083417a0e58cE665c7E0E9970187f4053928F"
  : "0xeCb72dCabFC9288CB96aA65042b9f9cF93d10DB1"
