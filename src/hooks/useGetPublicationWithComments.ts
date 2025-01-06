import { useQuery } from "@tanstack/react-query";

import { getPost } from "@src/services/lens/getPost";
import { getComments } from "@src/services/lens/getReactions";

const fetchData = async (publicationId: string) => {
  const [publication, comments] = await Promise.all([
    getPost(publicationId),
    getComments(publicationId)
  ]);

  return { publication, comments };
}

export default (publicationId?: string) => {
  return useQuery({
    queryKey: ["publication", publicationId],
    queryFn: () => fetchData(publicationId!),
    enabled: !!publicationId,
    staleTime: 60000 * 5,
    gcTime: 60000 * 10,
  });
};