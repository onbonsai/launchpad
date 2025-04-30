import { useQuery } from "@tanstack/react-query";
import { Cursor, evmAddress, PageSize, postId, PostType, SessionClient } from "@lens-protocol/client";
import { fetchPost, fetchPosts, fetchTimeline, fetchWhoExecutedActionOnPost, repost } from "@lens-protocol/client/actions";
import promiseLimit from "promise-limit";
import { lensClient } from "./client";
import { resumeSession } from "@src/hooks/useLensLogin";
import { groupBy, sampleSize, uniqBy } from "lodash";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LENS_BONSAI_APP, LENS_BONSAI_DEFAULT_FEED } from "../madfi/utils";
import { getPostPresenceData } from "../madfi/terminal";

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

export const getPosts = async (publicationIds: string[], sessionClient?: SessionClient) => {
  try {
    const result = await fetchPosts(sessionClient || lensClient, {
      filter: { posts: publicationIds }
    });

    return result.isOk() ? result.value.items : [];
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
  let sessionClient;
  try {
    sessionClient = await resumeSession();
  } catch { }
  return await fetchPosts(sessionClient || lensClient, {
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
  let sessionClient;
  try {
    sessionClient = await resumeSession();
  } catch { }
  return await fetchPosts(sessionClient || lensClient, {
    filter: {
      postTypes: [PostType.Root],
      feeds: [{ feed: evmAddress(LENS_BONSAI_DEFAULT_FEED) }],
      collectedBy: { account: evmAddress(authorId) }
    },
    pageSize: PageSize.Ten,
    cursor
  });
}

export const useGetPostsByAuthor = (enabled: boolean, authorId?: string, getCollected: boolean = false, _getPostData = false) => {
  return useInfiniteQuery({
    queryKey: ["get-posts-by-author", authorId, getCollected],
    queryFn: async ({ pageParam = null }) => {
      const result = !getCollected
        ? await getPostsByAuthor(authorId!, pageParam)
        : await getPostsCollectedBy(authorId!, pageParam);

      if (result.isErr()) {
        console.log(result.error);
        throw result.error;
      }

      const { items: posts, pageInfo } = result.value;
      return {
        posts,
        postData: _getPostData ? await getPostData(posts?.map(({ slug }) => slug) || []) : {},
        pageInfo,
        nextCursor: pageInfo.next,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && !!authorId
  });
};

interface GetExplorePostsProps {
  isLoadingAuthenticatedProfile: boolean;
  enabled: boolean;
  accountAddress?: `0x${string}`;
  cursor?: Cursor;
};

// TODO: need filter for feed for explore/foryou
export const useGetExplorePosts = ({ isLoadingAuthenticatedProfile, accountAddress, enabled }: GetExplorePostsProps) => {
  return useInfiniteQuery({
    queryKey: ["explore-posts", accountAddress],
    queryFn: async ({ pageParam }) => {
      let sessionClient;
      try {
        sessionClient = await resumeSession();
      } catch { }

      const result = await fetchPosts(sessionClient || lensClient, {
        filter: {
          postTypes: [PostType.Root],
          // apps: [evmAddress(LENS_BONSAI_APP)]
          feeds: [{ feed: evmAddress(LENS_BONSAI_DEFAULT_FEED) }]
        },
        pageSize: PageSize.Fifty,
        cursor: pageParam as Cursor | null,
      });

      if (result.isErr()) {
        console.log(result.error);
        throw result.error;
      }

      const { items: posts, pageInfo } = result.value;
      return {
        posts,
        postData: await getPostData(posts?.map(({ slug }) => slug) || []),
        pageInfo,
        nextCursor: pageInfo.next,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isLoadingAuthenticatedProfile === false && enabled,
  });
};

export const useGetTimeline = ({ isLoadingAuthenticatedProfile, accountAddress, enabled }: GetExplorePostsProps) => {
  return useInfiniteQuery({
    queryKey: ["timeline", accountAddress],
    queryFn: async ({ pageParam }) => {
      let sessionClient;
      try {
        sessionClient = await resumeSession();
      } catch { }

      const result = await fetchTimeline(sessionClient || lensClient, {
        account: evmAddress(accountAddress as string),
        filter: {
          apps: [evmAddress(LENS_BONSAI_APP)]
          // feeds: [
          //   {
          //     feed: evmAddress(LENS_BONSAI_DEFAULT_FEED)
          //   }
          // ]
        },
        cursor: pageParam as Cursor | null,
      });

      if (result.isErr()) {
        console.log(result.error);
        throw result.error;
      }

      const { items: timelineItems, pageInfo } = result.value;
      const posts = uniqBy(timelineItems.map((t) => t.primary), 'slug');

      return {
        posts: timelineItems, // we'll handle these differently in PostCollage
        postData: await getPostData(posts?.map(({ slug }) => slug) || []),
        pageInfo,
        nextCursor: pageInfo.next,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isLoadingAuthenticatedProfile === false && !!accountAddress && enabled,
  });
};

export const getPostData = async (postIds: string[]): Promise<Object> => {
  const FETCH_ACTORS_BATCH_SIZE = 10;
  let sessionClient;
  try {
    sessionClient = await resumeSession();
  } catch { }

  // Fetch both actors and presence data in parallel
  const [actorsResults, presenceData] = await Promise.all([
    Promise.all(postIds.map((_postId) =>
      promiseLimit(FETCH_ACTORS_BATCH_SIZE)(async () => {
        const result = await fetchWhoExecutedActionOnPost(sessionClient || lensClient, { post: postId(_postId) });
        if (result.isErr()) return;

        let actors = result.value.items;
        if (sessionClient) {
          actors = actors.filter((a) => a.account.operations?.isFollowedByMe);
        }
        return { postId: _postId, actors: sampleSize(actors, 3) };
      })
    )),
    getPostPresenceData(postIds)
  ]);

  const groupedActors = groupBy(actorsResults.filter((r) => r), 'postId');

  return Object.fromEntries(
    Object.entries(groupedActors).map(([postId, value]) => [
      postId,
      {
        // @ts-ignore
        ...value[0],
        presence: presenceData[postId] || { count: 0, topUsers: [] }
      }
    ])
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