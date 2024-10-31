import { useQuery } from "@tanstack/react-query";

import { lensClient } from "./client";

export const getPost = async (publicationId: string) => {
  try {
    return await lensClient.publication.fetch({ forId: publicationId });
  } catch (error) {
    console.log(error);
  }
};

export const useGetPost = (publicationId?: string) => {
  return useQuery({
    queryKey: ["get-post", publicationId],
    queryFn: () => getPost(publicationId!),
    enabled: !!publicationId
  });
};