import { FC, useMemo, useState } from "react";
import { styled } from '@mui/material/styles';
import { useAccount, useWalletClient } from "wagmi";
import { useLogout, usePrivy } from '@privy-io/react-auth';
import { useLogin } from '@privy-io/react-auth';
import { Menu as MuiMenu, MenuItem as MuiMenuItem } from '@mui/material';

import { Button } from "@components/Button";
import { transformTextToWithDots } from "@utils/transformTextToWithDots";
import useENS from "@src/hooks/useENS";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { ProfilePictureSetFragment } from "@lens-protocol/client";
import { logout as lensLogout } from "@src/hooks/useLensLogin";
import { useRouter } from "next/router";
import { inter } from "@src/fonts/fonts";

const Menu = styled(MuiMenu)(({ theme }) => ({
  '& .MuiPaper-root': {
    border: 'none',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '12px',
    margin: '4px',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
    '& .MuiMenu-list': {
      padding: '4px'
    },
  }
}));

const MenuItem = styled(MuiMenuItem)(({ theme }) => ({
  padding: '10px 8px',
  borderRadius: '12px',
  minWidth: '115px',
  '&:hover': {
    padding: '10px 8px',
    borderRadius: '12px',
  },
  fontFamily: inter.style.fontFamily,
  fontSize: '14px',
}));

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
  const router = useRouter();

  const {
    fullRefetch,
  } = useLensSignIn(walletClient);

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

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const { logout } = useLogout({
    onSuccess: () => {
      if ((!!authenticatedProfile?.id)) {
        lensLogout();
        fullRefetch() // invalidate cached query data
      }
    },
  })

  if (!ready && !connected) return null;

  if (!connected) {
    return (
      <Button
        variant="accent"
        className="text-base font-medium md:px-4 rounded-xl"
        onClick={login}
        size="md" // This sets the height to 40px and padding appropriately
      >
        Log in
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
        variant="accent"
        className="text-base font-medium md:px-4 rounded-xl"
        onClick={() => setOpenSignInModal(true)}
        disabled={signingIn}
        size="md"
      >
        Login with Lens
      </Button>
    )
  }

  return (
    <>
      <div
        className={`flex h-10 bg-button py-[2px] pl-[2px] items-center cursor-pointer hover:opacity-90 rounded-xl min-w-fit`}
        onClick={handleClick}
      >
        <span className="flex items-center">
          <img src={profilePicture ?? ''} alt="profile" className="w-9 h-9 rounded-[10px]" />
          <span className="pl-3 pr-[6px] text-white font-medium text-base">
            {identity}
          </span>
          <span className="bg-card rounded-full h-[13px] w-[13px] mr-[12px] flex items-center justify-center pointer-events-none">
            <svg width="6" height="5" viewBox="0 0 6 5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.5 1L3 3.5L5.5 1" stroke="white" strokeWidth="1.2" />
            </svg>
          </span>
        </span>
      </div>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={() => {
          handleClose();
          router.push(`/profile/${authenticatedProfile?.handle?.localName}`);
        }}>
          View profile
        </MenuItem>
        <MenuItem onClick={() => {
          logout();
          handleClose();
        }}>Log out</MenuItem>
      </Menu>
    </>
  );
};
