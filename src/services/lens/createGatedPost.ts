import { toast } from "react-hot-toast";
import { ProfileFragment } from "@lens-protocol/client";
import {
  erc1155OwnershipCondition,
  advancedContractCondition,
  ConditionComparisonOperator,
  erc20OwnershipCondition
} from '@lens-protocol/metadata';

import { MAD_SBT_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import { ExtendedGatedClient } from '@src/services/lens/createGatedClient';
import { chainIdNumber } from "@src/constants/validChainId";
import { pinJson, storjGatewayURL } from "@src/utils/storj";
import { SUBSCRIPTION_HANDLER } from "@src/services/madfi/utils";

import { createPostMomoka, createPostOnchain } from "./createPost";

const uploadMetadataHandler = async (data): Promise<string> => {
  const { data: IpfsHash } = await pinJson(data);
  return storjGatewayURL(IpfsHash);
};

// creates a gated publication on momoka, unless `actionModule` and `actionModuleInitData` are set
export default async (
  client: ExtendedGatedClient,
  walletClient: any,
  authenticatedProfile: ProfileFragment,
  metadata: any,
  collectionId: string,
  toastId = '',
  customGatedCondition,
  actionModule?: string,
  actionModuleInitData?: string
) => {
  let accessCondition;

  if (customGatedCondition?.erc20AccessCondition) { // TODO: this needs to change
    accessCondition = erc20OwnershipCondition({
      condition: ConditionComparisonOperator.GREATER_THAN_OR_EQUAL,
      contract: {
        address: customGatedCondition!.erc20AccessCondition.contractAddress,
        chainId: customGatedCondition!.erc20AccessCondition.chainId
      },
      decimals: customGatedCondition!.erc20AccessCondition.decimals,
      value: customGatedCondition!.erc20AccessCondition.amount
    });
  } else if (customGatedCondition?.members) {
    accessCondition = erc1155OwnershipCondition({
      contract: {
        address: MAD_SBT_CONTRACT_ADDRESS,
        chainId: chainIdNumber,
      },
      tokenIds: [collectionId]
    });
  } else if (customGatedCondition?.subscribers) {
    // TODO: only polygon/mainnet chains are supported in lens sdk
    accessCondition = advancedContractCondition({
      abi: 'function hasActiveSubscription(address subscriber, address creator) view returns (bool activeSub)',
      comparison: ConditionComparisonOperator.EQUAL,
      contract: {
        address: SUBSCRIPTION_HANDLER,
        chainId: chainIdNumber
      },
      functionName: 'hasActiveSubscription',
      params: [':userAddress', authenticatedProfile.ownedBy.address],
      value: 'true'
    });
  } else if (customGatedCondition?.advancedContractCondition) {
    accessCondition = customGatedCondition?.advancedContractCondition; // trusting here
  } else {
    // TODO: replace this with new boolean access condition on SubscriptionHandler#hasActiveSubscription
    throw new Error('Bad access condition');
  }

  let result;
  try {
    // @ts-ignore
    if (!await client.isAuthSigCached()) {
      toastId = toast.loading("Authenticating...", { id: toastId });
      await client.authenticateEncrypted(walletClient, authenticatedProfile.ownedBy.address, authenticatedProfile.id);
    }
    toastId = toast.loading("Encrypting...", { id: toastId });
    result = await client.gated.encryptPublicationMetadata(metadata, accessCondition);
  } catch (error) {
    console.log(error); // assuming they rejected...
    toast.error("Please sign-in to encrypt your post", { id: toastId });
    return;
  }
  if (result.isFailure()) throw new Error('Error encrypting');
  const encryptedMetadata = result.value;
  const contentURI = await uploadMetadataHandler(encryptedMetadata);

  try {
    if (toastId) { toastId = toast.loading("Preparing post...", { id: toastId }); }

    if (actionModule && actionModuleInitData) {
      return await createPostOnchain(
        walletClient,
        contentURI,
        authenticatedProfile,
        [actionModule],
        [actionModuleInitData]
      )
    }

    return await createPostMomoka(
      walletClient,
      contentURI,
      authenticatedProfile
    );
  } catch (error) {
    console.log(error); // assuming they rejected...
    toast.error("Please sign the message to post", { id: toastId });
    return;
  }
};
