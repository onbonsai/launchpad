import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Cursor, evmAddress, postId, PostType, SessionClient } from "@lens-protocol/client";
import { fetchPost, fetchPosts, fetchWhoExecutedActionOnPost } from "@lens-protocol/client/actions";
import { lensClient } from "./client";
import { APP_ID } from "../madfi/studio";
import { resumeSession } from "@src/hooks/useLensLogin";
import { groupBy, sampleSize } from "lodash";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LENS_BONSAI_APP, LENS_BONSAI_DEFAULT_FEED } from "../madfi/utils";

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
      postTypes: [PostType.Root],
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
  isLoadingAuthenticatedProfile: boolean;
  accountAddress?: `0x${string}`;
  cursor?: Cursor;
};

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

// TODO: consider using resolveSmartMedia or a batched version to fetch more info
export const getPostData = async (postIds: string[]): Promise<Object> => {
  let sessionClient;
  try {
    sessionClient = await resumeSession();
  } catch { }

  // TODO: this is a temporary solution until we can batch query
  const results = await Promise.all(postIds.map(async (_postId) => {
    const result = await fetchWhoExecutedActionOnPost(sessionClient || lensClient, { post: postId(_postId) });
    if (result.isErr()) return;

    // try to get the actors followed by me
    let actors = result.value.items;
    if (sessionClient) {
      actors = actors.filter((a) => a.account.operations?.isFollowedByMe);
    }
    return { postId: _postId, actors: sampleSize(actors, 3) };
  }));

  const grouped = groupBy(results.filter((r) => r), 'postId');
  return Object.fromEntries(
    Object.entries(grouped).map(([key, value]) => [key, value[0]])
  );
};