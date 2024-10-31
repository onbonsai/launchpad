import { useQuery } from "@tanstack/react-query";

import { getComments } from "@src/services/lens/getReactions";

export const useGetComments = (publicationId: string, enabled = true) => {
  return useQuery({
    queryKey: [`${publicationId}/comments`],
    queryFn: () => getComments(publicationId),
    enabled
  });
};
