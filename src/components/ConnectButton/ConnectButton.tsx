import { FC, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { usePrivy } from '@privy-io/react-auth';
import { useLogin } from '@privy-io/react-auth';

import { Button } from "@components/Button";
import { transformTextToWithDots } from "@utils/transformTextToWithDots";
import useENS from "@src/hooks/useENS";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useLensSignIn from "@src/hooks/useLensSignIn";


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

  if (!ready && !connected) return null;

  if (!connected) {
    return (
      <Button
        className={`${className}`}
        onClick={login}
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
      >
        Login with Lens
      </Button>
    )
  }

  return (
    <div className="flex gap-3">
      <Button
        className={`${className}`}
        onClick={() => setOpenSignInModal(true)}
      // iconStart={<Wallet />}
      >
        <span className="flex items-center">
          <span className="">
            {identity}
          </span>
        </span>
      </Button>
    </div>
  );
};
