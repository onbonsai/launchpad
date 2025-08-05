import { evmAddress, NotificationType, PaginatedResultInfo, Notification } from "@lens-protocol/client";
import { fetchNotifications } from "@lens-protocol/client/actions";
import { resumeSession } from "@src/hooks/useLensLogin";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LENS_BONSAI_DEFAULT_FEED } from "../madfi/utils";

type NotificationsResponse = {
  notifications: readonly Notification[];
  pageInfo: PaginatedResultInfo;
  nextCursor: string | null;
};

export const useGetNotifications = (authenticatedProfileId?: string | null) => {
  return useInfiniteQuery<
    NotificationsResponse,
    Error,
    { pages: NotificationsResponse[] },
    (string | null | undefined)[],
    string | null
  >({
    queryKey: ["notifications", authenticatedProfileId],
    queryFn: async ({ pageParam }) => {
      let sessionClient;
      try {
        sessionClient = await resumeSession();
      } catch {}

      if (!sessionClient) throw new Error("no session client");

      const result = await fetchNotifications(sessionClient, {
        filter: {
          feeds: [{ feed: evmAddress(LENS_BONSAI_DEFAULT_FEED) }],
          notificationTypes: [
            NotificationType.Commented,
            NotificationType.Reacted,
            NotificationType.ExecutedPostAction,
            NotificationType.TokenDistributed,
          ],
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
    enabled: !!authenticatedProfileId,
    refetchInterval: 5000, // Fetch every 5s instead of 15s
    refetchIntervalInBackground: true,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    gcTime: 0,
    retry: true,
    retryDelay: 1000,
  });
};
