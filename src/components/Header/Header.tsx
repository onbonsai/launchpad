import { inter } from "@src/fonts/fonts";
import Link from "next/link";
import { useRouter } from "next/router";
import { useWalletClient, useAccount } from "wagmi";
import { useState } from "react";
import { cx } from "@src/utils/classnames";
import { routesApp } from "@src/constants/routesApp";
import { ConnectButton } from "@components/ConnectButton";
import { Modal } from "@src/components/Modal";
import LoginWithLensModal from "@src/components/Lens/LoginWithLensModal";
import useLensSignIn from "@src/hooks/useLensSignIn";
import useIsMounted from "@src/hooks/useIsMounted";
import { CreateClub } from "@src/pagesComponents/Dashboard";
import HeaderButton from "./HeaderButton";
import { SearchClubs } from "../SearchApp/SearchClubs";
import { ClaimFeesEarned } from "./ClaimFeesEarned";
import clsx from "clsx";
import { Header as HeaderText } from "@src/styles/text";

const headerLinks = [
  // add any top-level nav links here
];

export const Header = () => {
  const { route } = useRouter();
  const { data: walletClient } = useWalletClient();
  const { openSignInModal, setOpenSignInModal, isAuthenticated } = useLensSignIn(walletClient);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const isMounted = useIsMounted();

  if (!isMounted) return null;

  return (
    <header className="sticky top-0 z-[100] bg-black border-b border-dark-grey shadow-sm max-w-[100vw] overflow-hidden">
      <nav className="mx-auto max-w-[100rem]" aria-label="Top">
        {/* Top row */}
        <div className="flex w-full items-center py-4 lg:border-none px-4 md:px-6">
          <div className="flex items-center w-[33%]">
            <div className="w-max">
              <a className="bonsaiLogo" href={routesApp.home}></a>
            </div>
            <div
                className="hidden md:flex h-[40px] py-[12px] px-4 ml-4 justify-center items-center rounded-xl hover:opacity-80 hover:cursor-pointer"
                onClick={() => setOpenHelpModal(true)}
              >
                <span className="h-full leading-4 font-medium text-white text-[16px] hover:opacity-100">
                  Info
                </span>
              </div>
          </div>

          {/* On desktop: show search in the center. On mobile: hidden or below */}
          <div className="hidden lg:flex justify-center items-center w-[33%]">
            <SearchClubs />
          </div>

          {/* Right side of header */}
          <div className="flex items-center justify-end w-[100%]">
            {/* On desktop show actions inline, on mobile they will be in the hamburger menu */}
            {/* Reordered for desktop: Create, Claim Fees, then ConnectButton */}
            <div className="hidden sm:flex items-center space-x-2 md:mr-2">
              <CreateClub />
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
                      d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile-only: Search bar on second line */}
        <div className="block lg:hidden px-4 md:px-6 pb-4 w-full">
          <SearchClubs />
        </div>
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
        panelClassnames={clsx("bg-card w-screen h-screen p-4 md:h-full md:w-[35vw] max-w-[200000px] lg:max-w-[500px] text-secondary md:mx-8", inter.className)}
      >
        <HeaderText>
          Bonsai Launchpad
        </HeaderText>
        <p className="mt-4 text-xl text-secondary/70">
          Tokens start on a bonding curve until they graduate ($69k mcap or ~$23k in liquidity). You buy "units" which represent your portion of the total supply. Your full token allocation will be shown after graduation.
        </p>
        <p className="mt-2 text-xl text-secondary/70">
          Built on Base. Bonding curves are priced in USDC ($)
        </p>
        <p className="mt-2 text-xl text-secondary/70">
          Creators earn 1% trading fees on bonding curves, and 40% of the 1.5% trading fee when tokens graduate to Uniswap
        </p>
        <p className="mt-2 text-xl text-secondary/70">
          When a token reaches $69k mcap, anyone can trigger graduation. Liquidity is used to buy $BONSAI and pair with the token on Uni v3 (v4 soon). Holders must wait 72 hours to claim their tokens; this is to protect from rugs and put the token in buy-only mode.
        </p>
        <p className="mt-2 text-xl text-secondary/70">
          Tokens that graduate are eligible to migrate to our Bons(ai) agent stack in q1 2025.
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