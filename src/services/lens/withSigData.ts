import { parseSignature, serializeSignature } from "viem";

import { BOUNTIES_CONTRACT_ADDRESS } from "@src/services/madfi/utils";

function normalizeSignature(signature) {
  // Split the signature into its components
  const { r, s, v } = parseSignature(signature);

  if (v === undefined || v === 0n || v === 1n) {
    const lastByte = parseInt(signature.slice(-2), 16);

    // Recombine the signature using serializeSignature
    const normalizedSignature = serializeSignature({ r, s, yParity: lastByte });

    return normalizedSignature;
  } else {
    return signature;
  }
}

const lensTypes = {
  PostParams: [
    { name: "profileId", type: "uint256" },
    { name: "contentURI", type: "string" },
    { name: "actionModules", type: "address[]" },
    { name: "actionModulesInitDatas", type: "bytes[]" },
    { name: "referenceModule", type: "address" },
    { name: "referenceModuleInitData", type: "bytes" },
  ],
  MirrorParams: [
    { name: "profileId", type: "uint256" },
    { name: "metadataURI", type: "string" },
    { name: "pointedProfileId", type: "uint256" },
    { name: "pointedPubId", type: "uint256" },
    { name: "referrerProfileIds", type: "uint256[]" },
    { name: "referrerPubIds", type: "uint256[]" },
    { name: "referenceModuleData", type: "bytes" },
  ],
  FollowParams: [
    { name: "datas", type: "bytes[]" },
    { name: "followTokenIds", type: "uint256[]" },
    { name: "followerProfileId", type: "uint256" },
    { name: "idsOfProfilesToFollow", type: "uint256[]" },
  ],
};

const domain = {
  name: "MadFi Bounties",
  version: "1",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
  verifyingContract: BOUNTIES_CONTRACT_ADDRESS,
};

export const createBidSig = async (walletClient: any, message: any) => {
  const [account] = await walletClient.getAddresses();

  const types = {
    RankedSettleInput: [
      { name: "bountyId", type: "uint256" },
      { name: "bid", type: "uint256" },
      { name: "bidderCollectionId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "revShare", type: "uint256" },
      { name: "postParams", type: "PostParams" },
      { name: "mirrorParams", type: "MirrorParams" },
      { name: "followParams", type: "FollowParams" },
    ],
    ...lensTypes,
  };

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: "RankedSettleInput",
    message,
  });

  return normalizeSignature(signature);
};

export const createNftBidSig = async (walletClient: any, message: any) => {
  const [account] = await walletClient.getAddresses();

  const types = {
    NftSettleInput: [
      { name: "bountyId", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "postParams", type: "PostParams" },
      { name: "mirrorParams", type: "MirrorParams" },
      { name: "followParams", type: "FollowParams" },
    ],
    ...lensTypes,
  };

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: "NftSettleInput",
    message,
  });

  return normalizeSignature(signature);
};

export const createPayOnlyBidSig = async (walletClient: any, message: any) => {
  const [account] = await walletClient.getAddresses();

  const types = {
    Bid: [
      { name: "bountyId", type: "uint256" },
      { name: "bid", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "revShare", type: "uint256" },
    ],
  };

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: "Bid",
    message,
  });

  return normalizeSignature(signature);
};

const lensTypesQuote = {
  QuoteParams: [
    { name: "profileId", type: "uint256" },
    { name: "contentURI", type: "string" },
    { name: "pointedProfileId", type: "uint256" },
    { name: "pointedPubId", type: "uint256" },
    { name: "referrerProfileIds", type: "uint256[]" },
    { name: "referrerPubIds", type: "uint256[]" },
    { name: "referenceModuleData", type: "bytes" },
    { name: "actionModules", type: "address[]" },
    { name: "actionModulesInitDatas", type: "bytes[]" },
    { name: "referenceModule", type: "address" },
    { name: "referenceModuleInitData", type: "bytes" },
  ],
};

export const createBidSigQuote = async (walletClient: any, message: any) => {
  const [account] = await walletClient.getAddresses();

  const types = {
    RankedSettleInputQuote: [
      { name: "bountyId", type: "uint256" },
      { name: "bid", type: "uint256" },
      { name: "bidderCollectionId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "revShare", type: "uint256" },
      { name: "quoteParams", type: "QuoteParams" },
      { name: "mirrorParams", type: "MirrorParams" },
      { name: "followParams", type: "FollowParams" },
    ],
    ...lensTypesQuote,
    MirrorParams: lensTypes.MirrorParams,
    FollowParams: lensTypes.FollowParams,
  };

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: "RankedSettleInputQuote",
    message,
  });

  return normalizeSignature(signature);
};

export const createNftBidSigQuote = async (walletClient: any, message: any) => {
  const [account] = await walletClient.getAddresses();

  const types = {
    NftSettleInputQuote: [
      { name: "bountyId", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "quoteParams", type: "QuoteParams" },
      { name: "mirrorParams", type: "MirrorParams" },
      { name: "followParams", type: "FollowParams" },
    ],
    ...lensTypesQuote,
    MirrorParams: lensTypes.MirrorParams,
    FollowParams: lensTypes.FollowParams,
  };

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: "NftSettleInputQuote",
    message,
  });

  return normalizeSignature(signature);
};
