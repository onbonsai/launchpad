import { useQuery } from "@tanstack/react-query";
import { getPost } from "@src/services/lens/posts";
import { getComments } from "@src/services/lens/getReactions";
import { resumeSession } from "./useLensLogin";

const fetchData = async (postId: string) => {
  try {
    const sessionClient = await resumeSession();
    const [publication, comments] = await Promise.all([getPost(postId, sessionClient), getComments(postId, sessionClient)]);

    return { publication, comments };
  } catch (error) {
    console.error("Error fetching publication:", error);
    return null;
  }
};

export default (
  postId?: string,
  options?: { initialData?: { publication: any; comments: any[] } },
  authenticatedProfileId?: string | null
) => {
  return useQuery({
    queryKey: ["publication", postId, authenticatedProfileId],
    queryFn: () => fetchData(postId!),
    enabled: !!postId,
    staleTime: 60000 * 5,
    gcTime: 60000 * 10,
    initialData: options?.initialData,
  });
};
