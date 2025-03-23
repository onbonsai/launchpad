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

export const getAccountStats = async (localName: string): Promise<AccountStats | null> => {
  try {
    const { data } = await apolloClient.query({
      query: GET_ACCOUNT_STATS,
      variables: {
        request: {
          username: {
            localName
          }
        }
      }
    });
    
    return data.accountStats;
  } catch (error) {
    console.error('Error fetching account stats:', error);
    return null;
  }
}; 