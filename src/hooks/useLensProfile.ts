import { useQuery } from "@tanstack/react-query";
import type { Account } from "@lens-protocol/client";

import { getDefaultProfile } from "@src/services/lens/getDefaultProfile";
import { getProfilesOwned } from "@src/services/lens/getProfiles";

import { getAuthenticatedProfile } from "./useLensLogin";

export const fetchLensProfile = async (address: string | `0x${string}` | undefined): Promise<Account> => {
  const [
    {
      data: { defaultProfile },
    },
    profiles,
  ] = await Promise.all([getDefaultProfile(address), getProfilesOwned(address as `0x${string}`)]);
  const profile = profiles?.length ? profiles[0] : null;

  return defaultProfile || profile;
};

export const useLensProfile = (address: string | `0x${string}` | undefined) => {
  return useQuery({
    queryKey: ["lensProfile", address],
    queryFn: () => fetchLensProfile(address),
    enabled: !!address,
  });
};

export const useAuthenticatedLensProfile = () => {
  return useQuery({
    queryKey: ["lensProfile-authenticated"],
    queryFn: async () => {
      const profile = await getAuthenticatedProfile();
      return profile;
    },
  });
};
