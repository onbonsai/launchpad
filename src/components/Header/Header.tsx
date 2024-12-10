import Link from "next/link";
// import { HomeIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import { useWalletClient } from "wagmi";

import { cx } from "@src/utils/classnames";
import { routesApp } from "@src/constants/routesApp";
import { ConnectButton } from "@components/ConnectButton";
import { Modal } from "@src/components/Modal";
import LoginWithLensModal from "@src/components/Lens/LoginWithLensModal";
import useLensSignIn from "@src/hooks/useLensSignIn";
import useIsMounted from "@src/hooks/useIsMounted";
import { CreateClub } from "@src/pagesComponents/Dashboard";
import { TradeBanner } from "./TradeBanner";
import { NewTokenBanner } from "./NewTokenBanner";
import HeaderButton from "./HeaderButton";
import { SearchClubs } from "../SearchApp/SearchClubs";

const headerLinks = [
  // {
  //   href: routesApp.hooks,
  //   label: "Uniswap Hooks"
  // },
  {
    href: routesApp.home,
    label: "Trending"
  },
  {
    href: routesApp.leaderboard,
    label: "New"
  },
  // {
  //   href: routesApp.clubs,
  //   label: "Graduated"
  // },
  // {
  //   href: routesApp.help,
  //   label: "How?"
  // },
];

// const mobileNavLinks = [
//   {
//     href: routesApp.home,
//     icon: <HomeIcon width={50} height={25} />,
//   },
//   // {
//   //   href: routesApp.clubs,
//   //   icon: <SearchCircleIcon width={50} height={25} />,
//   // },
// ];

export const Header = () => {
  const { route } = useRouter();
  const { data: walletClient } = useWalletClient();
  const { openSignInModal, setOpenSignInModal, isAuthenticated } = useLensSignIn(walletClient);
  const isMounted = useIsMounted();

  if (!isMounted) return null;

  return (
    <header className="sticky top-0 z-20 bg-black border-b border-dark-grey shadow-sm">
      <nav className="mx-auto max-w-[100rem]" aria-label="Top">
        <div className="flex w-full items-center justify-evenlyborder-b border-dark-grey border-opacity-80 py-4 lg:border-none">
          <div className="flex items-center w-[33%]">
            <div className="pl-2 md:pl-6 w-max">
              <a className="bonsaiLogo" href={routesApp.home}></a>
            </div>
            <div className="ml-6 hidden space-x-0 lg:flex">
              {headerLinks.map((link) =>
                <HeaderButton
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={route === link.href}
                />
              )}
            </div>
            <div className="flex ml-8 space-x-8">
              <TradeBanner />
              <NewTokenBanner />
            </div>
            {/* MOBILE NAVIGATION */}
            {/* <div className="relative z-10 lg:hidden">
              <section
                id="bottom-navigation"
                className="block fixed inset-x-0 bottom-0 z-10 bg-black shadow py-4 pl-24 pr-24"
              >
                <div id="tabs" className="flex justify-between px-8">
                  {mobileNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      passHref
                      className={cx(
                        route.includes(link.href) ? "font-bold" : "font-medium opacity-70 hover:opacity-100",
                      )}
                    >
                      {link.icon}
                    </Link>
                  ))}
                </div>
              </section>
            </div> */}
          </div>
          <div className="hidden lg:flex justify-center items-center w-[33%]">
            <SearchClubs />
          </div>
          <div className="flex space-x-2 gap-x-2 md:pr-6 w-[33%] justify-end">
            <CreateClub />
            <ConnectButton
              setOpenSignInModal={setOpenSignInModal}
              autoLensLogin={!isAuthenticated}
            />
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      <Modal
        onClose={() => setOpenSignInModal(false)}
        open={openSignInModal}
        setOpen={setOpenSignInModal}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <LoginWithLensModal closeModal={() => setOpenSignInModal(false)} />
      </Modal>
    </header>
  );
};
