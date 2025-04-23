import { useState } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { lensClient } from "@src/services/lens/client";

import { type Account, evmAddress, SessionClient } from "@lens-protocol/client";
import { currentSession, fetchAccount, fetchAccountsAvailable } from "@lens-protocol/client/actions";
import { fetchAuthenticatedSessions } from "@lens-protocol/client/actions";
import { WalletClient } from "viem";
import { LENS_BONSAI_APP } from "@src/services/madfi/utils";

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

  const user = sessionClient.getAuthenticatedUser();
  if (user.isErr()) return null;

  const result = await fetchAuthenticatedSessions(sessionClient);
  const isOk = result.isOk() && result.value.items.length > 0;
  if (!isOk) return null;

  const account = await fetchAccount(sessionClient, { address: user.value.address  });
  return account.isOk() ? account.value : null;
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
  const [selectedProfile, setSelectedProfile] = useState<Account | undefined>();

  const query = useQuery({
    queryKey: ["lens-login"],
    queryFn: async ({ queryKey }) => {
      const [_, _selectedProfileId] = queryKey;
      if (!walletClient) return false;

      const [address] = await walletClient.getAddresses();

      let loginWithId = _selectedProfileId || selectedProfile?.address;
      if (!loginWithId) {
        const availableAccounts = await fetchAvailableAccounts(address);
        if (availableAccounts.isErr()) return false;
        loginWithId = availableAccounts.value.items[0].account;
      }

      let authenticated;
      if (selectedProfile?.owner.toLowerCase() === address.toLowerCase()) { // as account owner
        authenticated = await lensClient.login({
          accountOwner: {
            app: LENS_BONSAI_APP,
            owner: address,
            account: loginWithId,
          },
          signMessage: (message) => walletClient.signMessage({ account: address, message }),
        });
      } else { // as account manager
        authenticated = await lensClient.login({
          accountManager: {
            app: LENS_BONSAI_APP,
            manager: address,
            account: loginWithId,
          },
          signMessage: (message) => walletClient.signMessage({ account: address, message }),
        });
      }

      return authenticated;
    },
    ...(options as any),
    enabled: false,
    retry: 0,
    staleTime: 1000 * 60 * 60 * 24, // 1 day
  });

  return { ...query, setSelectedProfile, selectedProfile };
};
