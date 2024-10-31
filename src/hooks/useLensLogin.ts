import { useState } from 'react';
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { getProfilesOwned } from "@src/services/lens/getProfiles";
import { lensClient } from "@src/services/lens/client";

export const getAccessToken = async () => {
  const accessTokenResult = await lensClient.authentication.getAccessToken();
  return accessTokenResult.unwrap();
};

export const getAuthenticatedProfileId = async () => {
  return await lensClient.authentication.getProfileId();
};

export const logout = async () => {
  await lensClient.authentication.logout();
};

export const useAuthenticatedAccessToken = () => {
  return useQuery({
    queryKey: ["lens-authenticated-access-token"],
    queryFn: async () => {
      const res = await getAccessToken();
      return res || null;
    },
    enabled: true,
  });
}

export const useAuthenticatedProfileId = () => {
  const result = useQuery({
    queryKey: ["lens-authenticated-profileId"],
    queryFn: async () => {
      const res = await getAuthenticatedProfileId();
      return res || null;
    },
    enabled: true,
  });

  return result;
}

export const useIsAuthenticated = () => {
  return useQuery({
    queryKey: ["lens-authenticated"],
    queryFn: async () => {
      return await lensClient.authentication.isAuthenticated();
    },
    enabled: true,
  });
};

// basic login, for more functionality. see `useLensSignIn`
export const useLensLogin = (options: UseQueryOptions = {}, walletClient?: any) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>();

  const query = useQuery({
    queryKey: ["lens-login"],
    queryFn: async ({ queryKey }) => {
      const [_, _selectedProfileId] = queryKey;
      if (!(walletClient)) return false;

      const [address] = await walletClient.getAddresses();

      let loginWithId = _selectedProfileId || selectedProfileId;
      if (!loginWithId) {
        const [defaultProfile] = await getProfilesOwned(address);
        if (!defaultProfile) throw new Error('No profiles');
        loginWithId = defaultProfile.id;
      }

      // TODO: handle sign in with tba
      const { id, text } = await lensClient.authentication.generateChallenge({
        signedBy: address,
        for: loginWithId,
      });

      const signature = await walletClient.signMessage({ account: address, message: text });

      await lensClient.authentication.authenticate({ id, signature });

      return true;
    },
    ...(options as any),
    enabled: false,
    retry: 0,
    staleTime: 1000 * 60 * 60 * 24, // 1 day
  });

  return { ...query, setSelectedProfileId, selectedProfileId };
};
