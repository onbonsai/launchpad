import { useQuery } from "@tanstack/react-query";
import { getAuthenticatedProfile } from "./useLensLogin";

export const useAuthenticatedLensProfile = () => {
  return useQuery({
    queryKey: ["lensProfile-authenticated"],
    queryFn: async () => {
      const profile = await getAuthenticatedProfile();
      return profile;
    },
  });
};
