import { useState } from "react";
import { toast } from "react-hot-toast";
import { Account } from "@lens-protocol/client";

import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";

import { useLensLogin, useIsAuthenticated, useAuthenticatedProfileId } from "./useLensLogin";

type LensSignInReturnType = {
  setOpenSignInModal: (b: boolean) => void;
  openSignInModal: boolean;
  signInWithLens: (selectedProfile?: Account) => void;
  signingIn: boolean;
  isAuthenticated?: boolean;
  authenticatedProfileId?: string | null;
  authenticatedProfile?: Account | null;
  authenticatedLensClient?: any | null;
  setSelectedProfile: (profile: Account) => void;
  selectedProfile?: Account;
  fullRefetch: () => void;
};

// use this everywhere we want to render a "Sign in with Lens" button
// returns function to login and authenticated data
export default (walletClient: any): LensSignInReturnType => {
  const [openSignInModal, setOpenSignInModal] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authenticatedLensClient, setAuthenticatedLensClient] = useState<any>();
  const { refetch: loginWithLens, setSelectedProfile, selectedProfile } = useLensLogin({}, walletClient);
  const { data: isAuthenticated, refetch: fetchIsAuthenticated } = useIsAuthenticated();
  const { data: authenticatedProfileId, refetch: fetchAuthenticatedProfileId } = useAuthenticatedProfileId();
  const { data: authenticatedProfile, refetch: fetchAuthenticatedProfile } = useAuthenticatedLensProfile();

  const fullRefetch = () => {
    fetchIsAuthenticated();
    fetchAuthenticatedProfileId();
    fetchAuthenticatedProfile();
  };

  const signInWithLens = async (selectedProfile?: Account) => {
    setSigningIn(true);
    const toastId = toast.loading("Signing in...");
    try {
      const connected = await loginWithLens({ queryKey: ["lens-login", selectedProfile?.address] });
      if (!connected) throw new Error();

      fullRefetch();

      toast.success("Logged in", { id: toastId });
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
    setSelectedProfile,
    selectedProfile,
    fullRefetch,
  };
};
