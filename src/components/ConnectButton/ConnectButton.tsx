import { FC, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { usePrivy } from '@privy-io/react-auth';
import { useLogin } from '@privy-io/react-auth';

import { Button } from "@components/Button";
import { transformTextToWithDots } from "@utils/transformTextToWithDots";
import useENS from "@src/hooks/useENS";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { ProfilePictureSetFragment } from "@lens-protocol/client";


interface Props {
  className?: string;
  setOpenSignInModal?: (b: boolean) => void;
  autoLensLogin?: boolean;
}

export const ConnectButton: FC<Props> = ({ className, setOpenSignInModal, autoLensLogin }) => {
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { ensName, loading: loadingENS } = useENS(address);
  const { isAuthenticated, signingIn } = useLensSignIn(walletClient);
  const { ready, authenticated: connected } = usePrivy();
  const { login } = useLogin({
    onComplete: (user, isNewUser, wasAlreadyAuthenticated) => {
      // pop open the lens login modal once connected
      if (autoLensLogin && !wasAlreadyAuthenticated && setOpenSignInModal && isAuthenticated === false) {
        setOpenSignInModal(true);
      }
    }
  })

  const identity = useMemo(() => {
    if (authenticatedProfile)
      return authenticatedProfile!.handle?.suggestedFormatted?.localName || authenticatedProfile!.handle?.localName
    if (!loadingENS && ensName) return ensName;

    return transformTextToWithDots(address);
  }, [authenticatedProfile, loadingENS, address]);

  const profilePicture = useMemo(() => {
    if (authenticatedProfile) {
      const basePicture: ProfilePictureSetFragment | undefined = authenticatedProfile?.metadata?.picture as ProfilePictureSetFragment;
      return basePicture.thumbnail?.uri || basePicture.optimized?.uri;
    }
    // TODO: Default image
    return null;
  }, [authenticatedProfile, loadingENS, address]);

  if (!ready && !connected) return null;

  if (!connected) {
    return (
      <Button
        className={`${className}`}
        onClick={login}
        size="md"
      >
        Connect
      </Button>
    );
  }

  // TODO:
  // if (mounted && account && chain.unsupported) {
  //   return (
  //     <Button className={`${className}`} onClick={openChainModal}>
  //       Switch to {chainId.name}
  //     </Button>
  //   );
  // }

  if (!isAuthenticated && setOpenSignInModal) {
    return (
      <Button
        className={`${className}`}
        onClick={() => setOpenSignInModal(true)}
        disabled={signingIn}
        size="md"
      >
        Login with Lens
      </Button>
    )
  }

  return (
    <div
      className={`flex h-10 bg-button py-[2px] pl-[2px] items-center cursor-pointer hover:opacity-90 rounded-xl`}
      onClick={() => setOpenSignInModal(true)}
    >
      <span className="flex items-center">
        <img src={profilePicture ?? ''} alt="profile" className="w-9 h-9 rounded-[10px]" />
        <span className="pl-3 pr-4 text-white font-medium text-base">
          {identity}
        </span>
      </span>
    </div>
  );
};
