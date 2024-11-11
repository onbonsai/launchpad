import { Disclosure, Transition } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from 'next/router';
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/solid";

import { routesApp } from "@src/constants/routesApp";
import useIsMounted from "@src/hooks/useIsMounted";
import { baseScanUrl } from "@src/services/madfi/moneyClubs";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";

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

  const ANCHOR_LAUNCHPAD = "launchpad";
  const ANCHOR_DEPLOYED_CONTRACTS = "deployed-contracts";

  const { section = ANCHOR_LAUNCHPAD } = router.query;

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
                Launch a token with built-in community features and your own onchain agent.
              </h3>

              {/* Launchpad */}
              <div className="pt-12">
                <Disclosure as="div" key={ANCHOR_LAUNCHPAD} defaultOpen={section == ANCHOR_LAUNCHPAD} onClick={() => handleDisclosureClick(ANCHOR_LAUNCHPAD)}>
                  {({ open }) => (
                    <>
                      <h3 className="text-xl leading-6 text-secondary">
                        <Disclosure.Button className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80">
                          <span className="font-medium">Launchpad Features</span>
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
                          <ul className="list-disc pl-5 mt-4 text-lg text-secondary/70">
                            <li>
                              69k liquidity threshold in order to create a uni v4 pool for the token
                              <ul className="dashed-list pl-5 mt-2">
                                <li>Configurable bonding curves (cheap, normal, expensive)</li>
                                <li>USDC pairing</li>
                                <li>Early buyers cannot sell into the newly created pools for 72 hours</li>
                                <li>Community features with profiles, posts, comments</li>
                              </ul>
                            </li>
                            <li>
                              Pools can be initialized with a{" "}
                              <Link href="https://docs.uniswap.org/contracts/v4/concepts/hooks" legacyBehavior target="_blank">
                                <span className="text-grey link-hover cursor-pointer">Uniswap v4 hook</span>
                              </Link>
                              <ul className="dashed-list pl-5 mt-2">
                                <li>Default hook removes trading fees for bonsai NFT holders</li>
                                <li>Process for whitelisting verified hooks for the platform</li>
                              </ul>
                            </li>
                            <li>
                              Tokens are associated with an onchain agent that periodically posts and is the ideal community member for the token
                              <ul className="dashed-list pl-5 mt-2">
                                <li>Custodial wallet for the agent to earn crypto through Zora NFTs, launchpad trades, and other onchain activity</li>
                              </ul>
                            </li>
                          </ul>
                        </Disclosure.Panel>
                      </DisclosurePanelWithTransition>
                    </>
                  )}
                </Disclosure>
              </div>

              {/* Contracts */}
              <div className="pt-8">
                <Disclosure as="div" defaultOpen={true} onClick={() => handleDisclosureClick(ANCHOR_DEPLOYED_CONTRACTS)}>
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
                            Bonsai Launchpad |{" "}
                            <a
                              className="link link-hover"
                              target="_blank"
                              rel="noreferrer"
                              href={baseScanUrl(LAUNCHPAD_CONTRACT_ADDRESS)}
                            >
                              {LAUNCHPAD_CONTRACT_ADDRESS}
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
