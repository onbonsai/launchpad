import { FC, useMemo, useState, useEffect } from "react";
import useIsMounted from "@src/hooks/useIsMounted";
import { styled } from '@mui/material/styles';
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { Menu as MuiMenu, MenuItem as MuiMenuItem } from '@mui/material';
import { useModal } from "connectkit";

import { Button } from "@components/Button";
import { transformTextToWithDots } from "@utils/transformTextToWithDots";
import useENS from "@src/hooks/useENS";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { logout as lensLogout } from "@src/hooks/useLensLogin";
import { useRouter } from "next/router";
import { brandFont } from "@src/fonts/fonts";
import { getProfileImage } from "@src/services/lens/utils";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import Image from "next/image";

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
  setOpenHelpModal?: (b: boolean) => void;
}

export const ConnectButton: FC<Props> = ({ className, setOpenSignInModal, autoLensLogin, setOpenHelpModal }) => {
  const isMounted = useIsMounted();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: walletClient } = useWalletClient();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { ensName, loading: loadingENS } = useENS(address);
  const { isAuthenticated, signingIn } = useLensSignIn(walletClient);
  const { isMiniApp, context: farcasterContext } = useIsMiniApp();
  const { setOpen } = useModal();

  const {
    fullRefetch,
  } = useLensSignIn(walletClient);

  // Handle connection events in useEffect to avoid state updates during render
  useEffect(() => {
    if (isConnected && autoLensLogin && setOpenSignInModal && isAuthenticated === false && !isMiniApp) {
      const timer = setTimeout(() => {
        setOpenSignInModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, autoLensLogin, setOpenSignInModal, isAuthenticated, isMiniApp]);

  // Handle disconnection events in useEffect
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      console.log("CONNECT USE EFFECT")
      lensLogout().then(fullRefetch);
    }
  }, [isConnected, isAuthenticated, fullRefetch]);
  const router = useRouter();

  const identity = useMemo(() => {
    if (authenticatedProfile)
      return authenticatedProfile.username?.localName || authenticatedProfile.metadata?.name
    if (isMiniApp && farcasterContext?.user) {
      return `@${farcasterContext.user.username}`;
    }
    if (!loadingENS && ensName) return ensName;

    return transformTextToWithDots(address);
  }, [authenticatedProfile, loadingENS, address, isMiniApp, farcasterContext]);

  const profilePicture = useMemo(() => {
    if (authenticatedProfile) {
      return getProfileImage(authenticatedProfile)
    }
    if (isMiniApp && farcasterContext?.user?.pfpUrl) {
      return farcasterContext.user.pfpUrl;
    }
    return "";
  }, [authenticatedProfile, address, isMiniApp, farcasterContext]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Prevent hydration mismatch by ensuring component doesn't render until mounted
  if (!isMounted) return null;

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

  if (!isAuthenticated && setOpenSignInModal) {
    // For miniapp users, show their Farcaster profile instead of Login button
    if (isMiniApp && farcasterContext?.user) {
      return (
        <>
          <div
            className={`flex h-10 bg-button py-[2px] pl-[2px] items-center cursor-pointer hover:opacity-90 rounded-lg min-w-fit justify-end overflow-hidden`}
            onClick={handleClick}
            style={{ maxWidth: 'calc(100vw - 20px)' }}
          >
            <span className="flex items-center shrink min-w-0">
              {profilePicture && <img src={profilePicture ?? ''} alt="profile" className="w-9 h-9 rounded-[10px]" width={36} height={36} />}
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
            <MenuItem onClick={() => {
              handleClose();
              router.push("/studio/stake");
            }}>
              Stake
            </MenuItem>
            <hr className="border-white/10 " />
            <MenuItem onClick={() => {
              setOpenHelpModal?.(true)
              handleClose();
            }}>
              Info
            </MenuItem>
            <hr className="border-white/10 " />
            {/* <MenuItem onClick={() => {
              disconnect();
              handleClose();
            }}>
              Log out
            </MenuItem> */}
          </Menu>
        </>
      );
    }

    return (
      <Button
        variant="accent"
        className="text-base font-medium md:px-4 rounded-lg"
        onClick={() => setOpenSignInModal(true)}
        disabled={signingIn}
        size="md"
      >
        Login
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
          {profilePicture && <Image src={profilePicture ?? ''} alt="profile" className="w-9 h-9 rounded-[10px]" width={36} height={36} />}
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
          handleClose();
          router.push("/studio/stake");
        }}>
          Stake
        </MenuItem>
        {authenticatedProfile?.username?.localName && (
          <MenuItem onClick={() => {
            handleClose();
            router.push(`/profile/${authenticatedProfile?.username?.localName}?settings=true`);
          }}>
            Settings
          </MenuItem>
        )}
        <hr className="border-white/10 " />
        <MenuItem onClick={() => {
          setOpenHelpModal?.(true)
          handleClose();
        }}>
          Info
        </MenuItem>
        <hr className="border-white/10 " />
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
