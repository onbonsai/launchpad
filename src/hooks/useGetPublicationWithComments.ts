import { useQuery } from "@tanstack/react-query";

import { getPost } from "@src/services/lens/getPost";
import { getComments } from "@src/services/lens/getReactions";

const fetchData = async (postId: string) => {
  const [publication, comments] = await Promise.all([getPost(postId), getComments(postId)]);

  return { publication, comments };
};

export default (postId?: string) => {
  return useQuery({
    queryKey: ["publication", postId],
    queryFn: () => fetchData(postId!),
    enabled: !!postId,
    staleTime: 60000 * 5,
    gcTime: 60000 * 10,
  });
};
