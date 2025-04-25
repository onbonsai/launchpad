import { FC, useEffect, useMemo, useState } from "react";
import { styled } from '@mui/material/styles';
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { Menu as MuiMenu, MenuItem as MuiMenuItem } from '@mui/material';
import { useSIWE, useModal, SIWESession } from "connectkit";
import { Tooltip } from "@components/Tooltip";

import { Button } from "@components/Button";
import { transformTextToWithDots } from "@utils/transformTextToWithDots";
import useENS from "@src/hooks/useENS";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { logout as lensLogout } from "@src/hooks/useLensLogin";
import { useRouter } from "next/router";
import { brandFont } from "@src/fonts/fonts";
import useGetProfiles from "@src/hooks/useGetProfiles";
import { getProfileImage } from "@src/services/lens/utils";

const Menu = styled(MuiMenu)(({ theme }) => ({
  '& .MuiPaper-root': {
    border: 'none',
    backgroundColor: '#262626',
    borderRadius: '12px',
    margin: '4px',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
    '& .MuiMenu-list': {
      padding: '4px',
      backgroundColor: '#262626',
      color: '#FFFFFF', // white text
    },
  }
}));

const MenuItem = styled(MuiMenuItem)(({ theme }) => ({
  padding: '10px 8px',
  borderRadius: '12px',
  minWidth: '115px',
  position: 'relative',
  fontFamily: brandFont.style.fontFamily,
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
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { profiles } = useGetProfiles(address);
  const { ensName, loading: loadingENS } = useENS(address);
  const { isAuthenticated, signingIn } = useLensSignIn(walletClient);
  const { setOpen } = useModal({
    onConnect: () => {
      if (autoLensLogin && setOpenSignInModal && isAuthenticated === false) {
        setTimeout(() => {
          setOpenSignInModal(true);
        }, 500);
      }
    },
    onDisconnect: () => {
      console.log("onDisconnect");
      lensLogout().then(fullRefetch)
    }
  });
  // const { isReady: ready, isSignedIn: connected, signOut, signIn } = useSIWE({
  //   onSignOut: () => {
  //     const asyncLogout = async () => {
  //       await lensLogout();
  //       fullRefetch() // invalidate cached query data
  //     }

  //     disconnect();
  //     if ((!!authenticatedProfile?.address)) asyncLogout();
  //   }
  // });
  const router = useRouter();

  const {
    fullRefetch,
  } = useLensSignIn(walletClient);

  // useEffect(() => {
  //   // pop open the lens login modal once connected and signed in with ethereum
  //   if (connected && autoLensLogin && setOpenSignInModal && isAuthenticated === false) {
  //     setTimeout(() => {
  //       setOpenSignInModal(true);
  //     }, 1000);
  //   }
  // }, [connected]);

  const identity = useMemo(() => {
    if (authenticatedProfile)
      return authenticatedProfile.username?.localName || authenticatedProfile.metadata?.name
    if (!loadingENS && ensName) return ensName;

    return transformTextToWithDots(address);
  }, [authenticatedProfile, loadingENS, address]);

  const profilePicture = useMemo(() => {
    if (authenticatedProfile) {
      return getProfileImage(authenticatedProfile)
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

  // // need this to trigger the onSignIn callback
  // const handleSignIn = async () => {
  //   await signIn()?.then((session?: SIWESession) => { });
  // };

  // if (!ready && !connected) return null;

  if (!isConnected) {
  // if (!connected || !isConnected) {
    return (
      <Button
        variant="accent"
        className="text-base font-medium md:px-4 rounded-lg"
        // onClick={() => !isConnected ? setOpen(true) : handleSignIn()}
        onClick={() => setOpen(true)}
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

  if (!isAuthenticated && setOpenSignInModal && (profiles?.length && profiles?.length > 0)) {
    return (
      <Button
        variant="accent"
        className="text-base font-medium md:px-4 rounded-lg"
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
        className={`flex h-10 bg-button py-[2px] pl-[2px] items-center cursor-pointer hover:opacity-90 rounded-lg min-w-fit justify-end overflow-hidden`}
        onClick={handleClick}
        style={{ maxWidth: 'calc(100vw - 20px)' }} // Ensure the container does not exceed the viewport width
      >
        <span className="flex items-center shrink min-w-0">
          {profilePicture && <img src={profilePicture ?? ''} alt="profile" className="w-9 h-9 rounded-[10px]" />}
          <span className="pl-3 pr-[6px] text-white font-medium text-base whitespace-nowrap overflow-hidden text-ellipsis">
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
        {authenticatedProfile?.username?.localName && (
          <MenuItem onClick={() => {
            handleClose();
            router.push(`/profile/${authenticatedProfile?.username?.localName}`);
          }}>
            View profile
          </MenuItem>
        )}
        <MenuItem onClick={() => {
          disconnect();
          handleClose();
        }}>
          Log out
        </MenuItem>
      </Menu>
    </>
  );
};
