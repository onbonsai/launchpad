import { brandFont } from "@src/fonts/fonts";
import Link from "next/link";
import { useRouter } from "next/router";
import { useWalletClient } from "wagmi";
import { useState } from "react";
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
import useIsMobile from "@src/hooks/useIsMobile";
import { Balance } from "./Balance";
import { ClaimBonsai } from "./ClaimBonsai";
import { Notifications } from "./Notifications";

const headerLinks = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Tokens",
    href: "/tokens",
  },
  {
    label: "Stake",
    href: "/studio/stake",
  },
];

export const Header = () => {
  const { route } = useRouter();
  const { data: walletClient } = useWalletClient();
  const { openSignInModal, setOpenSignInModal, isAuthenticated, authenticatedProfile } = useLensSignIn(walletClient);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const isMounted = useIsMounted();
  const isMobile = useIsMobile();

  if (!isMounted) return null;

  return (
    <header className="sticky top-0 z-[100] bg-black border-b border-dark-grey shadow-sm max-w-[100vw] overflow-hidden">
      <nav className="mx-auto max-w-[100rem]" aria-label="Top">
        {/* Top row */}
        <div className="flex w-full items-center py-3 lg:border-none px-4 md:px-6 justify-between">
          <div className="flex items-center justify-start w-[33%]">
            <div className="w-max text-black">
              <a className="bonsaiLogo" href={routesApp.home}></a>
            </div>
            <div className="ml-10 hidden lg:flex items-center space-x-4">
              {headerLinks.map((link) => (
                <div key={link.href} className="h-[40px] py-[12px] px-4 justify-center items-center rounded-lg">
                  <Link
                    href={link.href}
                    passHref
                    className={cx(
                      "h-full leading-4 font-medium text-[16px] transition-opacity duration-200",
                      route === link.href ? "text-white" : "text-white/50 hover:text-white/80",
                    )}
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
              <div
                className="h-[40px] py-[12px] px-4 justify-center items-center rounded-lg"
                onClick={() => setOpenHelpModal(true)}
              >
                <span className="h-full leading-4 font-medium text-[16px] transition-opacity duration-200 text-white/50 hover:text-white/80 cursor-pointer">
                  Info
                </span>
              </div>
            </div>
          </div>

          {/* On desktop: show search in the center. On mobile: hidden or below */}
          {!isMobile && (
            <div className="flex justify-center items-center w-[15%]">
              <SearchClubs />
            </div>
          )}

          {/* Right side of header */}
          <div className="flex items-center justify-end md:w-[38%] w-full">
            {/* On desktop show actions inline, on mobile they will be in the hamburger menu */}
            {/* Reordered for desktop: Create, Claim Fees, then ConnectButton */}
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <Notifications />
              {isAuthenticated && (
                <Link href="/studio">
                  <Button variant="accentBrand" size="md" className="text-base font-bold md:px-6 rounded-lg">
                    Create
                  </Button>
                </Link>
              )}
              <Balance />
              <ClaimFeesEarned />
              <ClaimBonsai />
            </div>

            {/* Keep ConnectButton always visible, now outside the desktop-specific div */}
            <ConnectButton
              setOpenSignInModal={setOpenSignInModal}
              autoLensLogin={!isAuthenticated}
              className="sm:hidden" // Hide on desktop since it's included in the line above for desktop view
            />

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

        {/* Mobile-only: Search bar on second line */}
        {/* {isMobile && (
          <div className="block lg:hidden px-4 md:px-6 pb-4 w-full">
            <SearchClubs />
          </div>
        )} */}
      </nav>

      {/* Mobile Menu Dropdown */}
      {openMobileMenu && (
        <div className="sm:hidden bg-black border-t border-dark-grey px-4 py-3">
          <div className="flex flex-col space-y-2 w-full">
            <div className="pb-2 w-full">
              <SearchClubs />
            </div>
            <Balance openMobileMenu />
            <ClaimFeesEarned openMobileMenu />
            <ClaimBonsai openMobileMenu />
            <Notifications openMobileMenu />
            {/* TODO: move info to a button next to hamburger */}
            <div
              className="h-[40px] py-[10px] px-4 flex justify-center items-center text-center rounded-lg hover:opacity-80 hover:cursor-pointer w-full"
              onClick={() => {
                setOpenHelpModal(true);
                setOpenMobileMenu(false);
              }}
            >
              <span className="leading-4 font-medium text-white text-[16px] hover:opacity-100">Info</span>
            </div>
            {isAuthenticated && (
              <Link href="/studio" className="w-full">
                <Button
                  variant="accentBrand"
                  size="md"
                  className="text-base font-bold md:px-6 bg-white rounded-lg w-full"
                >
                  Create
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Login Modal */}
      <Modal
        onClose={() => setOpenSignInModal(false)}
        open={openSignInModal}
        setOpen={setOpenSignInModal}
        panelClassnames="bg-card w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <LoginWithLensModal closeModal={() => setOpenSignInModal(false)} />
      </Modal>

      {/* Help Modal */}
      <Modal
        onClose={() => setOpenHelpModal(false)}
        open={openHelpModal}
        setOpen={setOpenHelpModal}
        panelClassnames={clsx(
          "text-md bg-card w-screen h-screen p-4 md:h-full md:w-[35vw] max-w-[2000px] lg:max-w-[500px] text-secondary md:mx-8",
          brandFont.className,
        )}
      >
        <Header2>Bonsai</Header2>
        <p className="mt-4 text-secondary/70">
          With Bonsai, you can create and monetize AI content on Lens. This new format is called Smart Media.
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
          <Link href={routesApp.info} legacyBehavior target="_blank">
            <span className="text-brand-highlight/80 link-hover cursor-pointer">Learn more.</span>
          </Link>
        </div>
      </Modal>
    </header>
  );
};
