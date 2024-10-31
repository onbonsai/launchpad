import { waitForTransactionReceipt } from "@wagmi/core";
import { omit } from "lodash/object";

import { ZERO_ADDRESS, EMPTY_BYTES, IS_PRODUCTION } from "@src/constants/constants";
import { getEventFromReceipt } from "@src/utils/viem";
import { configureChainsConfig } from "@src/utils/wagmi";

import { lensClient, handleBroadcastResult } from "./client";
import { LENSHUB_PROXY } from "./utils";
import { LensHubProxy } from "./abi";
import { Events } from "./events";

const MODULES_ALLOWED_API = !IS_PRODUCTION; // need lens to enable on mainnet

export const createPost = async (
  walletClient: any,
  profileId: any,
  contentUri: string,
  actionModules?: string[],
  actionModulesInitDatas?: string[],
  referenceModule?: string,
  referenceModuleInitData?: string,
) => {
  try {
    const hash = await walletClient.writeContract({
      address: LENSHUB_PROXY,
      abi: LensHubProxy,
      functionName: "post",
      args: [
        {
          profileId,
          contentURI: contentUri,
          actionModules: actionModules || [],
          actionModulesInitDatas: actionModulesInitDatas || [],
          referenceModule: referenceModule || ZERO_ADDRESS,
          referenceModuleInitData: referenceModuleInitData || EMPTY_BYTES,
        },
      ],
      // gas: 750_000
    });
    console.log(`tx: ${hash}`);

    const transactionReceipt = await waitForTransactionReceipt(configureChainsConfig, { hash });
    const postCreatedEvent = getEventFromReceipt({
      contractAddress: LENSHUB_PROXY,
      transactionReceipt,
      abi: Events,
      eventName: "PostCreated",
    });

    const { pubId } = postCreatedEvent.args;

    return pubId;
  } catch (error) {
    console.log("createPost:: ", error);
  }
};

// try to create a post using lens profile manager, else fallback to signed type data
export const createPostMomoka = async (
  walletClient: any,
  contentURI: string,
  authenticatedProfile?: any,
) => {
  // gasless + signless if they enabled the lens profile manager
  if (authenticatedProfile?.signless) {
    const broadcastResult = await lensClient.publication.postOnMomoka({ contentURI });
    return handleBroadcastResult(broadcastResult);
  }

  // gasless with signed type data
  const typedDataResult = await lensClient.publication.createMomokaPostTypedData({ contentURI });
  const { id, typedData } = typedDataResult.unwrap();

  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: "Post",
    message: omit(typedData.value, "__typename"),
  });

  const broadcastResult = await lensClient.transaction.broadcastOnMomoka({ id, signature: signedTypedData });
  return handleBroadcastResult(broadcastResult);
};

export const createPostOnchain = async (
  walletClient: any,
  contentURI: string,
  authenticatedProfile?: any,
  actionModules?: string[],
  actionModulesInitDatas?: string[]
) => {
  // handle optional open action modules
  let openActionModules;
  if (actionModules?.length) {
    if (actionModules.length != actionModulesInitDatas?.length)
      throw new Error('createPostOnchain:: array length mismatch');

    // modules on mainnet must be whitelisted by lens for use with api
    if (MODULES_ALLOWED_API) {
      openActionModules = actionModules.map((address: string, i: number) => ({
        unknownOpenAction: { address, data: actionModulesInitDatas![i] }
      }));
    } else {
      return await createPost(
        walletClient,
        authenticatedProfile?.id,
        contentURI,
        actionModules,
        actionModulesInitDatas
      );
    }
  }

  // gasless + signless if they enabled the lens profile manager
  if (authenticatedProfile?.signless) {
    const broadcastResult = await lensClient.publication.postOnchain({ contentURI, openActionModules });
    return handleBroadcastResult(broadcastResult);
  }

  // gasless with signed type data
  const typedDataResult = await lensClient.publication.createOnchainPostTypedData({ contentURI, openActionModules });
  const { id, typedData } = typedDataResult.unwrap();

  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: "Post",
    message: omit(typedData.value, "__typename"),
  });

  const broadcastResult = await lensClient.transaction.broadcastOnchain({ id, signature: signedTypedData });
  return handleBroadcastResult(broadcastResult);
};