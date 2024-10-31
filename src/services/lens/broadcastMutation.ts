import request, { gql } from "graphql-request";

import { apiUrls } from "@src/constants/apiUrls";
import { getAccessToken } from "@src/hooks/useLensLogin";

// v2 complete
const BROADCAST_ONCHAIN_MUTATION = gql`
mutation broadcastOnchain($request: BroadcastRequest!) {
  broadcastOnchain(request: $request) {
    ... on RelaySuccess {
      txHash
      txId
    }
    ... on RelayError {
      reason
    }
  }
}
`;

const BROADCAST_MOMOKA_MUTATION = gql`
mutation broadcastOnMomoka($request: BroadcastRequest!) {
  broadcastOnMomoka(request: $request) {
    ... on CreateMomokaPublicationResult {
      id
      proof
      momokaId
    }
    ... on RelayError {
      reason
    }
  }
}
`;

type BroadcastRequest = {
  id: any;
  signature: any;
};

export const broadcastOnchain = async (_request: BroadcastRequest) => {
  try {
    const accessToken = await getAccessToken();
    const { broadcastOnchain } = await request({
      url: apiUrls.lensAPI,
      document: BROADCAST_ONCHAIN_MUTATION,
      variables: { request: _request },
      requestHeaders: {
        "x-access-token": accessToken,
      },
    });

    return broadcastOnchain;
  } catch (error) {
    console.log(error);
  }
};

export const broadcastOnMomoka = async (_request: BroadcastRequest) => {
  try {
    const accessToken = await getAccessToken();
    const { broadcastOnMomoka } = await request({
      url: apiUrls.lensAPI,
      document: BROADCAST_MOMOKA_MUTATION,
      variables: { request: _request },
      requestHeaders: {
        "x-access-token": accessToken,
      },
    });

    return broadcastOnMomoka;
  } catch (error) {
    console.log(error);
  }
};
