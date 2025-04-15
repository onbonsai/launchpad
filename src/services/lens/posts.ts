import { useQuery } from "@tanstack/react-query";
import { Cursor, evmAddress, PageSize, postId, PostType, SessionClient } from "@lens-protocol/client";
import { fetchPost, fetchPosts, fetchWhoExecutedActionOnPost, repost } from "@lens-protocol/client/actions";
import promiseLimit from "promise-limit";
import { lensClient } from "./client";
import { resumeSession } from "@src/hooks/useLensLogin";
import { groupBy, sampleSize } from "lodash";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LENS_BONSAI_DEFAULT_FEED } from "../madfi/utils";

export const getPost = async (_postId: string, sessionClient?: SessionClient) => {
  try {
    const result = await fetchPost(sessionClient || lensClient, {
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

// TODO: this is a temporary function to get posts from lens v3; need a way to fetch by ids
export const getPosts = async (publicationIds: string[]) => {
  const FETCH_POSTS_BATCH_SIZE = 15;
  try {
    const limit = promiseLimit(FETCH_POSTS_BATCH_SIZE);
    const posts = await Promise.all(publicationIds.map(id => limit(() => getPost(id))));

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

export const getPostsByAuthor = async (authorId: string, cursor?: Cursor | null) => {
  return await fetchPosts(lensClient, {
    filter: {
      authors: [evmAddress(authorId)],
      postTypes: [PostType.Root],
      feeds: [{ feed: evmAddress(LENS_BONSAI_DEFAULT_FEED) }]
    },
    pageSize: PageSize.Ten,
    cursor
  });
};

export const getPostsCollectedBy = async (authorId: string, cursor?: Cursor | null) => {
  return await fetchPosts(lensClient, {
    filter: {
      postTypes: [PostType.Root],
      feeds: [{ feed: evmAddress(LENS_BONSAI_DEFAULT_FEED) }],
      collectedBy: { account: evmAddress(authorId) }
    },
    pageSize: PageSize.Ten,
    cursor
  });
}

export const useGetPostsByAuthor = (authorId?: string, getCollected: boolean = false) => {
  return useInfiniteQuery({
    queryKey: ["get-posts-by-author", authorId, getCollected],
    queryFn: async ({ pageParam = null }) => {
      const result = !getCollected
        ? await getPostsByAuthor(authorId, pageParam)
        : await getPostsCollectedBy(authorId, pageParam);

      if (result.isErr()) {
        console.log(result.error);
        throw result.error;
      }

      const { items: posts, pageInfo } = result.value;
      return {
        posts,
        pageInfo,
        nextCursor: pageInfo.next,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!authorId
  });
};

interface GetExplorePostsProps {
  isLoadingAuthenticatedProfile: boolean;
  accountAddress?: `0x${string}`;
  cursor?: Cursor;
};

// TODO: need filter for feed for explore/foryou
export const useGetExplorePosts = ({ isLoadingAuthenticatedProfile, accountAddress }: GetExplorePostsProps) => {
  return useInfiniteQuery({
    queryKey: ["explore-posts", accountAddress],
    queryFn: async ({ pageParam = null }) => {
      let sessionClient;
      try {
        sessionClient = await resumeSession();
      } catch {}

      const result = await fetchPosts(sessionClient || lensClient, {
        filter: {
          postTypes: [PostType.Root],
          // apps: [evmAddress(LENS_BONSAI_APP)]
          feeds: [{ feed: evmAddress(LENS_BONSAI_DEFAULT_FEED) }]
        },
        pageSize: PageSize.Ten,
        cursor: pageParam,
      });

      if (result.isErr()) {
        console.log(result.error);
        throw result.error;
      }

      const { items: posts, pageInfo } = result.value;
      return {
        posts,
        postData: await getPostData(posts?.map(({ slug }) => slug)),
        pageInfo,
        nextCursor: pageInfo.next,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isLoadingAuthenticatedProfile === false,
  });
};

export const getPostData = async (postIds: string[]): Promise<Object> => {
  const FETCH_ACTORS_BATCH_SIZE = 10;
  let sessionClient;
  try {
    sessionClient = await resumeSession();
  } catch { }

  // TODO: this is a temporary solution until we can batch query
  const limit = promiseLimit(FETCH_ACTORS_BATCH_SIZE);
  const results = await Promise.all(postIds.map((_postId) => limit(async () => {
    const result = await fetchWhoExecutedActionOnPost(sessionClient || lensClient, { post: postId(_postId) });
    if (result.isErr()) return;

    // try to get the actors followed by me
    let actors = result.value.items;
    if (sessionClient) {
      actors = actors.filter((a) => a.account.operations?.isFollowedByMe);
    }
    return { postId: _postId, actors: sampleSize(actors, 3) };
  })));

  const grouped = groupBy(results.filter((r) => r), 'postId');
  return Object.fromEntries(
    Object.entries(grouped).map(([key, value]) => [key, value[0]])
  );
};

/**
 * Rpost
 * @param publicationId - The ID or slug of the publication to like
 */
export const sendRepost = async (_postId: string): Promise<boolean> => {
  const sessionClient = await resumeSession();
  if (!sessionClient) return false;

  const result = await repost(sessionClient, {
    post: postId(_postId),
  });

  return result.isOk();
};