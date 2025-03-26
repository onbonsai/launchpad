import { useState } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { lensClient } from "@src/services/lens/client";

import { type Account, evmAddress, SessionClient } from "@lens-protocol/client";
import { currentSession, fetchAccountsAvailable } from "@lens-protocol/client/actions";
import { fetchAuthenticatedSessions } from "@lens-protocol/client/actions";
import { WalletClient } from "viem";

export const fetchAvailableAccounts = async (address: string) => {
  return await fetchAccountsAvailable(lensClient, {
    managedBy: evmAddress(address),
    includeOwned: true,
  });
};

// returns a session client if available
export const resumeSession = async (refreshTokens = false) => {
  const resumed = await lensClient.resumeSession();
  if (resumed.isErr()) {
    return;
  }
  const sessionClient = resumed.value;

  if (refreshTokens) await currentSession(sessionClient);

  return sessionClient;
};

export const getAuthenticatedProfile = async (): Promise<Account | null> => {
  let sessionClient: SessionClient | undefined;
  try {
    sessionClient = await resumeSession();
    if (!sessionClient) return null;
  } catch {
    return null;
  }

  const result = await currentSession(sessionClient);

  if (result.isErr()) {
    return null;
  }

  // AuthenticatedSession: { authenticationId: UUID, app: EvmAddress, ... }
  const session = result.value;

  const users = await fetchAvailableAccounts(session.signer);

  if (users.isErr()) {
    console.log("failed to fetch available accounts");
    return null;
  }

  // TODO: just returns first account for authenticated user
  return users.value.items[0].account;
};

// TODO: profile id should be deprecated throughout
export const getAuthenticatedProfileId = async (): Promise<string | undefined> => {
  const profile = await getAuthenticatedProfile();
  return profile?.address;
}

export const getAuthenticatedSession = async () => {
  const sessionClient = await resumeSession();
  if (!sessionClient) return null;

  const result = await currentSession(sessionClient);

  if (result.isErr()) {
    return console.error(result.error);
  }

  // AuthenticatedSession: { authenticationId: UUID, app: EvmAddress, ... }
  const session = result.value;

  // signer is the address of the authenticated account
  return session.signer;
};

export const logout = async () => {
  const sessionClient = await resumeSession();
  if (!sessionClient) return null;

  await sessionClient.logout();
};

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
};

export const useIsAuthenticated = () => {
  return useQuery({
    queryKey: ["lens-authenticated"],
    queryFn: async () => {
      const sessionClient = await resumeSession();
      if (!sessionClient) return false;

      const result = await fetchAuthenticatedSessions(sessionClient);
      return result.isOk() && result.value.items.length > 0;
    },
    enabled: true,
  });
};

// basic login, for more functionality. see `useLensSignIn`
export const useLensLogin = (options: UseQueryOptions = {}, walletClient?: WalletClient) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>();

  const query = useQuery({
    queryKey: ["lens-login"],
    queryFn: async ({ queryKey }) => {
      const [_, _selectedProfileId] = queryKey;
      if (!walletClient) return false;

      const [address] = await walletClient.getAddresses();

      let loginWithId = _selectedProfileId || selectedProfileId;
      if (!loginWithId) {
        const availableAccounts = await fetchAvailableAccounts(address);
        if (availableAccounts.isErr()) return false;
        loginWithId = availableAccounts.value.items[0].account;
      }

      const authenticated = await lensClient.login({
        accountOwner: {
          // app: "", // TODO: add app
          owner: address,
          account: loginWithId,
        },
        signMessage: (message) => walletClient.signMessage({ account: address, message }),
      });

      return authenticated;
    },
    ...(options as any),
    enabled: false,
    retry: 0,
    staleTime: 1000 * 60 * 60 * 24, // 1 day
  });

  return { ...query, setSelectedProfileId, selectedProfileId };
};
