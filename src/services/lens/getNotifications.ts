import { evmAddress, NotificationType } from "@lens-protocol/client";
import { fetchNotifications } from "@lens-protocol/client/actions";
import { resumeSession } from "@src/hooks/useLensLogin";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LENS_BONSAI_DEFAULT_FEED } from "../madfi/utils";

export const useGetNotifications = (authenticatedProfileId?: string | null) => {
  return useInfiniteQuery({
    queryKey: ["notifications", authenticatedProfileId],
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
    enabled: !!authenticatedProfileId,
    refetchInterval: 60000, // Fetch every minute
  });
};