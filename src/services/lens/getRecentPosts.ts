import { gql } from "@apollo/client";

import { apolloClient } from "./apolloClient";

// v2 complete
const GET_RECENT_POSTS = `
query publications($request: PublicationsRequest!) {
  publications(request: $request) {
    items {
      ... on Quote {
        metadata {
          ... on VideoMetadataV3 {
            content
          }
          ... on ImageMetadataV3 {
            content
          }
          ... on AudioMetadataV3 {
            content
          }
          ... on ArticleMetadataV3 {
            content
          }
          ... on LinkMetadataV3 {
            content
          }
          ... on EmbedMetadataV3 {
            content
          }
          ... on CheckingInMetadataV3 {
            content
          }
          ... on TextOnlyMetadataV3 {
            content
          }
          ... on ThreeDMetadataV3 {
            content
          }
          ... on StoryMetadataV3 {
            content
          }
          ... on TransactionMetadataV3 {
            content
          }
          ... on MintMetadataV3 {
            content
          }
          ... on SpaceMetadataV3 {
            content
          }
          ... on LiveStreamMetadataV3 {
            content
          }
        }
      }
      ... on Comment {
        metadata {
          ... on VideoMetadataV3 {
            content
          }
          ... on ImageMetadataV3 {
            content
          }
          ... on AudioMetadataV3 {
            content
          }
          ... on ArticleMetadataV3 {
            content
          }
          ... on LinkMetadataV3 {
            content
          }
          ... on EmbedMetadataV3 {
            content
          }
          ... on CheckingInMetadataV3 {
            content
          }
          ... on TextOnlyMetadataV3 {
            content
          }
          ... on ThreeDMetadataV3 {
            content
          }
          ... on StoryMetadataV3 {
            content
          }
          ... on TransactionMetadataV3 {
            content
          }
          ... on MintMetadataV3 {
            content
          }
          ... on SpaceMetadataV3 {
            content
          }
          ... on LiveStreamMetadataV3 {
            content
          }
        }
      }
      ... on Post {
        metadata {
          ... on VideoMetadataV3 {
            content
          }
          ... on ImageMetadataV3 {
            content
          }
          ... on AudioMetadataV3 {
            content
          }
          ... on ArticleMetadataV3 {
            content
          }
          ... on LinkMetadataV3 {
            content
          }
          ... on EmbedMetadataV3 {
            content
          }
          ... on CheckingInMetadataV3 {
            content
          }
          ... on TextOnlyMetadataV3 {
            content
          }
          ... on ThreeDMetadataV3 {
            content
          }
          ... on StoryMetadataV3 {
            content
          }
          ... on TransactionMetadataV3 {
            content
          }
          ... on MintMetadataV3 {
            content
          }
          ... on SpaceMetadataV3 {
            content
          }
          ... on LiveStreamMetadataV3 {
            content
          }
        }
      }
    }
  }
}
`;

export const getRecentPosts = async (profileId: string) => {
  const {
    data: {
      publications: { items },
    },
  } = await apolloClient.query({
    query: gql(GET_RECENT_POSTS),
    variables: {
      request: {
        limit: "Ten",
        where: {
          from: [profileId],
        },
      },
    },
  });
  return items
    .filter((item: any) => item?.metadata?.content)
    .map((item: any) => item.metadata.content);
};
