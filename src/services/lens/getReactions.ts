import { gql } from "@apollo/client";

import { apolloClient } from "./apolloClient";
import { lensClient } from "./client";
import { addReaction, fetchPostReferences } from "@lens-protocol/client/actions";
import { postId, PostReferenceType, SessionClient } from "@lens-protocol/client";
import { resumeSession } from "@src/hooks/useLensLogin";

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

/**
 * Sends a like to a publication
 * @param publicationId - The ID or slug of the publication to like
 */
export const sendLike = async (publicationId: string) => {
  const sessionClient = await resumeSession();
  if (!sessionClient) return;

  await addReaction(sessionClient, {
    post: postId(publicationId),
    reaction: "UPVOTE",
  });
};

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
        return { publicationId, data: null };
      }
    }),
  );

  return reactions;
};

export const getComments = async (slug: string, sessionClient?: SessionClient): Promise<any> => {
  try {
    const result = await fetchPostReferences(sessionClient || lensClient, {
      referencedPost: postId(slug),
      referenceTypes: [PostReferenceType.CommentOn],
    });

    if (result.isErr()) {
      console.error(result.error);
      return [];
    }

    // items: Array<AnyPost>
    const { items, pageInfo } = result.value;

    return items;
  } catch (error) {
    return [];
  }
};
