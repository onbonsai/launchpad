import { IS_PRODUCTION } from "./../../constants/constants";

export const DEFAULT_HEADER_IMAGE =
  "https://madfinance.mypinata.cloud/ipfs/QmRySZ31DTftcNkXck7QEYumkBuwFBRiYX4rLpxWRYEfSK";

export const MADFINANCE_PROFILE_ID = IS_PRODUCTION ? "0x21c0" : "209";

export const SANDBOX_DEPLOYER_PROFILE_ID = '0x42';
export const SANDBOX_NO_SECOND_BEST_PROFILE_ID = '0x024d';
export const SANDBOX_INTEREST_ROOT = '0xcbb16664403320ce8d9a03820bde7ee63c38679701731d429517b68d21c46f2a';
export const SANDBOX_INTEREST_TREE_MAP = {
  "0x42": {
    "proof": [
      "0x9bc4734e23030cee1bdb208c62ddeaeba8849c303480977dab8b22c1f7b7dd1c"
    ],
    "index": 0
  },
  "0x024d": {
    "proof": [
      "0x0c76294eba3506fdf534c8154af6e6081db516048f19ec531b3d6452650087ce",
      "0x2852b577eb917e124a16ffd8dc1efc55441aabd0717d5d636c873192a2f58242"
    ],
    "index": 1
  },
  "0x3433": {
    "proof": [
      "0x0f3712e63236af36733b72c796625945c9773de445465c4fc67079d0b2e58274",
      "0x2852b577eb917e124a16ffd8dc1efc55441aabd0717d5d636c873192a2f58242"
    ],
    "index": 2
  }
};

export const USE_MAD_RELAY = false;

// madfi-protocol/mumbai-contracts.json
const PROTOCOL_DEPLOYMENT_TESTNET = {
  "MadSBT": "0x37aB71116E2A89dA7d27c918aBE6B9Bb8bEE5d12",
  "SBTLevels": "0x214955A9Ab649A17a14999A0afdC9F2c422084b1",
  "TargetedCampaignReferenceModule": "0x5B63817a55759F7271f257152f23004C7EDa31d6",
  "SubscriptionHandler": "0x06e0A31095d611A6b075D358ae13c390759815E1",
  "Bounties": "0xa363AB8e2b4e09AF678Ded095011AbB0A801947b",
  "RewardNFT": "0x86d25a4C55F27679c7109E6FEc24c6D85ad28AC6",
  "MadSBTImplementation": "0x144DcdAbc67e0F6AE0f8CeA5A713bBE0a5B8Ced2",
  "SocialClubReferrals": "0x7f1fB3DcCB8bED821e639DcEBCCb69AeE1Bb7797",
  "RewardEngagementAction": "0x55Cbc1f4353D8663cB3af6b9058397f1ef237E90",
  "SimpleCollectionMintAction": "0x34e1071e319fe512c052a92a2ceFaF2589a0E098",
  "PublicationBountyAction": "0x46F6e501BCE4784a82304C56388f871dCeB708AE",
  "ZoraLzMintActionV1": "0x55991a42e8FEb9DFAC9Fcc172f133D36AC2282A2",
  "RevShare": "0x1d39A9933f346DCEDCBf7D94b705CE430Ad139E3",
  "SBTRedemption": "0x54354b09320c5D7e8b7a7446d488c9128D081d26",
  "MoneyClubs": "0x1C111355EdE4259Fa9825AEC1f16f95ED737D62E",
  "Bonsai": "0x3d2bd0e15829aa5c362a4144fdf4a1112fa29b5c",
  "BlackjackAction": "",
  "BonsaiLaunchpad": "0x924d2E0f77F692A86e48e199E4Bf348Ee2977a2c"
};

const PROTOCOL_DEPLOYMENT_MAINNET = {
  "MadSBT": "0x22209D6eAe6cEBA2d059ebfE67b67837BCC1b428",
  "SBTLevels": "0x9bE0E2B6B6AeDf2c4E594D2474824846fdE5e770",
  "Bounties": "0x606E8572e79852Cb0766fd95907FeE7b974e41Be",
  "ZoraLzMintActionV1": "0x5f377e3e9BE56Ff72588323Df6a4ecd5cEedc56A",
  "MadSBTImplementation": "0xf4499308c98D11E5699Df24F427F1906F35EE543",
  "SBTRedemption": "0x5d324d9fbb924a909B89d9cF6F311385B80477DF",
  "RewardNFT": "0xC45dC3262A024d8962F74237fc7E990aa3Fbb407",
  "SocialClubReferrals": "0x712bAa2E7b005d6c27902e427De9E329D6CfA4Be",
  "RevShare": "0xE4dd0E4ae20dcCF6654ef97e9DeEfb42D29e4037",
  "SimpleCollectionMintAction": "0x55991a42e8FEb9DFAC9Fcc172f133D36AC2282A2",
  "RewardEngagementAction": "0xDA7F4679312Ab7Dc9B4A985564a391c14Ef45A72",
  "PublicationBountyAction": "0x6587ee890bd85426ED3509AbC5215311C5397D43",
  "SubscriptionHandler": "0x17Bf3E31953CF097Ea88b6f5664724F0Ca3e2578",
  "TargetedCampaignReferenceModule": "",
  "MoneyClubs": "0x85BeD62602026EA5AA5aBcaf5547A6d730E2B066",
  "Bonsai": "0x3d2bd0e15829aa5c362a4144fdf4a1112fa29b5c",
  "BlackjackAction": "0xa7774490374363bf53E6e18b1fB05C92BcB6B74C",
  "BonsaiLaunchpad": ""
};

