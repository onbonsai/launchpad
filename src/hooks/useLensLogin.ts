import { useState } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { lensClient } from "@src/services/lens/client";

import { type Account, evmAddress } from "@lens-protocol/client";
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
export const resumeSession = async () => {
  const resumed = await lensClient.resumeSession();
  if (resumed.isErr()) {
    return console.error(resumed.error);
  }
  // SessionClient: { ... }
  const sessionClient = resumed.value;
  return sessionClient;
};

export const getAuthenticatedProfile = async (): Promise<Account | null> => {
  const sessionClient = await resumeSession();
  if (!sessionClient) return null;

  const result = await currentSession(sessionClient);

  if (result.isErr()) {
    console.error(result.error);
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
  return profile?.id;
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

      const authenticated = await lensClient.login({
        onboardingUser: {
          // app: "0xaC19aa2402b3AC3f9Fe471D4783EC68595432465",
          wallet: address,
        },
        signMessage: (message) => walletClient.signMessage({ account: address, message }),
      });

      let loginWithId = _selectedProfileId || selectedProfileId;
      if (!loginWithId) {
        const result = await fetchAvailableAccounts(address);
        const profiles = result.value.items
        if (!profiles) throw new Error("No profiles");
        loginWithId = profiles[0].id;
      }

      return authenticated;
    },
    ...(options as any),
    enabled: false,
    retry: 0,
    staleTime: 1000 * 60 * 60 * 24, // 1 day
  });

  return { ...query, setSelectedProfileId, selectedProfileId };
};
