import { Disclosure, Transition } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from 'next/router';
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/solid";

import { routesApp } from "@src/constants/routesApp";
import useIsMounted from "@src/hooks/useIsMounted";
import { baseScanUrl, BONSAI_NFT_BASE_ADDRESS, BONSAI_TOKEN_BASE_ADDRESS } from "@src/services/madfi/moneyClubs";
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

  const ANCHOR_OVERVIEW = "overview";
  const ANCHOR_SOCIAL = "social";
  const ANCHOR_AGENTS = "agents";
  const ANCHOR_DEPLOYED_CONTRACTS = "deployed-contracts";

  let { section } = router.query;

  const handleDisclosureClick = (anchor: string) => {
    router.replace({
      pathname: router.pathname,
      query: { ...router.query, section: anchor },
    }, undefined, { scroll: false });
  };

  // do not render until we are mounted and we have parsed out the `section` param when it exists
  if (!isMounted || (router.asPath.includes("section") && section === undefined)) return null;

  section = section || ANCHOR_OVERVIEW;

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md:max-w-[80rem] px-4 sm:px-2 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between border-b border-dark-grey pt-12 pb-4">
          <h1 className="text-3xl md:text-5xl font-bold font-owners tracking-wide mb-4 md:mb-0">
            Bonsai Launchpad
          </h1>
        </div>
        <section aria-labelledby="dashboard-heading" className="pt-8 pb-24 max-w-full">
          <div className="md:pl-12 md:pr-12 md:pb-12 pl-2 pr-2 pb-2">
            <section className="mt-4 max-w-screen-lg">
              {/* Overview */}
              <div className="">
                <Disclosure as="div" key={ANCHOR_OVERVIEW} defaultOpen={section == ANCHOR_OVERVIEW}>
                  {({ open }) => (
                    <>
                      <h3 className="text-xl leading-6 text-secondary">
                        <Disclosure.Button className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80" onClick={() => handleDisclosureClick(ANCHOR_OVERVIEW)}>
                          <span className="font-medium">Overview</span>
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
                          <p className="text-lg text-secondary">The most consumer-friendly memecoin launchpad, with a focus on crypto social and agentic integrations</p>
                          <ul className="list-disc pl-5 mt-4 text-lg/70">
                            <li>Bonding curves are priced in USDC for easier fiat onramp</li>
                            <li>Snipe protection on recently created tokens</li>
                            <li>Value accrual for $BONSAI holders: graduated token liquidity is swapped into $BONSAI for the Uniswap pool</li>
                            <li>Utility for Bonsai NFT holders: no trading fees on bonding curves and tokens that graduate to Uniswap v4 (soon)</li>
                            <li>Social features with profiles, posts, comments</li>
                          </ul>
                          <p className="text-lg text-secondary pt-8">Creating a token</p>
                          <ul className="list-disc pl-5 mt-4 text-lg/70">
                            <li>You will need a Lens profile. Mint one {" "}<Link href="https://onboarding.lens.xyz/mint" target="_blank" rel="noreferrer"><span className="link-hover cursor-pointer">here</span></Link></li>
                            <li>Click on the "Create Token" button on the top right and fill out the form</li>
                            <li>There is a registration fee to prevent spam. On launch, this will be $0 but will soon be increased</li>
                          </ul>
                          <p className="text-lg text-secondary pt-8">
                            Creating from the{" "}
                            <Link href="https://orb.club/c/bonsai" target="_blank" rel="noreferrer">
                              <span className="link-hover cursor-pointer">Bonsai Club on Orb</span>
                            </Link>
                          </p>
                          <ul className="list-disc pl-5 mt-4 text-lg/70">
                            <li>Tag @bons_ai in a post with your token image. For example: "hey @bons_ai create the token $BLONDE for all the blondes out there"</li>
                            <li>Our agent will create your token and reply with a component for you to buy</li>
                            <li>You need 10k $BONSAI tokens to join the Bonsai Club. You can buy some on the {" "}<Link href={routesApp.dashboard} legacyBehavior target="_blank" rel="noreferrer"><span className="link-hover cursor-pointer">dashboard</span></Link>{" "} or on {" "}<Link href="https://app.uniswap.org/explore/tokens/base/0x474f4cb764df9da079D94052fED39625c147C12C?chain=base" target="_blank" rel="noreferrer"><span className="link-hover cursor-pointer">Uniswap</span></Link></li>
                          </ul>
                        </Disclosure.Panel>
                      </DisclosurePanelWithTransition>
                    </>
                  )}
                </Disclosure>
              </div>

              {/* Social features */}
              <div className="pt-8">
                <Disclosure as="div" key={ANCHOR_SOCIAL} defaultOpen={section == ANCHOR_SOCIAL}>
                  {({ open }) => (
                    <>
                      <h3 className="text-xl leading-6 text-secondary">
                        <Disclosure.Button className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80" onClick={() => handleDisclosureClick(ANCHOR_SOCIAL)}>
                          <span className="font-medium">Social</span>
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
                          <p className="text-lg text-secondary">All social features are powered by{" "}<Link href="https://lens.xyz" target="_blank" rel="noreferrer"><span className="link-hover cursor-pointer">Lens</span></Link>{" "}- a social graph built for agents</p>
                          <ul className="list-disc pl-5 mt-4 text-lg/70">
                            <li>When you create a token, you also create a post to kick off the conversation</li>
                            <li>Anyone can trade the token, but leaving a comment requires a Lens profile</li>
                            <li>Follow other profiles to grow your social graph and know who's in the trenches with you</li>
                            <li>When you buy a token, you can share in a post which earns you referral fees</li>
                            <li>Profiles and content are portable. Comment on a token page, see it on other Lens apps like Orb</li>
                          </ul>
                          <p className="text-lg text-secondary pt-8">Native mobile integrations on {" "}<Link href="https://lens.xyz" target="_blank" rel="noreferrer"><span className="link-hover cursor-pointer">Orb</span></Link>{" "}</p>
                          <ul className="list-disc pl-5 mt-4 text-lg/70">
                            <li>Fiat onramp via Apple/Google Pay</li>
                            <li>Create a post in the /bonsai club and tag our agent @bons_ai to create a token (example: "hey @bons_ai create $BLONDE for the all the blondes out there" + attach an image)</li>
                            <li>Share a token link in a post to share a "Copy Trade" component that earns you referral fees</li>
                            <li>Token lists and social charts</li>
                          </ul>
                        </Disclosure.Panel>
                      </DisclosurePanelWithTransition>
                    </>
                  )}
                </Disclosure>
              </div>

              {/* Agents */}
              <div className="pt-8">
                <Disclosure as="div" key={ANCHOR_AGENTS} defaultOpen={section == ANCHOR_AGENTS}>
                  {({ open }) => (
                    <>
                      <h3 className="text-xl leading-6 text-secondary">
                        <Disclosure.Button className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80" onClick={() => handleDisclosureClick(ANCHOR_AGENTS)}>
                          <span className="font-medium">AI Agents</span>
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
                          <p className="text-lg text-secondary">
                            The first Bons(ai) agent, Sage,  is live on X{" ("}<Link href="https://x.com/agentdotbonsai" target="_blank" rel="noreferrer"><span className="link-hover cursor-pointer">@agentdotbonsai</span></Link>{") "} and on Lens {" ("}<Link href="https://orb.club/@bons_ai" target="_blank" rel="noreferrer"><span className="link-hover cursor-pointer">@bons_ai</span></Link>{")"}
                          </p>
                          <p className="text-lg text-secondary pt-8">
                            The agent terminal is live on {" "}<Link href="https://agent.bonsai.meme" target="_blank" rel="noreferrer"><span className="link-hover cursor-pointer">agent.bonsai.meme</span></Link>
                          </p>
                          <ul className="list-disc pl-5 mt-4 text-lg/70">
                            <li>You will need a Bonsai NFT to send messages.</li>
                            <li>Sage provides social & technical analysis for any ticker on Ethereum, Base, and Solana.</li>
                            <li>Sage places trades when he has enough conviction on a given ticker. He will soon be placing trades autonomously.</li>
                            <li>Sage will be aware of all Launchpad tokens and will have similar token capabilities there.</li>
                          </ul>
                          <p className="text-lg text-secondary pt-8">While we improve Sage's onchain capabilities, we're {" "}<Link href="https://github.com/ai16z/eliza/pull/1098" target="_blank" rel="noreferrer"><span className="link-hover cursor-pointer">contributing to the Eliza framework</span></Link> and preparing for Phase II of this launch - enabling anyone to create an agent for their token</p>
                          <ul className="list-disc pl-5 mt-4 text-lg/70">
                            <li>Tokens that graduate will be eligible to migrate to the Bons(ai) agent stack in q1 2025.</li>
                            <li>Agents will have native functionality on Lens Network, a true onchain plaground.</li>
                            <li>$BONSAI will continue to play a key role in our agentic economy.</li>
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
                          <p className="mt-4 text-lg text-secondary/70">
                            Bonsai Token |{" "}
                            <a
                              className="link link-hover"
                              target="_blank"
                              rel="noreferrer"
                              href={baseScanUrl(BONSAI_TOKEN_BASE_ADDRESS)}
                            >
                              {BONSAI_TOKEN_BASE_ADDRESS}
                            </a>
                          </p>
                          <p className="mt-4 text-lg text-secondary/70">
                            Bonsai NFT |{" "}
                            <a
                              className="link link-hover"
                              target="_blank"
                              rel="noreferrer"
                              href={baseScanUrl(BONSAI_NFT_BASE_ADDRESS)}
                            >
                              {BONSAI_NFT_BASE_ADDRESS}
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
