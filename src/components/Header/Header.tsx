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
import { CreateClub } from "@src/pagesComponents/Dashboard";
import { SearchClubs } from "../SearchApp/SearchClubs";
import { ClaimFeesEarned } from "./ClaimFeesEarned";
import clsx from "clsx";
import { Header as HeaderText } from "@src/styles/text";
import useIsMobile from "@src/hooks/useIsMobile";
import { Balance } from "./Balance";
import { Button } from "../Button";

const headerLinks = [
  {
    label: "Home",
    href: "/"
  },
  {
    label: "Tokens",
    href: "/tokens"
  }
];

export const Header = () => {
  const { route } = useRouter();
  const { data: walletClient } = useWalletClient();
  const { openSignInModal, setOpenSignInModal, isAuthenticated } = useLensSignIn(walletClient);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const isMounted = useIsMounted();
  const isMobile = useIsMobile();

  if (!isMounted) return null;

  return (
    <header className="sticky top-0 z-[100] bg-black border-b border-dark-grey shadow-sm max-w-[100vw] overflow-hidden">
      <nav className="mx-auto max-w-[100rem]" aria-label="Top">
        {/* Top row */}
        <div className="flex w-full items-center py-4 lg:border-none px-4 md:px-6 justify-between">
          <div className="flex items-center justify-start w-[33%]">
            <div className="w-max">
              <a className="bonsaiLogo" href={routesApp.home}></a>
            </div>
            <div className="ml-10 hidden lg:flex items-center space-x-4">
              {headerLinks.map((link) => (
                <div
                  key={link.href}
                  className="h-[40px] py-[12px] px-4 justify-center items-center rounded-xl"
                >
                  <Link
                    href={link.href}
                    passHref
                    className={cx(
                      "h-full leading-4 font-medium text-[20px] transition-opacity duration-200",
                      route === link.href
                        ? "text-white"
                        : "text-white/50 hover:text-white/80"
                    )}
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
              <div
                className="h-[40px] py-[12px] px-4 justify-center items-center rounded-xl"
                onClick={() => setOpenHelpModal(true)}
              >
                <span className="h-full leading-4 font-medium text-[20px] transition-opacity duration-200 text-white/50 hover:text-white/80 cursor-pointer">
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
            <div className="hidden sm:flex items-center space-x-2 md:mr-2">
              {/* <CreateClub /> */}
              <Link href="/studio">
                <Button
                  variant="accentBrand"
                  size="md" // This sets the height to 40px and padding appropriately
                  className="text-base font-bold md:px-6 bg-white rounded-xl"
                >
                  Create
                </Button>
              </Link>
              <Balance />
              <ClaimFeesEarned />
              {/* Moved ConnectButton here for desktop layout but kept outside for mobile to always show */}
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
                viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile-only: Search bar on second line */}
        {isMobile && (
          <div className="block lg:hidden px-4 md:px-6 pb-4 w-full">
            <SearchClubs />
          </div>
        )}
      </nav>

      {/* Mobile Menu Dropdown */}
      {openMobileMenu && (
        <div className="sm:hidden bg-black border-t border-dark-grey px-4 py-3">
          <div className="flex flex-col space-y-2">
            <CreateClub />
            <ClaimFeesEarned />
            <div
              className="h-[40px] py-[10px] px-4 flex justify-start items-center rounded-xl hover:opacity-80 hover:cursor-pointer"
              onClick={() => {
                setOpenHelpModal(true);
                setOpenMobileMenu(false);
              }}
            >
              <span className="leading-4 font-medium text-white text-[16px] hover:opacity-100">
                Info
              </span>
            </div>
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
        panelClassnames={clsx("bg-card w-screen h-screen p-4 md:h-full md:w-[35vw] max-w-[200000px] lg:max-w-[500px] text-secondary md:mx-8", brandFont.className)}
      >
        <HeaderText>
          Bonsai Smart Media
        </HeaderText>
        <p className="mt-4 text-xl text-secondary/70">
          Bonsai Smart Media is a platform for creators to create and monetize dynamic living content.
        </p>
        <p className="mt-4 text-xl text-secondary/70">
          New posts are created with a Smart Media template in the studio and can have a token created on the Bonsai Launchpad to accompany the post. Users must collect the post to participate and can buy the token to gain more access.
        </p>
        <p className="mt-2 text-xl text-secondary/70">
          Smart Media posts update their content regularly based on the interactions of users and token holders.
        </p>
        <p className="mt-4 text-xl text-secondary/70">
          Tokens begin at a flat price and then the bonding curve kicks in, increasing the price until the full supply is minted.
        </p>
        <div className="mt-2 text-xl text-secondary/70" onClick={() => setOpenHelpModal(false)}>
          <Link href={routesApp.info} legacyBehavior target="_blank">
            <span className="gradient-txt link-hover cursor-pointer">Learn more.</span>
          </Link>
        </div>
      </Modal>
    </header>
  );
};