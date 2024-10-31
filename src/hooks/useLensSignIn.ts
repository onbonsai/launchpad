import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ProfileFragment } from '@lens-protocol/client';

import { useBrowserEncryptionConfig } from "@src/hooks/useBrowserEncryptionConfig";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useGatedClient from "@src/hooks/useGatedClient";
import { ExtendedGatedClient } from "@src/services/lens/createGatedClient";

import { useLensLogin, useIsAuthenticated, useAuthenticatedProfileId } from "./useLensLogin";

type LensSignInReturnType = {
  setOpenSignInModal: (b: boolean) => void;
  openSignInModal: boolean;
  signInWithLens: (selectedProfileId?: string) => void;
  signingIn: boolean;
  isAuthenticated?: boolean;
  authenticatedProfileId?: string | null;
  authenticatedProfile?: ProfileFragment | null;
  authenticatedLensClient?: ExtendedGatedClient | null;
  setSelectedProfileId: (profileId: string) => void;
  selectedProfileId?: string;
  fullRefetch: () => void;
};

// use this everywhere we want to render a "Sign in with Lens" button
// returns function to login and authenticated data
export default (walletClient: any): LensSignInReturnType => {
  const [openSignInModal, setOpenSignInModal] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authenticatedLensClient, setAuthenticatedLensClient] = useState<ExtendedGatedClient>();
  const lensGatedClientEncryption = useBrowserEncryptionConfig();
  const { createGatedClient } = useGatedClient();
  const { refetch: loginWithLens, setSelectedProfileId, selectedProfileId } = useLensLogin({}, walletClient);
  const { data: isAuthenticated, refetch: fetchIsAuthenticated } = useIsAuthenticated();
  const { data: authenticatedProfileId, refetch: fetchAuthenticatedProfileId } = useAuthenticatedProfileId();
  const { data: authenticatedProfile, refetch: fetchAuthenticatedProfile } = useAuthenticatedLensProfile();

  const fullRefetch = () => {
    fetchIsAuthenticated();
    fetchAuthenticatedProfileId();
    fetchAuthenticatedProfile();
  }

  const signInWithLens = async (selectedProfileId?: string) => {
    setSigningIn(true);
    const toastId = toast.loading("Signing in...");
    try {
      const connected = await loginWithLens({ queryKey: ["lens-login", selectedProfileId] });
      if (!connected) throw new Error();

      fullRefetch();

      // to be used for encrypting / decrypting
      setAuthenticatedLensClient(createGatedClient(lensGatedClientEncryption, walletClient));

      toast.success("Signed in with Lens", { id: toastId });
    } catch {
      toast.error("Unable to sign in", { id: toastId });
    }
    setSigningIn(false);
  };

  return {
    setOpenSignInModal,
    openSignInModal,
    signInWithLens,
    signingIn,
    isAuthenticated,
    authenticatedProfileId,
    authenticatedProfile,
    authenticatedLensClient,
    setSelectedProfileId,
    selectedProfileId,
    fullRefetch,
  };
};