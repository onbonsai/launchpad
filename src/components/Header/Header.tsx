import { brandFont } from "@src/fonts/fonts";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAccount, useWalletClient } from "wagmi";
import { useEffect, useState, useRef } from "react";
import { cx } from "@src/utils/classnames";
import { routesApp } from "@src/constants/routesApp";
import { ConnectButton } from "@components/ConnectButton";
import { Modal } from "@src/components/Modal";
import LoginWithLensModal from "@src/components/Lens/LoginWithLensModal";
import useLensSignIn from "@src/hooks/useLensSignIn";
import useIsMounted from "@src/hooks/useIsMounted";
import { SearchClubs } from "../SearchApp/SearchClubs";
import { Button } from "../Button";
import { ClaimFeesEarned } from "./ClaimFeesEarned";
import clsx from "clsx";
import { Header2 } from "@src/styles/text";
import { Balance } from "./Balance";
// import { ClaimBonsai } from "./ClaimBonsai";
import { Notifications } from "./Notifications";
import { useModal } from "connectkit";
import { logout as lensLogout } from "@src/hooks/useLensLogin";
import CoinPile from "../Icons/CoinPile";
import useIsAlmostMobile from "@src/hooks/useIsAlmostMobile";
import useIsMobile from "@src/hooks/useIsMobile";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { usePWA } from "@src/hooks/usePWA";
import { HelpOutline } from "@mui/icons-material";

const headerLinks = [
  {
    label: "Feed",
    href: "/",
    requiresAuth: false,
  },
  {
    label: "Studio",
    href: "/studio/create",
    requiresAuth: true,
  },
  {
    label: "Tokens",
    href: "/tokens",
    requiresAuth: false,
  },
];

