import { useQuery } from '@tanstack/react-query';
import { lensClient } from "@src/services/lens/client";
import { fetchAccounts } from '@lens-protocol/client/actions';

export const useSearchProfiles = (query: string) => {
  return useQuery({
    queryKey: ['search-profiles', query],
    queryFn: async () => {
      if (!query || query.length < 2) return { items: [] };
      
      const result = await fetchAccounts(lensClient, {
        filter: {
          searchBy: {
            localNameQuery: query,
          },
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