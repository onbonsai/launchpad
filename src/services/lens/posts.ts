import { useQuery } from "@tanstack/react-query";
import { Account, Cursor, evmAddress, postId, txHash } from "@lens-protocol/client";
import { fetchPost, fetchPosts } from "@lens-protocol/client/actions";
import { lensClient } from "./client";
import { APP_ID } from "../madfi/studio";

export const getPost = async (_postId: string) => {
  try {
    const result = await fetchPost(lensClient, {
      post: postId(_postId),
    });

    if (result.isErr()) {
      return console.error(result.error);
    }

    const post = result.value;
    return post;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// TODO: this is a temporary function to get posts from lens v3
export const getPosts = async (publicationIds: string[]) => {
  try {
    const posts = await Promise.all(publicationIds.map((id) => getPost(id)));

    return posts.filter(Boolean);
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const useGetPost = (publicationId?: string) => {
  return useQuery({
    queryKey: ["get-post", publicationId],
    queryFn: () => getPost(publicationId!),
    enabled: !!publicationId,
  });
};

// TODO: enable pagination
export const getPostsByAuthor = async (authorId: string) => {
  const result = await fetchPosts(lensClient, {
    filter: {
      authors: [evmAddress(authorId)],
    },
  });

  if (result.isErr()) {
    return console.error(result.error);
  }

  // items: Array<Post>
  const { items, pageInfo } = result.value;

  return items;
};

export const useGetPostsByAuthor = (authorId: string) => {
  return useQuery({
    queryKey: ["get-posts-by-author", authorId],
    queryFn: () => getPostsByAuthor(authorId),
  });
};

interface GetExplorePostsProps {
  accountAddress?: `0x${string}`; // authenticatedProfile.address
  cursor?: Cursor;
  withToken?: boolean;
}

// TODO:
// - personalized by tags?
// - enriched with token data?
// - sorted by engagement? or token mcap?
export const useGetExplorePosts = ({ accountAddress, cursor, withToken }: GetExplorePostsProps) => {
  return useQuery({
    queryKey: ["explore-posts", accountAddress],
    queryFn: async () => {
      const result = await fetchPosts(lensClient, {
        filter: {
          metadata: {
            tags: {
              all: [APP_ID]
            }
          }
        },
        cursor
      });

      if (result.isErr()) {
        console.log(result.error);
        return;
      }

      const { items: posts, pageInfo } = result.value;

      // if (withToken) {

      // }

      return { posts, pageInfo };
    },
  });
}