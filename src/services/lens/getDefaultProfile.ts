import { gql } from "@apollo/client";
import { ProfileFragment } from "@lens-protocol/client";

import { apolloClient } from "./apolloClient";

// v2 complete
const GET_DEFAULT_PROFILE = `
query($request: DefaultProfileRequest!) {
  defaultProfile(request: $request) {
    id
    metadata {
      displayName
      bio
      coverPicture {
        ... on ImageSet {
          optimized {
            uri
          }
        }
      }
      picture {
        ... on NftImage {
          image {
            optimized {
              uri
            }
          }
        }
        ... on ImageSet {
          optimized {
            uri
          }
        }
      }
    }
    interests
    handle {
      id
      fullHandle
      namespace
      localName
      suggestedFormatted {
        localName
      }
    }
    ownedBy {
      address
      chainId
    }
    stats {
      followers
      following
      comments
      posts
      mirrors
      publications
      countOpenActions
    }
    followModule {
      ... on FeeFollowModuleSettings {
        type
        contract {
          address
          chainId
        }
        amount {
          asset {
            ... on Erc20 {
              name
              decimals
              symbol
            }
          }
          value
        }
        recipient
      }
      ... on RevertFollowModuleSettings {
        type
      }
    }
  }
}
`;

interface GetDefaultProfileResponse {
  data: { defaultProfile: ProfileFragment };
}

export const getDefaultProfile = (ethereumAddress: string | `0x${string}` | undefined) => {
  return apolloClient.query({
    query: gql(GET_DEFAULT_PROFILE),
    variables: {
      request: {
        for: ethereumAddress,
      },
    },
  }) as unknown as Promise<GetDefaultProfileResponse>;
};
