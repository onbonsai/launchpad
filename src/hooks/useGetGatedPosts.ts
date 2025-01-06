import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import { decryptGatedPosts, getGatedPosts } from "@src/services/lens/getPosts";
import { useBrowserEncryptionConfig } from "@src/hooks/useBrowserEncryptionConfig";
import useGatedClient from "@src/hooks/useGatedClient";
import { ExtendedGatedClient } from "@src/services/lens/createGatedClient";
import { chainIdNumber } from "@src/constants/validChainId";

import { useLensProfile } from "./useLensProfile";

export const useGetGatedPosts = (profileId: string) => {
  return useQuery({
    queryKey: ["gated-posts", profileId],
    queryFn: () => getGatedPosts(profileId),
    enabled: !!profileId,
    staleTime: 10000,
    gcTime: 60000,
  });
};

// NOTE: since we're relying on the lens sdk authentication, it implicitly means to decrypt, you must have a lens profile...
export const useDecryptedGatedPosts = (walletClient, gatedPosts: any[] = []) => {
  const lensGatedClientEncryption = useBrowserEncryptionConfig();
  const { gatedClient, createGatedClient } = useGatedClient();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: defaultProfile } = useLensProfile(address);
  const [canDecrypt, setCanDecrypt] = useState<boolean | undefined>();

  const _gatedClient = () => (
    gatedClient || createGatedClient(lensGatedClientEncryption, walletClient) as ExtendedGatedClient
  );

  useEffect(() => {
    const checkAuthSig = async () => {
      // if (chainId !== chainIdNumber) await switchChain({ chainId: chainIdNumber });
      const client = _gatedClient();
      if (client) {
        const res = await client.authentication.isAuthenticated();
        const res2 = client.isAuthSigCached();
        setCanDecrypt((res && res2) || false);
      }
    };

    // only attempt to auto-decrypt if the connected wallet has a profile
    if (walletClient && lensGatedClientEncryption && defaultProfile) {
      checkAuthSig();
    } else if (!walletClient) {
      setCanDecrypt(false);
    }
  }, [walletClient, lensGatedClientEncryption, defaultProfile]);

  return {
    query: useQuery({
      queryKey: ["decrypted-gated-posts-by", gatedPosts[0]?.by?.id],
      queryFn: () => decryptGatedPosts(gatedClient!, gatedPosts, canDecrypt!, walletClient, defaultProfile!),
      enabled: canDecrypt === true,
      retry: 0,
    }),
    canDecrypt,
    isLoadingCanDecrypt: canDecrypt === undefined,
  };
};