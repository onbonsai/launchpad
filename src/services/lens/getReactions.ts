import { gql } from "@apollo/client";
import { CommentFragment } from "@lens-protocol/client";

import { apolloClient } from "./apolloClient";
import { lensClient } from "./client";

// v2 complete
const GET_REACTIONS = `
query GetReactions($publicationId: PublicationId!) {
  whoReacted: whoReactedPublication(request: { for: $publicationId }) {
    items {
      profile {
        id
        handle {
          namespace
          localName
        }
        ownedBy {
          address
        }
      }
      reactions {
        reaction
      }
    }
  }

  whoActed: whoActedOnPublication(request: { on: $publicationId }) {
    items {
      id
      handle {
        namespace
        localName
      }
      ownedBy {
        address
      }
    }
  }

  whoMirrored: profiles(
    request: { where: { whoMirroredPublication: $publicationId } }
  ) {
    items {
      id
      handle {
        namespace
        localName
      }
      ownedBy {
        address
      }
    }
  }

  whoCommented: profiles(
    request: { where: { whoCommentedOn: $publicationId } }
  ) {
    items {
      id
      handle {
        namespace
        localName
      }
      ownedBy {
        address
      }
    }
  }

  whoQuoted: profiles(
    request: { where: { whoQuotedPublication: $publicationId } }
  ) {
    items {
      id
      handle {
        namespace
        localName
      }
      ownedBy {
        address
      }
    }
  }
}
`;

export const getReactions = async (pubIds: string[]) => {
  // Fetch the reactions for each winning publication
  const reactions = await Promise.all(
    pubIds.map(async (publicationId) => {
      try {
        const response = await apolloClient.query({
          query: gql(GET_REACTIONS),
          variables: { publicationId },
        });
        return response;
      } catch (error) {
        console.error(`ApolloError: Publication ${publicationId} does not exist`);
        return { publicationId,  data: null };
      }
    }),
  );

  return reactions;
};

export const getComments = async (publicationId: string): Promise<CommentFragment[]> => {
  // Fetch the comments for a given publication
  const result = await lensClient.publication.fetchAll({
    where: { commentOn: { id: publicationId } },
  });

  return (result?.items as CommentFragment[]) || [];
};
