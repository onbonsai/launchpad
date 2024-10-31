import { gql } from "@apollo/client";
import { waitForTransaction, writeContract } from "@wagmi/core";
import { omit } from "lodash/object";

import { apolloClient, apolloClientReadOnly } from "./apolloClient";
import { broadcastOnchain } from './broadcastMutation';
import { LENSHUB_PROXY } from "./utils";
import { LensHubProxy } from "./abi";

const COLLECT_POST_TYPED_DATA = gql`
  mutation CreateCollectTypedData($publicationId: InternalPublicationId!) {
    createCollectTypedData(request: {
      publicationId: $publicationId
    }) {
      id
      expiresAt
      typedData {
        types {
          CollectWithSig {
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
          profileId
          pubId
          data
        }
      }
    }
  }
`;

export const signCreateTypedData = async (variables, walletClient) => {
  const { data } = await apolloClient.mutate({
    mutation: COLLECT_POST_TYPED_DATA,
    variables
  });

  const result = data.createCollectTypedData;
  const typedData = result.typedData;

  const [account] = await walletClient.getAddresses();
  const signature = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: 'CollectWithSig',
    message: omit(typedData.value, "__typename"),
  });

  return { result, signature };
};

export const collectPostGasless = async (publicationId: string, walletClient: any) => {
  const signedResult = await signCreateTypedData({ publicationId }, walletClient);

  return await broadcastOnchain({
    id: [signedResult.result.id],
    signature: [signedResult.signature],
  });
};

export const collectPost = async (publicationId: string, collectModuleData: any) => {
  const [profileId, pubId] = publicationId.split("-");
  const { hash } = await writeContract({
    address: LENSHUB_PROXY,
    abi: LensHubProxy,
    functionName: "collect",
    args: [profileId, pubId, collectModuleData],
    gas: 2100000,
  });

  console.log(`tx: ${hash}`);
  await waitForTransaction({ hash });
};