const MobileBottomNav = ({ setOpenSignInModal }) => {
  const isMounted = useIsMounted();
  const { route, query } = useRouter();
  const { data: walletClient } = useWalletClient();
  const { isMiniApp } = useIsMiniApp();
  const { isConnected } = useAccount();
  const { isAuthenticated, authenticatedProfile } = useLensSignIn(walletClient);
  const [showNotifications, setShowNotifications] = useState(false);

  const {
    fullRefetch,
  } = useLensSignIn(walletClient);

  const hasHandledBudgetModal = useRef(false);
  const hasHandledInitialModal = useRef(false);

  const { setOpen } = useModal();

  // Handle connection events in useEffect to avoid state updates during render
  useEffect(() => {
    if (isConnected && !isAuthenticated && setOpenSignInModal && !isMiniApp) {
      const timer = setTimeout(() => {
        setOpenSignInModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isAuthenticated, setOpenSignInModal, isMiniApp]);

  // Handle disconnection events in useEffect
  useEffect(() => {
    if (!isConnected) {
      // Reset the modal flags when user disconnects
      hasHandledInitialModal.current = false;
      hasHandledBudgetModal.current = false;
      if (!isMiniApp) {
        lensLogout().then(fullRefetch);
      }
    }
  }, [isConnected, isMiniApp, fullRefetch]);

  const isProfileActive = route === "/profile/[handle]" && query?.handle === authenticatedProfile?.username?.localName;
  const isHomeActive = route === '/';
  const isTokensActive = route === '/tokens';
  const isCreateActive = route === '/studio/create';

  const handleAuthRequiredClick = (e: React.MouseEvent) => {
    // For miniapp users, allow them to proceed to create/remix flow
    if (!isAuthenticated && !isMiniApp) {
      e.preventDefault();
      setOpen(true);
    }
  };

  useEffect(() => {
    // Only run when mounted to prevent hydration issues
    if (!isMounted) return;

    // If miniapp and not budget modal, skip the whole thing
    if (isMiniApp && query.modal !== "budget") return;

    // If not miniapp, skip
    if (!isMiniApp) return;

    const timer = setTimeout(() => {
      if (isMiniApp && !isConnected && !hasHandledInitialModal.current) {
        setOpen(true);
        hasHandledInitialModal.current = true;
        return;
      }
      if (isMiniApp && (!isAuthenticated || (query.modal === "budget" && !hasHandledBudgetModal.current)) && !hasHandledInitialModal.current) {
        setOpenSignInModal(true);
        hasHandledInitialModal.current = true;
        if (query.modal === "budget") {
          hasHandledBudgetModal.current = true;
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isMounted, isMiniApp, isAuthenticated, isConnected, query.modal, setOpen, setOpenSignInModal]);

  const { isStandalone } = usePWA();

  // Prevent hydration mismatch by ensuring component doesn't render until mounted
  if (!isMounted) return null;

  return (
    <div className={clsx(
      "fixed bottom-0 left-0 right-0 bg-black border-t border-dark-grey lg:hidden z-[1000]",
      isStandalone || isMiniApp ? "pb-6" : "pb-1"
    )}>
      <div className="flex justify-between items-center h-14 px-6">
        <Link href="/" className="flex flex-col items-center">
          <svg className={`w-6 h-6 ${isHomeActive ? 'text-brand-highlight' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        <Link href="/tokens" className="flex flex-col items-center">
          <CoinPile isTokensActive={isTokensActive} />
        </Link>
        <Link href="/studio/create" className="flex flex-col items-center" onClick={handleAuthRequiredClick}>
          <div className="bg-[#111] rounded-lg p-1.5">
            <svg className={`w-8 h-8 ${isCreateActive ? 'text-brand-highlight' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </Link>
        <div className="flex flex-col items-center" onClick={handleAuthRequiredClick}>
          <Notifications isMobile onShowChange={setShowNotifications} />
        </div>
        <Link href={`/profile/${authenticatedProfile?.username?.localName}`} className="flex flex-col items-center" onClick={handleAuthRequiredClick}>
          <svg className={`w-6 h-6 ${isProfileActive ? 'text-brand-highlight' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export const Header = () => {
  const { route, query } = useRouter();
  const { data: walletClient } = useWalletClient();
  const { openSignInModal, setOpenSignInModal, isAuthenticated, authenticatedProfile } = useLensSignIn(walletClient);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const isMounted = useIsMounted();
  const isAlmostMobile = useIsAlmostMobile();
  const { isConnected } = useAccount();
  const { isMiniApp } = useIsMiniApp();
  const { setOpen } = useModal();

  // Handle connection events in useEffect to avoid state updates during render
  useEffect(() => {
    if (isConnected && !isAuthenticated && setOpenSignInModal && !isMiniApp) {
      const timer = setTimeout(() => {
        setOpenSignInModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isAuthenticated, setOpenSignInModal, isMiniApp]);

  if (!isMounted) return null;

  const handleAuthRequiredClick = (e: React.MouseEvent) => {
    // For miniapp users, allow them to proceed to create/remix flow
    if (!isAuthenticated && !isMiniApp) {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <>
      <header className="md:sticky top-0 z-[100] bg-black/90 backdrop-blur-sm border-b border-dark-grey shadow-sm max-w-[100vw] overflow-hidden">
        <nav className="mx-auto max-w-[100rem]" aria-label="Top">
          <div className="flex w-full items-center py-3 lg:border-none px-4 md:px-6 justify-between">
            <div className="flex items-center justify-start w-[40%]">
              <div className="w-max">
                <a className="bonsaiLogo" href={routesApp.home}></a>
              </div>
              <div className="ml-10 hidden lg:flex items-center space-x-4">
                {headerLinks.map((link) => (
                  <div key={link.href} className="h-[40px] py-[12px] px-4 justify-center items-center rounded-lg">
                    <Link
                      href={link.href}
                      passHref
                      onClick={link.requiresAuth ? handleAuthRequiredClick : undefined}
                      className={cx(
                        "h-full leading-4 font-medium text-[16px] transition-opacity duration-200",
                        route === link.href ? "text-white" : "text-white/50 hover:text-white/80",
                      )}
                    >
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* On desktop: show search in the center. On mobile: hidden or below */}
            {!isAlmostMobile && (
              <SearchClubs />
            )}

            {/* Right side of header */}
            <div className="flex items-center justify-end md:w-[40%] w-full">
              {isAlmostMobile && (
                <div className="mr-2 hidden sm:block">
                  <SearchClubs />
                </div>
              )}

              {/* Create button */}
              {isConnected && (
                <div className="hidden sm:block mr-2">
                  <Link href="/studio/create" onClick={handleAuthRequiredClick}>
                    <Button variant="secondary" size="md" className="text-base font-bold md:px-4 rounded-lg space-x-1 min-w-[120px]">
                      <svg className="w-4 h-4 text-base" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create</span>
                    </Button>
                  </Link>
                </div>
              )}

              {/* Authenticated user actions */}
              {isAuthenticated && (
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  <Balance />
                  <ClaimFeesEarned />
                  {/* <ClaimBonsai /> */}
                </div>
              )}

              {/* Keep ConnectButton always visible */}
              <ConnectButton
                setOpenSignInModal={setOpenSignInModal}
                autoLensLogin={!isAuthenticated}
                className="sm:hidden"
                setOpenHelpModal={setOpenHelpModal}
              />

              {/* Help icon for unauthenticated users on larger screens */}
              {(!isAuthenticated || !isConnected) && (
                <button
                  className="hidden sm:flex items-center justify-center w-10 h-10 ml-2 text-white/70 hover:text-white transition-colors duration-200 focus:outline-none"
                  onClick={() => setOpenHelpModal(true)}
                  title="Help & Info"
                >
                  <HelpOutline className="w-5 h-5"/>
                </button>
              )}

              {/* Hamburger (visible on small screens only) */}
              <button
                className="sm:hidden ml-2 text-white focus:outline-none"
                onClick={() => setOpenMobileMenu(!openMobileMenu)}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Dropdown */}
        {openMobileMenu && (
          <div className="md:hidden bg-black border-t border-dark-grey px-4 py-3">
            <div className="flex flex-col space-y-2 w-full">
              <div className="pb-2 w-full">
                <SearchClubs onItemSelect={() => {
                  setOpenMobileMenu(false);
                }} />
              </div>
              <Balance openMobileMenu />
              <ClaimFeesEarned openMobileMenu />
              {/* <ClaimBonsai openMobileMenu /> */}
              <Link
                href={routesApp.stake}
                className="h-[40px] py-[10px] px-4 flex justify-center items-center text-center rounded-lg hover:opacity-80 hover:cursor-pointer w-full text-white"
                onClick={() => {
                  setOpenMobileMenu(false);
                }}
              >
                Stake
              </Link>
              <div
                className="h-[40px] py-[10px] px-4 flex justify-center items-center text-center rounded-lg hover:opacity-80 hover:cursor-pointer w-full"
                onClick={() => {
                  setOpenHelpModal(true);
                  setOpenMobileMenu(false);
                }}
              >
                <span className="leading-4 font-medium text-white text-[16px] hover:opacity-100">Info</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Login Modal */}
      <Modal
        onClose={() => setOpenSignInModal(false)}
        open={openSignInModal}
        setOpen={setOpenSignInModal}
        panelClassnames="text-md bg-card w-full md:p-4 md:w-[35vw] max-w-[2000px] lg:max-w-[500px] text-secondary md:mx-8"
      >
        <LoginWithLensModal
          closeModal={() => setOpenSignInModal(false)}
          modal={query.modal as string | undefined }
          withBudget={!!query.onboard}
        />
      </Modal>

      {/* Help Modal */}
      <Modal
        onClose={() => setOpenHelpModal(false)}
        open={openHelpModal}
        setOpen={setOpenHelpModal}
        panelClassnames={clsx(
          "text-md bg-card w-full p-4 md:w-[35vw] max-w-[2000px] lg:max-w-[500px] text-secondary md:mx-8",
          brandFont.className,
        )}
      >
        <Header2>Bonsai</Header2>
        <p className="mt-4 text-secondary/70">
          With Bonsai, you can create and monetize AI media. This new format is called Smart Media.
        </p>
        <p className="mt-4 text-secondary/70">
          Creators can choose from a selection of templates that make it easy to create Smart Media and experiment with
          tokenization. Smart Media are dynamic, updating based on the interaction of users and token holders through
          likes, comments and remixing.
        </p>
        <p className="mt-2 text-secondary/70">
          The Smart Media tokens can be created by anyone, and through the bonding curve its price increases until
          graduation.
        </p>

        <p className="mt-2 text-secondary/70">
          Head to the{" "}
          <Link href={routesApp.stake}>
            <span className="text-brand-highlight/80 link-hover cursor-pointer" onClick={() => setOpenHelpModal(false)}>
              staking page
            </span>
          </Link>{" "}
          to bridge or buy $BONSAI tokens.
        </p>

        <div className="mt-4 text-secondary/70" onClick={() => setOpenHelpModal(false)}>
          <Link href={routesApp.info}>
            <span className="text-brand-highlight/80 link-hover cursor-pointer">Learn more.</span>
          </Link>
        </div>
      </Modal>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav setOpenSignInModal={setOpenSignInModal} />
    </>
  );
};
