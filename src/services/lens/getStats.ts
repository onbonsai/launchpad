import { gql } from "@apollo/client";
import { apolloClient } from "./apolloClient";

interface AccountStats {
  graphFollowStats: {
    followers: number;
    following: number;
  };
  feedStats: {
    posts: number;
    quotes: number;
  };
}

const GET_ACCOUNT_STATS = gql`
  query AccountStats($request: AccountStatsRequest!) {
    accountStats(request: $request) {
      graphFollowStats {
        followers
        following
      }
      feedStats {
        posts
        quotes
      }
    }
  }
`;

const GET_POST_ID = gql`
  query Posts($request: PostRequest!) {
    post(request: $request) {
      ... on Post {
        id
      }
    }
  }
`;

export const getAccountStats = async (localName: string): Promise<AccountStats | null> => {
  try {
    const { data } = await apolloClient.query({
      query: GET_ACCOUNT_STATS,
      variables: {
        request: {
          username: {
            localName,
          },
        },
      },
    });

    return data.accountStats;
  } catch (error) {
    console.error("Error fetching account stats:", error);
    return null;
  }
};

export const getPostId = async (slug: string): Promise<string | undefined> => {
  try {
    const { data } = await apolloClient.query({
      query: GET_POST_ID,
      variables: {
        request: {
          post: slug,
        },
      },
    });

    return data.post.id;
  } catch (error) {
    console.error("Error fetching post id:", error);
    return undefined;
  }
};
