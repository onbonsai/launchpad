import { useQuery } from "@tanstack/react-query";
import { getIsFollowedBy } from "@src/services/lens/getProfiles";

export default (authenticatedProfileId?: string | null, profileId?: string) => {
  return useQuery({
    queryKey: ["is-followed", authenticatedProfileId, profileId],
    queryFn: async () => {
      const { isFollowedByMe, canFollow } = await getIsFollowedBy(profileId!);
      return {
        isFollowed: isFollowedByMe!.value,
        canFollow: canFollow!
      };
    },
    enabled: !!authenticatedProfileId && !!profileId
  });
};