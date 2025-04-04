import { useQuery } from "@tanstack/react-query";
import { lensClient } from "@src/services/lens/client";
import { fetchPosts } from "@lens-protocol/client/actions";

export const useSearchPosts = (query: string) => {
  return useQuery({
    queryKey: ["search-posts", query],
    queryFn: async () => {
      if (!query || query.length < 2) return { items: [] };

      const result = await fetchPosts(lensClient, {
        filter: {
          searchQuery: query,
        },
      });

      if (result.isErr()) {
        console.error(result.error);
        return { items: [] };
      }

      return result.value;
    },
    enabled: query.length >= 2,
  });
};
