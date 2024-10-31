import { Disclosure, Transition } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from 'next/router';
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/solid";

import { polygonScanUrl } from "@src/utils/utils";
import {
  MAD_SBT_CONTRACT_ADDRESS,
  BOUNTIES_CONTRACT_ADDRESS,
  REV_SHARE_LIBRARY_ADDRESS,
  STICKERS_CONTRACT_ADDRESS
} from "@src/services/madfi/utils";
import { routesApp } from "@src/constants/routesApp";
import useIsMounted from "@src/hooks/useIsMounted";

const DisclosurePanelWithTransition = ({ children }) => {
  return (
    <Transition
      enter="transition ease-in-out duration-200"
      enterFrom="opacity-0 translate-y-1"
      enterTo="opacity-100 translate-y-0"
    >
      {children}
    </Transition>
  )
};

const Help = () => {
  const router = useRouter();
  const isMounted = useIsMounted();

  const { section } = router.query;

  const ANCHOR_BOUNTIES = "bounties";
  const ANCHOR_CLUBS = "clubs";
  const ANCHOR_CASHTAGS = "cashtags";
  const ANCHOR_CREATE_CLUB = "create-a-club";
  const ANCHOR_BOUNTIES_PERMISSIONS = "bounties-permissions";
  const ANCHOR_SUBMIT_BID = "submit-a-bid";
  const ANCHOR_CREATE_BOUNTY = "create-a-bounty";
  const ANCHOR_DEPLOYED_CONTRACTS = "deployed-contracts";

  const handleDisclosureClick = (anchor: string) => {
    router.replace({
      pathname: router.pathname,
      query: { ...router.query, section: anchor },
    }, undefined, { scroll: true });
  };

  // do not render until we are mounted and we have parsed out the `section` param when it exists
  if (!isMounted || (router.asPath.includes("section") && section === undefined)) return null;

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-2 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between border-b border-dark-grey pt-12 pb-4">
          <h1 className="text-3xl md:text-5xl font-bold font-owners tracking-wide mb-4 md:mb-0">
            FAQ
          </h1>
        </div>
        <section aria-labelledby="dashboard-heading" className="pt-8 pb-24 max-w-full">
          <div className="md:pl-12 md:pr-12 md:pb-12 pl-2 pr-2 pb-2">
            <section className="mt-4 max-w-screen-lg">
              {/* Top */}
              <h3 className="text-xl leading-6">
                Create a Moonshot and earn trading fees. Once your Moonshot reaches $6.9k in liquidity, a Uni v4 Pool will be created.
              </h3>

              {/* Cashtags */}
              <div className="pt-12">
                <Disclosure as="div" key={ANCHOR_CASHTAGS} defaultOpen={section == ANCHOR_CASHTAGS} onClick={() => handleDisclosureClick(ANCHOR_CASHTAGS)}>
                  {({ open }) => (
                    <>
                      <h3 className="text-xl leading-6 text-secondary">
                        <Disclosure.Button className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80">
                          <span className="font-medium">Cashtags</span>
                          <span className="ml-6 flex items-center">
                            {open ? (
                              <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
                            )}
                          </span>
                        </Disclosure.Button>
                      </h3>
                      <DisclosurePanelWithTransition>
                        <Disclosure.Panel className="p-2">
                          <p className="mt-4 text-lg text-secondary/70">
                            Remember FriendTech? This is better.
                          </p>
                          <p className="mt-4 text-lg text-secondary/70">
                            <span className="text-primary">Cashtags</span> allow anyone to trade a creator's Lens handle - where price is determined by supply + demand (a bonding curve).
                            Creators earn trading fees as people buy and sell the $cashtag.
                          </p>
                          <p className="mt-4 text-lg text-secondary/70">
                            You can trade $cashtags on any client that supports Transaction Frames. Featured apps include{" "}
                            <Link href={"https://dex.bonsai.meme"} passHref>
                              <span className="link link-hover">Bonsai DEX</span>
                            </Link>
                            {", and "}
                            <Link href={"https://buttrfly.app"} passHref>
                              <span className="link link-hover">Buttrfly</span>
                            </Link>
                            .
                          </p>
                          <p className="mt-4 text-lg text-secondary/70">
                            <Link href={routesApp.clubs} passHref>
                              <span className="link link-hover">Explore some cashtags</span>
                            </Link>
                            {" "} and start trading today.
                          </p>
                        </Disclosure.Panel>
                      </DisclosurePanelWithTransition>
                    </>
                  )}
                </Disclosure>
              </div>

              {/* Contracts */}
              <div className="pt-8">
                <Disclosure as="div" defaultOpen={section === ANCHOR_DEPLOYED_CONTRACTS} onClick={() => handleDisclosureClick(ANCHOR_DEPLOYED_CONTRACTS)}>
                  {({ open }) => (
                    <>
                      <h3 className="text-xl leading-6 text-secondary">
                        <Disclosure.Button className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80">
                          <span className="font-medium">Deployed Contracts</span>
                          <span className="ml-6 flex items-center">
                            {open ? (
                              <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
                            )}
                          </span>
                        </Disclosure.Button>
                      </h3>
                      <DisclosurePanelWithTransition>
                        <Disclosure.Panel className="p-2">
                          <p className="mt-4 text-lg text-secondary/70">
                            Bounties |{" "}
                            <a
                              className="link link-hover"
                              target="_blank"
                              rel="noreferrer"
                              href={polygonScanUrl(BOUNTIES_CONTRACT_ADDRESS, process.env.NEXT_PUBLIC_CHAIN_ID!)}
                            >
                              {BOUNTIES_CONTRACT_ADDRESS}
                            </a>
                          </p>
                          <p className="mt-4 text-lg text-secondary/70">
                            Social Club Badges |{" "}
                            <a
                              className="link link-hover"
                              target="_blank"
                              rel="noreferrer"
                              href={polygonScanUrl(MAD_SBT_CONTRACT_ADDRESS, process.env.NEXT_PUBLIC_CHAIN_ID!)}
                            >
                              {MAD_SBT_CONTRACT_ADDRESS}
                            </a>
                          </p>
                          <p className="mt-4 text-lg text-secondary/70">
                            Reward NFT |{" "}
                            <a
                              className="link link-hover"
                              target="_blank"
                              rel="noreferrer"
                              href={polygonScanUrl(STICKERS_CONTRACT_ADDRESS, process.env.NEXT_PUBLIC_CHAIN_ID!)}
                            >
                              {STICKERS_CONTRACT_ADDRESS}
                            </a>
                          </p>
                          <p className="mt-4 text-lg text-secondary/70">
                            Revenue Share Library |{" "}
                            <a
                              className="link link-hover"
                              target="_blank"
                              rel="noreferrer"
                              href={polygonScanUrl(REV_SHARE_LIBRARY_ADDRESS, process.env.NEXT_PUBLIC_CHAIN_ID!)}
                            >
                              {REV_SHARE_LIBRARY_ADDRESS}
                            </a>
                          </p>
                        </Disclosure.Panel>
                      </DisclosurePanelWithTransition>
                    </>
                  )}
                </Disclosure>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Help;
