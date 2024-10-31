import { gql } from "@apollo/client";

import { apolloClientReadOnly } from "./apolloClient";

// v2 complete
const GET_PUBLICATIONS_STATS = `
query Publications($request: PublicationsRequest!) {
  publications(request: $request) {
    items {
      ... on Post {
        stats {
          id
          comments
          mirrors
          quotes
          reactions
          countOpenActions
          bookmarks
        }
      }
    }
  }
}

`;

export default async (publicationIds: string[]) => {
  const {
    data: {
      publications: { items },
    },
  } = await apolloClientReadOnly.query({
    query: gql(GET_PUBLICATIONS_STATS),
    variables: { request: { publicationIds } },
  });

  return items;
};
