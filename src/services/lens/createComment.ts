import { omit } from "lodash/object";

import { lensClient, handleBroadcastResult } from "./client";

// try to create a comment using lens profile manager, else fallback to signed type data
export const createCommentMomoka = async (
  walletClient: any,
  publicationId: string,
  contentURI: string,
  authenticatedProfile?: any,
) => {
  // gasless + signless if they enabled the lens profile manager
  if (authenticatedProfile?.signless) {
    const broadcastResult = await lensClient.publication.commentOnMomoka({ commentOn: publicationId, contentURI });
    return handleBroadcastResult(broadcastResult);
  }

  // gasless with signed type data
  const typedDataResult = await lensClient.publication.createMomokaCommentTypedData({
    commentOn: publicationId,
    contentURI
  });

  const { id, typedData } = typedDataResult.unwrap();

  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: "Comment",
    message: omit(typedData.value, "__typename"),
  });

  const broadcastResult = await lensClient.transaction.broadcastOnMomoka({ id, signature: signedTypedData });
  return handleBroadcastResult(broadcastResult);
};

export const createCommentOnchain = async (
  walletClient: any,
  publicationId: string,
  contentURI: string,
  authenticatedProfile?: any,
) => {
  // gasless + signless if they enabled the lens profile manager
  if (authenticatedProfile?.signless) {
    const broadcastResult = await lensClient.publication.commentOnchain({ commentOn: publicationId, contentURI });
    return handleBroadcastResult(broadcastResult);
  }

  // gasless with signed type data
  const typedDataResult = await lensClient.publication.createOnchainCommentTypedData({
    commentOn: publicationId,
    contentURI
  });

  const { id, typedData } = typedDataResult.unwrap();

  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: "Comment",
    message: omit(typedData.value, "__typename"),
  });

  const broadcastResult = await lensClient.transaction.broadcastOnchain({ id, signature: signedTypedData });
  return handleBroadcastResult(broadcastResult);
};