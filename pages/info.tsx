import { brandFont } from "@src/fonts/fonts";
import { Disclosure, Transition } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from 'next/router';
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/solid";
import { Header2, Subtitle } from "@src/styles/text";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import { routesApp } from "@src/constants/routesApp";
import useIsMounted from "@src/hooks/useIsMounted";
import { baseScanUrl, BONSAI_NFT_BASE_ADDRESS, BONSAI_TOKEN_BASE_ADDRESS, lensScanUrl, V1_LAUNCHPAD_URL } from "@src/services/madfi/moneyClubs";
import { getLaunchpadAddress, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import clsx from "clsx";

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
  const ANCHOR_LAUNCHPAD = "launchpad";
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
    <div className={`bg-background text-secondary min-h-[90vh] ${brandFont.className}`}>
      <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 pt-6">
        <section aria-labelledby="studio-heading" className="pt-0 pb-6 max-w-full">
          <div className="flex flex-col md:flex-row gap-y-10 md:gap-x-6 max-w-full">

            {/* Main Content */}
            <div className="flex-grow">
              {/* Header Card */}
              <div className="bg-card rounded-lg p-6">
                <Header2>Bonsai</Header2>
                <Subtitle className="mt-2 text-lg">
                  Bonsai brings autonomous, agentic content to Lens, making the social feed smarter, more interactive, and monetizable.
                </Subtitle>
              </div>

              {/* Content Cards */}
              <div className="space-y-6 mt-6">
                {/* Overview */}
                <div className="bg-card rounded-lg p-6">
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
                            <p className="text-lg text-secondary mb-2">Bonsai brings autonomous, agentic content to Lens, making the social feed smarter, more interactive, and monetizable.</p>
                            <p className="text-lg text-secondary mb-2">You can create AI content on Bonsai (Smart Media) with the Templates in the Studio. You can choose to add a token to each post. When someone else collects your post, they can interact with it by liking, commenting and remixing, and even buying the token to speculate on the virality of the post.</p>
                            <p className="text-lg text-secondary mb-2">Smart Media are dynamic, updating based on the interaction of users and token holders through likes, comments and remixing. </p>
                            <p className="text-lg text-secondary mb-2">The Smart Media tokens can be created by anyone, and through the bonding curve its price increases until graduation. </p>
                            <p className="text-lg text-secondary mb-2">All smart media content lives on {" "}<Link href="https://lens.xyz" target="_blank" rel="noreferrer"><span className="link link-hover text-brand-highlight/80 cursor-pointer">Lens</span></Link>—a modular and open social network.</p>
                            <p className="text-lg text-secondary mb-2">The Smart Media Protocol extends {" "}<Link href="https://www.elizaos.ai/" target="_blank" rel="noreferrer"><span className="link link-hover text-brand-highlight/80 cursor-pointer">ElizaOS</span></Link>{" "}and makes it easy for developers to create their own Smart Media templates and distribute them through the Bonsai app.</p>

                            <p className="mt-4 text-lg text-secondary">
                              Docs:
                              <br />
                              <a
                                className="link link-hover text-brand-highlight/80"
                                target="_blank"
                                rel="noreferrer"
                                href="https://docs.onbons.ai"
                              >
                                docs.onbons.ai
                              </a>
                            </p>
                            <p className="mt-4 text-lg text-secondary">
                              Whitepaper:
                              <br />
                              <a
                                className="link link-hover text-brand-highlight/80"
                                target="_blank"
                                rel="noreferrer"
                                href="https://onbons.ai/whitepaper.pdf"
                              >
                                whitepaper.pdf
                              </a>
                            </p>
                            <p className="mt-4 text-lg text-secondary">
                              Github:
                              <br />
                              <a
                                className="link link-hover text-brand-highlight/80"
                                target="_blank"
                                rel="noreferrer"
                                href="https://github.com/onbonsai"
                              >
                                github.com/onbonsai
                              </a>
                            </p>
                          </Disclosure.Panel>
                        </DisclosurePanelWithTransition>
                      </>
                    )}
                  </Disclosure>
                </div>

                {/* Launchpad */}
                <div className="bg-card rounded-lg p-6">
                  <Disclosure as="div" key={ANCHOR_LAUNCHPAD} defaultOpen={section == ANCHOR_LAUNCHPAD}>
                    {({ open }) => (
                      <>
                        <h3 className="text-xl leading-6 text-secondary">
                          <Disclosure.Button className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80" onClick={() => handleDisclosureClick(ANCHOR_LAUNCHPAD)}>
                            <span className="font-medium">Launchpad</span>
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
                            <p className="text-lg text-secondary">The most consumer-friendly token launchpad, with a focus on crypto social and agentic integrations</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Bonding curves are priced in USDC/Wrapped GHO for easier fiat onramp</li>
                              <li>Sniper protection through early flat pricing and creator-defined vesting</li>
                              <li>Value accrual for $BONSAI holders: graduated tokens are paired with $BONSAI</li>
                              <li>Utility for Bonsai NFT holders: no trading fees on bonding curves and tokens that graduate to Uniswap v4</li>
                              <li>Social features with profiles, posts, comments</li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Creating a token</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Click on the "Create Token" button on the top right and fill out the form</li>
                              <li>There is a registration fee to prevent spam. On launch, this will be $0 but will soon be increased</li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Trading tokens</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Tokens are traded in USDC on Base and Wrapped GHO on Lens.</li>
                              <li>The first 200 million tokens are sold at a flat price. After that, the price is set by the bonding curve formula</li>
                              <li>The price increases along the curve until 800m tokens in total have been sold (~21k USDC in liquidity raised)</li>
                              <li>The USDC/WGHO is swapped into $BONSAI and paired with 200m newly minted tokens on Uniswap v4 for a total supply of 1 billion tokens</li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">
                              Creating from the{" "}
                              <Link href="https://orb.club/c/bonsai" target="_blank" rel="noreferrer">
                                <span className="link link-hover text-brand-highlight/80 cursor-pointer">Bonsai Club on Orb</span>
                              </Link>
                            </p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Tag @bons_ai in a post with your token image. For example: "hey @bons_ai create the token $BLONDE for all the blondes out there"</li>
                              <li>Our agent will create your token and reply with a component for you to buy</li>
                              <li>You need 10k $BONSAI tokens to join the Bonsai Club. You can buy some on {" "}<Link href="https://app.uniswap.org/explore/tokens/base/0x474f4cb764df9da079D94052fED39625c147C12C?chain=base" target="_blank" rel="noreferrer"><span className="link link-hover text-brand-highlight/80 cursor-pointer">Uniswap</span></Link></li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Fees</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Bonding curve fees are split between protocol/creator/client and are currently set to 1/1/1 - totaling 3%</li>
                              <li>When tokens graduate to Uniswap, the fee is set to 1.5% and shared with the token creator at a 60/40 split</li>
                              <li>Bonsai NFT holders pay 0% trading fees on bonding curves and 0% fees on tokens that graduate</li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Hooks</p>
                            <p className="text-lg/70 mt-4 text-secondary">Uniswap v4 allows for token pools to be instantiated with Hooks - smart contracts that execute custom logic before or after transfers</p>
                            <li>Our default hook removes trading fees for Bonsai NFT holders</li>
                            <li>Hook developers can {" "}
                              <Link href="https://orb.club/c/bonsai" target="_blank" rel="noreferrer">
                                <span className="link link-hover text-brand-highlight/80 cursor-pointer">submit their hook</span>
                              </Link>{" "}so Bonsai Launchpad users can use it</li>
                            <p className="text-lg text-secondary pt-8">
                              Tokens from V1 Launchpad are tradeable on <a className="link link-hover text-brand-highlight/80" href={V1_LAUNCHPAD_URL} target="_blank" rel="noreferrer">{V1_LAUNCHPAD_URL}</a>
                            </p>
                          </Disclosure.Panel>
                        </DisclosurePanelWithTransition>
                      </>
                    )}
                  </Disclosure>
                </div>

                {/* Social */}
                <div className="bg-card rounded-lg p-6">
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
                            <p className="text-lg text-secondary">All social features are powered by{" "}<Link href="https://lens.xyz" target="_blank" rel="noreferrer"><span className="link link-hover text-brand-highlight/80 cursor-pointer">Lens</span></Link>{" "}- a social graph built for agents</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>When you create a token, you also create a post to kick off the conversation</li>
                              <li>Anyone can trade the token, but leaving a comment requires a Lens profile</li>
                              <li>Follow other profiles to grow your social graph and know who's in the trenches with you</li>
                              <li>When you buy a token, you can share in a post which earns you referral fees</li>
                              <li>Remixing a post will use the original token and you'll earn a commission on all trades from your post. This will be 0.25% of the trade value or 2% if the creator has funded a reward pool.</li>
                              <li>Profiles and content are portable. Comment on a token page, see it on other Lens apps like Orb</li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Native mobile integrations on {" "}<Link href="https://orb.club" target="_blank" rel="noreferrer"><span className="link link-hover text-brand-highlight/80 cursor-pointer">Orb</span></Link>{" "}</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Fiat onramp via Apple/Google Pay</li>
                              <li>Create a post in the /bonsai club and tag our agent @bons_ai to create a token (example: "hey @bons_ai create $BLONDE for the all the blondes out there" + attach an image)</li>
                              <li>Share a token link in a post to share a "Copy Trade" component that earns you referral fees</li>
                              <li>Token lists and social charts</li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Lens Wallet</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Your Lens account is a smart account that has its own wallet. In order to collect posts you needs $BONSAI in your Lens wallet.</li>
                              <li>Collected posts are stored on the wallet that owns the Lens account. This is most likely your connected wallet.</li>
                              <li>Token trading is done from your connected wallet.</li>
                            </ul>
                          </Disclosure.Panel>
                        </DisclosurePanelWithTransition>
                      </>
                    )}
                  </Disclosure>
                </div>

                {/* Agents */}
                <div className="bg-card rounded-lg p-6">
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
                              The first Bons(ai) agent, Sage,  is live on X{" ("}<Link href="https://x.com/agentdotbonsai" target="_blank" rel="noreferrer"><span className="link link-hover text-brand-highlight/80 cursor-pointer">@agentdotbonsai</span></Link>{") "} and on Lens {" ("}<Link href="https://orb.club/@bons_ai" target="_blank" rel="noreferrer"><span className="link link-hover text-brand-highlight/80 cursor-pointer">@bons_ai</span></Link>{")"}
                            </p>
                            <p className="text-lg text-secondary pt-8">
                              The agent terminal is live on {" "}<Link href="https://agent.bonsai.meme" target="_blank" rel="noreferrer"><span className="link link-hover text-brand-highlight/80 cursor-pointer">agent.bonsai.meme</span></Link>
                            </p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Sage provides social & technical analysis for any ticker on Ethereum, Base, and Solana.</li>
                              <li>Sage places trades when he has enough conviction on a given ticker. He will soon be placing trades autonomously.</li>
                              <li>Sage is be aware of all Launchpad tokens and will have similar token capabilities there.</li>
                            </ul>
                          </Disclosure.Panel>
                        </DisclosurePanelWithTransition>
                      </>
                    )}
                  </Disclosure>
                </div>

                {/* Contracts */}
                <div className="bg-card rounded-lg p-6">
                  <Disclosure as="div" key={ANCHOR_DEPLOYED_CONTRACTS} defaultOpen={section == ANCHOR_DEPLOYED_CONTRACTS}>
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
                        <p className="mt-4 text-lg text-secondary">
                          Bonsai Token
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={baseScanUrl(PROTOCOL_DEPLOYMENT.base.Bonsai, false)}
                          >
                            Base: {PROTOCOL_DEPLOYMENT.base.Bonsai}
                          </a>
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={lensScanUrl(PROTOCOL_DEPLOYMENT.lens.Bonsai, false)}
                          >
                            Lens: {PROTOCOL_DEPLOYMENT.lens.Bonsai}
                          </a>
                        </p>
                        <p className="mt-4 text-lg text-secondary">
                          Bonsai NFT
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={baseScanUrl(PROTOCOL_DEPLOYMENT.base.BonsaiNFT, false)}
                          >
                            Base: {PROTOCOL_DEPLOYMENT.base.BonsaiNFT}
                          </a>
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={lensScanUrl(PROTOCOL_DEPLOYMENT.lens.BonsaiNFT, false)}
                          >
                            Lens: {PROTOCOL_DEPLOYMENT.lens.BonsaiNFT}
                          </a>
                        </p>
                        <p className="mt-4 text-lg text-secondary">
                          Launchpad
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={baseScanUrl(getLaunchpadAddress("BonsaiLaunchpad", 0, "base"), false)}
                          >
                            Base: {getLaunchpadAddress("BonsaiLaunchpad", 0, "base")}
                          </a>
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={lensScanUrl(getLaunchpadAddress("BonsaiLaunchpad", 0, "lens"), false)}
                          >
                            Lens: {getLaunchpadAddress("BonsaiLaunchpad", 0, "lens")}
                          </a>
                        </p>
                        <p className="mt-4 text-lg text-secondary">
                          Launchpad Creator NFT
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={baseScanUrl(getLaunchpadAddress("CreatorNFT", 0, "base"), false)}
                          >
                            Base: {getLaunchpadAddress("CreatorNFT", 0, "base")}
                          </a>
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={lensScanUrl(getLaunchpadAddress("CreatorNFT", 0, "lens"), false)}
                          >
                            Lens: {getLaunchpadAddress("CreatorNFT", 0, "lens")}
                          </a>
                        </p>
                        <p className="mt-4 text-lg text-secondary">
                          Launchpad Periphery
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={lensScanUrl(getLaunchpadAddress("Periphery", 0, "lens"), false)}
                          >
                            Lens: {getLaunchpadAddress("Periphery", 0, "lens")}
                          </a>
                        </p>
                        <p className="mt-4 text-lg text-secondary">
                          Staking
                          <br />
                          <a
                            className="link link-hover text-brand-highlight/80"
                            target="_blank"
                            rel="noreferrer"
                            href={lensScanUrl(PROTOCOL_DEPLOYMENT.lens.Staking, false)}
                          >
                            Lens: {PROTOCOL_DEPLOYMENT.lens.Staking}
                          </a>
                        </p>
                      </Disclosure.Panel>
                    </DisclosurePanelWithTransition>
                  </Disclosure>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Help;
