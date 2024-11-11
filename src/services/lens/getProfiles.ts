import { gql } from "@apollo/client";
import { LimitType } from "@lens-protocol/client";

import { apolloClient, apolloClientReadOnly } from "./apolloClient";
import { lensClient } from "./client";
import { getAccessToken } from "@src/hooks/useLensLogin";

const GET_PROFILES_BY_HANDLES = `
query($handles: [Handle!]) {
  profiles(request: { where: { handles: $handles } }) {
    items {
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
      handle {
        fullHandle
        namespace
        localName
        ownedBy
      }
      stats {
        followers
      }
      followModule {
        ... on FeeFollowModuleSettings {
          type
        }
      }
    }
  }
}
`;

const GET_PROFILES_OWNED = `
query($ownedBy: EvmAddress!) {
  profiles(request: { where: { ownedBy: [$ownedBy] } }) {
    items {
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
}

`;

const GET_PROFILE_HANDLES_BY_ID = `
query($ids: [ProfileId!]) {
  profiles(request: { where: { profileIds: $ids } }) {
    items {
      handle {
        namespace
        fullHandle
        localName
      }
    }
  }
}
`;

const GET_PROFILES_LIGHT_BY_ID = `
query($ids: [ProfileId!]) {
  profiles(request: { where: { profileIds: $ids } }) {
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
        posts
        mirrors
      }
    }
  }
}
`;

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

const GET_INTERESTS = `
query profileInterestsOptions {
  profileInterestsOptions
}
`;

// ex: lens/lensprotocol
export const getProfileByHandle = async (forHandle: string) => {
  try {
    return await lensClient.profile.fetch({ forHandle });
  } catch (error) {
    console.log(error);
  }
};

export const getProfilesByHandles = async (handles?: string[], filterFollowModule = false) => {
  try {
    if (!handles) return null;
    handles = handles.map((handle) => {
      if (process.env.NEXT_PUBLIC_CHAIN_ID === "137") {
        return handle.startsWith("lens/") ? handle : "lens/" + handle;
      } else {
        return handle.startsWith("test/") ? handle : "test/" + handle;
      }
    });

    const profiles: any[] = [];
    const invalidProfiles: string[] = [];

    // Split handles into chunks of 50
    for (let i = 0; i < handles.length; i += 50) {
      const handleChunk = handles.slice(i, i + 50);
      const response = await lensClient.profile.fetchAll({ where: { handles: handleChunk } });

      profiles.push(...response.items);

      while (response.pageInfo.next) {
        const nextPage = await response.next();
        if (nextPage) profiles.push(...nextPage.items);
      }

      invalidProfiles.push(
        ...handleChunk.filter(
          (handle) => !profiles?.find((item: any) => item.handle.fullHandle === handle),
        )
      );

      if (filterFollowModule) {
        profiles.forEach((item: any) => {
          if (item.followModule !== null) {
            invalidProfiles.push(item.handle);
          }
        });
      }
    }

    return {
      profiles: profiles?.flatMap((item: any) =>
        invalidProfiles.includes(item.handle)
          ? []
          : { id: item.id, handle: item.handle, ownedBy: item.handle.ownedBy, metadata: item.metadata, stats: item.stats },
      ),
      invalidProfiles,
    };
  } catch (error) {
    console.log(error);
  }
};

export const getProfilesOwned = async (ownedBy: string) => {
  try {
    const _profiles = await lensClient.profile.fetchAll({
      where: { ownedBy: [ownedBy] },
    });

    return _profiles?.items || [];
  } catch (error) {
    console.log(error);
  }
};

export const getProfilesManaged = async (ownedBy: string) => {
  try {
    const _profiles = await lensClient.wallet.profilesManaged({ for: ownedBy });

    return _profiles?.items || [];
  } catch (error) {
    console.log(error);
  }
};

export const getProfileById = async (forProfileId: string | null) => {
  try {
    if (!forProfileId) return null;

    return await lensClient.profile.fetch({ forProfileId });
  } catch (error) {
    console.log(error);
    return null;
  }
};

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

export const getHandlesById = async (ids?: string[]) => {
  try {
    if (!ids) return null;

    const {
      data: { profiles },
    } = await apolloClient.query({
      query: gql(GET_PROFILE_HANDLES_BY_ID),
      variables: { ids },
    });

    return profiles?.items;
  } catch (error) {
    console.log(error);
  }
};

export const getProfilesLightById = async (ids?: string[]) => {
  try {
    if (!ids) return null;

    const {
      data: { profiles },
    } = await apolloClient.query({
      query: gql(GET_PROFILES_LIGHT_BY_ID),
      variables: { ids },
    });

    return profiles?.items;
  } catch (error) {
    console.log(error);
  }
};

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
    return []
  }
};

export const getHandlesByAddresses = async (ownedBy: string[], limit = LimitType.Fifty) => {
  try {
    const _limit = limit === LimitType.Fifty ? 50 : limit === LimitType.Ten ? 10 : 25;
    const promises: any[] = [];
    const accessToken = await getAccessToken();

    for (let i = 0; i < ownedBy.length; i += _limit) {
      const _ownedBy = ownedBy.slice(i, i + _limit);
      promises.push(
        apolloClient.query({
          query: gql(GET_PROFILE_HANDLES),
          variables: { request: { where: { ownedBy: _ownedBy }, limit } },
          context: {
            headers: {
              'x-access-token': accessToken,
              authorization: `Bearer: ${accessToken}`
            }
          }
        }),
      );
    }

    const results = await Promise.all(promises);
    const items = results.map((result) => result.data.profiles.items);

    return items.flat();
  } catch (error) {
    console.log(error);
    return []
  }
};

export const getProfilesByIds = async (ids: string[], limit = "Fifty") => {
  try {
    const items: any[] = [];

    while (ids.length > 0) {
      const _ids = ids.slice(0, 50);

      const {
        data: { profiles },
      } = await apolloClientReadOnly.query({
        query: gql(GET_PROFILE_AND_FOLLOWERS),
        variables: { request: { where: { profileIds: _ids }, limit } },
      });

      items.push(profiles!.items);

      ids = ids.slice(50);
    }

    return items.flat();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getInterests = async () => {
  try {
    const {
      data: { profileInterestsOptions },
    } = await apolloClient.query({
      query: gql(GET_INTERESTS),
    });

    return profileInterestsOptions;
  } catch (error) {
    console.log(error);
  }
};
