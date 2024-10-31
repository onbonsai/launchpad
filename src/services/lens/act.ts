import { omit } from "lodash/object";
import { waitForTransactionReceipt } from "@wagmi/core";
import { OnchainReferrer, RelaySuccessFragment } from "@lens-protocol/client";

import { LENSHUB_PROXY } from "@src/services/lens/utils";
import { lensClient, handleBroadcastResult } from "@src/services/lens/client";
import { configureChainsConfig } from "@src/utils/wagmi";

import { LensHubProxy } from './abi';

// input the `Types.ProcessActionParams` struct for ILensProtocol#act()
// derive that from the `@src/services/madfi/rewardEngagementAction`
export const actOnchain = async (walletClient: any, processActionParams: any) => {
  try {
    const hash = await walletClient.writeContract({
      address: LENSHUB_PROXY,
      abi: LensHubProxy,
      functionName: "act",
      args: [processActionParams],
      overrides: {
        gasLimit: 500_000
      }
    });

    console.log(`tx: ${hash}`);
    await waitForTransactionReceipt(configureChainsConfig, { hash });
    return hash;
  } catch (error) {
    console.log(error);
  }
};

export const actSignless = async(publicationId: string, actionModule: `0x${string}`, actionModuleData: string) => {
  try {
    const result = await lensClient.publication.actions.actOn({
      actOn: {
        unknownOpenAction: { address: actionModule, data: actionModuleData }
      },
      for: publicationId
    });

    return handleBroadcastResult(result);
  } catch (error) {
    console.log(error);
  }
}

// NOTE: this assume the given `actionModule` has `metadata.sponsoredApproved` = true
// NOTE: this assumes that the passed in `lensClient` is authenticated (see: https://docs.lens.xyz/docs/login)
// NOTE: this assumes the app is whitelisted to use gasless
export const actWithSignedTypedata = async (
  walletClient: any,
  publicationId: string,
  actionModule: `0x${string}`,
  actionModuleData: string,
  referrers?: OnchainReferrer[]
): Promise<any> => {
  try {
    const typedDataResult = await lensClient.publication.actions.createActOnTypedData({
      actOn: {
        unknownOpenAction: {
          address: actionModule,
          data: actionModuleData
        }
      },
      for: publicationId,
      referrers: referrers || []
    });

    const { id, typedData } = typedDataResult.unwrap();

    const [account] = await walletClient.getAddresses();
    const signedTypedData = await walletClient.signTypedData({
      account,
      domain: omit(typedData.domain, "__typename"),
      types: omit(typedData.types, "__typename"),
      primaryType: "Act",
      message: omit(typedData.value, "__typename"),
    });

    const broadcastResult = await lensClient.transaction.broadcastOnchain({ id, signature: signedTypedData });
    const broadcastResultValue = broadcastResult.unwrap();

    if (broadcastResultValue.__typename === "RelayError") throw new Error("RelayError");

    return (broadcastResultValue as RelaySuccessFragment).txId;
  } catch (error) {
    console.log(error);
  }
}