import { gql } from "@apollo/client";

import { apolloClientReadOnly } from "./apolloClient";

// v2 complete
const GET_FOLLOWING = `
query following($request: FollowingRequest!) {
  following(request: $request) {
    items {
      id
    }
    pageInfo {
      prev
      next
    }
  }
}
`;

export const getFollowingProfileIds = async (profileId: string) => {
  const {
    data: {
      following: { items },
    },
  } = await apolloClientReadOnly.query({
    query: gql(GET_FOLLOWING),
    variables: { request: { for: profileId } },
  });

  return items.map(({ id }: { id: string }) => id);
};