const PROTOCOL_DEPLOYMENT = IS_PRODUCTION ? PROTOCOL_DEPLOYMENT_MAINNET : PROTOCOL_DEPLOYMENT_TESTNET;

export const BOUNTIES_CONTRACT_ADDRESS = PROTOCOL_DEPLOYMENT.Bounties as `0x${string}`;
export const STICKERS_CONTRACT_ADDRESS = PROTOCOL_DEPLOYMENT.RewardNFT as `0x${string}`;
export const REV_SHARE_LIBRARY_ADDRESS = PROTOCOL_DEPLOYMENT.RevShare as `0x${string}`;
export const MAD_SBT_CONTRACT_ADDRESS = PROTOCOL_DEPLOYMENT.MadSBT as `0x${string}`;
export const SBT_LEVELS_CONTRACT_ADDRESS = PROTOCOL_DEPLOYMENT.SBTLevels as `0x${string}`;
export const ZORA_LZ_MINT_ACTION_MODULE = PROTOCOL_DEPLOYMENT.ZoraLzMintActionV1 as `0x${string}`;
export const REWARD_ENGAGEMENT_ACTION_MODULE = PROTOCOL_DEPLOYMENT.RewardEngagementAction as `0x${string}`;
export const COLLECTION_MINT_ACTION_MODULE = PROTOCOL_DEPLOYMENT.SimpleCollectionMintAction as `0x${string}`;
export const PUBLICATION_BOUNTY_ACTION_MODULE = PROTOCOL_DEPLOYMENT.PublicationBountyAction as `0x${string}`;
export const SOCIAL_CLUB_REFERRALS = PROTOCOL_DEPLOYMENT.SocialClubReferrals as `0x${string}`;
export const SBT_REDEMPTION_CONTRACT_ADDRESS = PROTOCOL_DEPLOYMENT.SBTRedemption as `0x${string}`;
export const SUBSCRIPTION_HANDLER = PROTOCOL_DEPLOYMENT.SubscriptionHandler as `0x${string}`;
export const TARGETED_CAMPAIGN_REFERENCE_MODULE = PROTOCOL_DEPLOYMENT.TargetedCampaignReferenceModule as `0x${string}`;
export const MONEY_CLUBS_ADDRESS = PROTOCOL_DEPLOYMENT.MoneyClubs as `0x${string}`;
export const BONSAI_TOKEN_ADDRESS = PROTOCOL_DEPLOYMENT.Bonsai as `0x${string}`;
export const BLACKJACK_ACTION_MODULE = PROTOCOL_DEPLOYMENT.BlackjackAction as `0x${string}`;

export const LAUNCHPAD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LAUNCHPAD_CHAIN_ID === "8453"
  ? PROTOCOL_DEPLOYMENT_MAINNET.BonsaiLaunchpad as `0x${string}`
  : PROTOCOL_DEPLOYMENT_TESTNET.BonsaiLaunchpad as `0x${string}`;

export const SUBSCRIPTION_HANDLER_BASE = IS_PRODUCTION
  ? "0xeB5Cf30152ba70350Cd2741e9E1066316B561603"
  : "0x588FcD11f7D59618e8be9d941bF8d96b73A5c9a7";

// USDCx on polygon, fUSDCx on mumbai
export const ACCEPTED_SUPERTOKEN = IS_PRODUCTION
  ? "0x07b24BBD834c1c546EcE89fF95f71D9F13a2eBD1" // USDCx
  : "0x42bb40bF79730451B11f6De1CbA222F17b87Afd7"; // fUSDCx

// USDC on polygon, fUSDC on mumbai
export const ACCEPTED_TOKEN = IS_PRODUCTION
  ? "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" // USDC
  : "0xbe49ac1EadAc65dccf204D4Df81d650B50122aB2"; // fUSDC

export const MADFI_DEFAULT_CREATOR = {
  "id": 8640,
  "is_private": false,
  "follower_count": 9775,
  "external_url": "https://hey.xyz/u/madfinance.lens",
  "is_business": false,
  "biography": "MadFi enables creators to manage & monetize attention in web3 💸",
  "full_name": "Mad Finance",
  "following_count": 2,
  "profile_pic_url_cached": "https://lens.infura-ipfs.io/ipfs/bafkreic6mrlbyv2w5t4qoiy327zbz45dfmn7qa5sgdjxosljuvtlnvsxwu",
  "username": "madfinance.lens",
  "abilityToSendDirectMessage": false,
  "has_flatlay_account": false,
  "hashtags": []
};
