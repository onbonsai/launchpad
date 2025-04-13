import { useQuery } from "@tanstack/react-query";
import { Cursor, evmAddress, NotificationType, PageSize, postId, PostType, SessionClient } from "@lens-protocol/client";
import { fetchNotifications, fetchPost, fetchPosts, fetchWhoExecutedActionOnPost, repost } from "@lens-protocol/client/actions";
import promiseLimit from "promise-limit";
import { lensClient } from "./client";
import { resumeSession } from "@src/hooks/useLensLogin";
import { groupBy, sampleSize } from "lodash";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LENS_BONSAI_DEFAULT_FEED } from "../madfi/utils";

export const useGetNotifications = (isAuthenticated?: boolean) => {
  return useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: async ({ pageParam = null }) => {
      let sessionClient;
      try {
        sessionClient = await resumeSession();
      } catch { }

      if (!sessionClient) throw new Error("no session client");

      const result = await fetchNotifications(sessionClient, {
        filter: {
          feeds: [{ feed: evmAddress(LENS_BONSAI_DEFAULT_FEED) }],
          notificationTypes: [NotificationType.Commented, NotificationType.Reacted, NotificationType.ExecutedPostAction]
        },
        cursor: pageParam,
      });

      if (result.isErr()) {
        console.log(result.error);
        throw result.error;
      }

      const { items: notifications, pageInfo } = result.value;
      return {
        notifications,
        pageInfo,
        nextCursor: pageInfo.next,
      };
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!isAuthenticated,
  });
};