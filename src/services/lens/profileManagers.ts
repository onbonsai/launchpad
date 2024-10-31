import { useQuery } from "@tanstack/react-query";
import request, { gql } from "graphql-request";
import { omit } from "lodash/object";


import { apiUrls } from "@src/constants/apiUrls";
import { getAccessToken } from "@src/hooks/useLensLogin";

import { lensClient, handleBroadcastResult } from "./client";


const GET_PROFILE_MANAGERS = gql`
  query profileManagers($profileId: ProfileId!) {
    profileManagers(request: { for: $profileId }) {
      items {
        address
      }
    }
  }
`;

const MUTATE_CHANGE_PROFILE_MANAGER = gql`
  mutation createChangeProfileManagersTypedData($options: TypedDataOptions, $request: ChangeProfileManagersRequest!) {
    createChangeProfileManagersTypedData(options: $options, request: $request) {
      id
      expiresAt
      typedData {
        types {
          ChangeDelegatedExecutorsConfig {
            name
            type
          }
        }
        domain {
          name
          chainId
          version
          verifyingContract
        }
        value {
          nonce
          deadline
          delegatorProfileId
          delegatedExecutors
          approvals
          configNumber
          switchToGivenConfig
        }
      }
    }
  }
`;

export const enableProfileManagerGasless = async (walletClient: any, contractAddress: string) => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Must sign-in with Lens");

  const { createChangeProfileManagersTypedData } = await request({
    url: apiUrls.lensAPI,
    document: MUTATE_CHANGE_PROFILE_MANAGER,
    variables: { request: { changeManagers: { address: contractAddress, action: "ADD" } } },
    requestHeaders: { "x-access-token": accessToken },
  });
  const typedData = createChangeProfileManagersTypedData.typedData;
  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: "ChangeDelegatedExecutorsConfig",
    message: omit(typedData.value, "__typename"),
  });
  await lensClient.transaction.broadcastOnchain({
    id: createChangeProfileManagersTypedData.id,
    signature: signedTypedData,
  });
};

export const enableSignless = async (walletClient: any) => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Must sign-in with Lens');

  const typedDataResult = await lensClient.profile.createChangeProfileManagersTypedData({ approveSignless: true });
  const { id, typedData } = typedDataResult.unwrap();

  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: "ChangeDelegatedExecutorsConfig",
    message: omit(typedData.value, "__typename"),
  });

  // broadcast onchain
  const broadcastResult = await lensClient.transaction.broadcastOnchain({
    id,
    signature: signedTypedData,
  });

  return handleBroadcastResult(broadcastResult);
};

export const getProfileManagers = async (profileId: string) => {
  try {
    const { profileManagers } = await request({
      url: apiUrls.lensAPI,
      document: GET_PROFILE_MANAGERS,
      variables: { profileId },
    });

    return profileManagers?.items?.map(({ address }) => address) || [];
  } catch (error) {
    console.log(error);
  }
};

export const useIsProfileManager = (profileId?: string | null, contractAddress?: string) => {
  return useQuery({
    queryKey: ["is-profile-manager", `${profileId}/${contractAddress}`],
    queryFn: async () => {
      if (!profileId) return false;

      const profileManagers = await getProfileManagers(profileId);

      for (const manager of profileManagers) {
        if (manager.toLowerCase() === contractAddress?.toLowerCase()) return true;
      }

      return false;
    },
    enabled: !!profileId && !!contractAddress,
  });
};
