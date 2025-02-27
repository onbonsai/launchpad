import { gql } from "@apollo/client";
import { evmAddress, LimitType } from "@lens-protocol/client";

import { apolloClient, apolloClientReadOnly } from "./apolloClient";
import { lensClient } from "./client";
import { fetchAvailableAccounts, getAccessToken } from "@src/hooks/useLensLogin";
import { fetchAccount } from "@lens-protocol/client/actions";

const GET_PROFILE_AND_FOLLOWERS = `
query($request: ProfilesRequest!) {
  profiles(request: $request) {
    items {
      id
      ownedBy {
        address
      }
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
      handle {
        id
        fullHandle
        namespace
        localName
      }
      stats {
        followers
        following
        comments
        posts
        mirrors
      }
    }
  }
}
`;

const GET_PROFILE_HANDLES = `
query($request: ProfilesRequest!) {
  profiles(request: $request) {
    items {
      id
      ownedBy {
        address
      }
      operations {
        isFollowedByMe { value }
      }
      metadata {
        displayName
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
      handle {
        id
        fullHandle
        namespace
        localName
      }
    }
  }
}
`;

export const getProfileByHandle = async (forHandle: string) => {
  const result = await fetchAccount(lensClient, {
    username: {
      localName: forHandle,
    },
  });

  if (result.isErr()) {
    return console.error(result.error);
  }

  const account = result.value;
  return account;
};

export const getProfilesOwned = async (ownedBy: string) => {
  try {
    const _profiles = await fetchAvailableAccounts(ownedBy);
    // @ts-ignore
    return _profiles.value.items;
  } catch (error) {
    console.log(error);
  }
};

export const getProfileByAddress = async (address: string) => {
  const result = await fetchAccount(lensClient, {
    address: evmAddress(address),
  });

  if (result.isErr()) {
    return console.error(result.error);
  }

  const account = result.value;
  return account;
};

// TODO: outdated
export const getIsFollowedBy = async (forProfileId: string) => {
  try {
    const isFollowedByMe = await lensClient.profile.fetch({ forProfileId });
    return {
      isFollowedByMe: isFollowedByMe?.operations?.isFollowedByMe,
      canFollow: isFollowedByMe?.operations?.canFollow == "YES",
    };
  } catch (error) {
    console.log(error);
    return {};
  }
};

// TODO: outdated
export const getHandleAndFollowersByAddresses = async (ownedBy: string[], limit = LimitType.Fifty) => {
  try {
    const _limit = limit === LimitType.Fifty ? 50 : limit === LimitType.Ten ? 10 : 25;
    const promises: any[] = [];

    for (let i = 0; i < ownedBy.length; i += _limit) {
      const _ownedBy = ownedBy.slice(i, i + _limit);
      promises.push(
        apolloClient.query({
          query: gql(GET_PROFILE_AND_FOLLOWERS),
          variables: { request: { where: { ownedBy: _ownedBy }, limit } },
        }),
      );
    }

    const results = await Promise.all(promises);
    const items = results.map((result) => result.data.profiles.items);

    return items.flat();
  } catch (error) {
    console.log(error);
    return [];
  }
};

// TODO: outdated
export const getHandlesByAddresses = async (ownedBy: string[], limit = LimitType.Fifty) => {
  try {
    const _limit = limit === LimitType.Fifty ? 50 : limit === LimitType.Ten ? 10 : 25;
    const promises: any[] = [];
    let accessToken;
    try {
      accessToken = await getAccessToken();
    } catch {}

    for (let i = 0; i < ownedBy.length; i += _limit) {
      const _ownedBy = ownedBy.slice(i, i + _limit);
      promises.push(
        apolloClient.query({
          query: gql(GET_PROFILE_HANDLES),
          variables: { request: { where: { ownedBy: _ownedBy }, limit } },
          context: {
            headers: accessToken
              ? {
                  "x-access-token": accessToken,
                  authorization: `Bearer: ${accessToken}`,
                }
              : undefined,
          },
        }),
      );
    }

    const results = await Promise.all(promises);
    const items = results.map((result) => result.data.profiles.items);

    return items.flat();
  } catch (error) {
    console.log(error);
    return [];
  }
};
