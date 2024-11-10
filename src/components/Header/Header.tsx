import Link from "next/link";
import { HomeIcon, SearchCircleIcon } from "@heroicons/react/outline";
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

const headerLinks = [
  {
    href: routesApp.hooks,
    label: "Uniswap Hooks"
  },
  {
    href: routesApp.help,
    label: "Help"
  },
];

const mobileNavLinks = [
  {
    href: routesApp.home,
    icon: <HomeIcon width={50} height={25} />,
  },
  // {
  //   href: routesApp.clubs,
  //   icon: <SearchCircleIcon width={50} height={25} />,
  // },
];

export const Header = () => {
  const { route } = useRouter();
  const { data: walletClient } = useWalletClient();
  const { openSignInModal, setOpenSignInModal, isAuthenticated } = useLensSignIn(walletClient);
  const isMounted = useIsMounted();

  if (!isMounted) return null;

  return (
    <header className="bg-black border-b border-dark-grey shadow-sm">
      <nav className="mx-auto max-w-[100rem]" aria-label="Top">
        <div className="flex w-full items-center justify-between border-b border-dark-grey border-opacity-80 py-4 lg:border-none">
          <div className="flex items-center">
            <div className="pl-2 md:pl-6 w-max">
              <a className="bonsaiLogo" href={routesApp.home}>

              </a>
            </div>
            <div className="ml-10 hidden space-x-8 lg:block">
              {headerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  passHref
                  className={cx(
                    "link link-hover",
                    route.includes(link.href)
                      ? "font-bold"
                      : `font-medium opacity-70 hover:opacity-100 tour__${link.label.toLowerCase()}`,
                  )}
                >
                  {link.label}
                </Link>
              ))}
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
          <div className="hidden lg:block">{/** <SearchApp />  */}</div>
          <div className="flex space-x-2 gap-x-2 md:pr-6">
            <CreateClub />
            <ConnectButton
              className="md:px-4"
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
