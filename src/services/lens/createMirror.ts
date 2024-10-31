import { omit } from "lodash/object";

import { lensClient, handleBroadcastResult } from "./client";

// try to create a mirror using lens profile manager, else fallback to signed type data
export const createMirrorMomoka = async (
  walletClient: any,
  publicationId: string,
  authenticatedProfile?: any,
) => {
  // gasless + signless if they enabled the lens profile manager
  if (authenticatedProfile?.signless) {
    const broadcastResult = await lensClient.publication.mirrorOnMomoka({ mirrorOn: publicationId });
    return handleBroadcastResult(broadcastResult);
  }

  // gasless with signed type data
  const typedDataResult = await lensClient.publication.createMomokaMirrorTypedData({ mirrorOn: publicationId });
  const { id, typedData } = typedDataResult.unwrap();

  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: "Mirror",
    message: omit(typedData.value, "__typename"),
  });

  const broadcastResult = await lensClient.transaction.broadcastOnMomoka({ id, signature: signedTypedData });
  return handleBroadcastResult(broadcastResult);
};

export const createMirrorOnchain = async (
  walletClient: any,
  publicationId: string,
  authenticatedProfile?: any,
) => {
  // gasless + signless if they enabled the lens profile manager
  if (authenticatedProfile?.signless) {
    const broadcastResult = await lensClient.publication.mirrorOnchain({ mirrorOn: publicationId });
    return handleBroadcastResult(broadcastResult);
  }

  // gasless with signed type data
  const typedDataResult = await lensClient.publication.createOnchainMirrorTypedData({ mirrorOn: publicationId });
  const { id, typedData } = typedDataResult.unwrap();

  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: "Mirror",
    message: omit(typedData.value, "__typename"),
  });

  const broadcastResult = await lensClient.transaction.broadcastOnchain({ id, signature: signedTypedData });
  return handleBroadcastResult(broadcastResult);
};