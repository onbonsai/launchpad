import { brandFont } from "@src/fonts/fonts";
import { Disclosure, Transition } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/solid";
import { Header2, Subtitle } from "@src/styles/text";
import useIsMounted from "@src/hooks/useIsMounted";
import { baseScanUrl, lensScanUrl, V1_LAUNCHPAD_URL } from "@src/services/madfi/moneyClubs";
import { getLaunchpadAddress, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";

const DisclosurePanelWithTransition = ({ children }) => {
  return (
    <Transition
      enter="transition ease-in-out duration-200"
      enterFrom="opacity-0 translate-y-1"
      enterTo="opacity-100 translate-y-0"
    >
      {children}
    </Transition>
  );
};

const Help = () => {
  const router = useRouter();
  const isMounted = useIsMounted();

  const ANCHOR_OVERVIEW = "overview";
  const ANCHOR_LAUNCHPAD = "launchpad";
  const ANCHOR_SOCIAL = "social";
  const ANCHOR_DEPLOYED_CONTRACTS = "deployed-contracts";

  let { section } = router.query;

  const handleDisclosureClick = (anchor: string) => {
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, section: anchor },
      },
      undefined,
      { scroll: false },
    );
  };

  // do not render until we are mounted and we have parsed out the `section` param when it exists
  if (!isMounted || (router.asPath.includes("section") && section === undefined)) return null;

  section = section || ANCHOR_OVERVIEW;

  return (
    <div className={`bg-background text-secondary min-h-[90vh] ${brandFont.className}`}>
      <main className="mx-auto max-w-full md:max-w-[100rem] px-2 sm:px-6 pt-6">
        <section aria-labelledby="studio-heading" className="pt-0 pb-6 max-w-full">
          <div className="flex flex-col md:flex-row gap-y-10 md:gap-x-6 max-w-full">
            {/* Main Content */}
            <div className="flex-grow">
              {/* Header Card */}
              <div className="bg-card rounded-lg p-6">
                <Header2>IASNOB</Header2>
                <Subtitle className="mt-2 text-lg">
                  IASNOB is a meme coin for Lens and a launchpad for new coins.
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
                          <Disclosure.Button
                            className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80"
                            onClick={() => handleDisclosureClick(ANCHOR_OVERVIEW)}
                          >
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
                            <p className="text-lg text-secondary mb-2">
                              IASNOB Launchpad allows anyone to create a token on Lens chain
                            </p>
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
                              Github:
                              <br />
                              <a
                                className="link link-hover text-brand-highlight/80"
                                target="_blank"
                                rel="noreferrer"
                                href="https://github.com/onbonsai/launchpad"
                              >
                                github.com/onbonsai/launchpad
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
                          <Disclosure.Button
                            className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80"
                            onClick={() => handleDisclosureClick(ANCHOR_LAUNCHPAD)}
                          >
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
                            <p className="text-lg text-secondary">
                              The most consumer-friendly token launchpad, with a focus on crypto social and agentic
                              integrations
                            </p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Bonding curves are priced in USDC/Wrapped GHO for easier fiat onramp</li>
                              <li>Sniper protection through early flat pricing and creator-defined vesting</li>
                              <li>Value accrual for $IASNOB holders: graduated tokens are paired with $IASNOB</li>
                              <li>
                                Utility for Bonsai NFT holders: no trading fees on bonding curves and tokens that
                                graduate to Uniswap v4
                              </li>
                              <li>Social features with profiles, posts, comments</li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Creating a token</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Click on the "Create Token" button on the top right and fill out the form</li>
                              <li>
                                There is a registration fee to prevent spam. On launch, this will be $0 but will soon be
                                increased
                              </li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Trading tokens</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Tokens are traded in Wrapped GHO on Lens.</li>
                              <li>
                                The first 200 million tokens are sold at a flat price. After that, the price is set by
                                the bonding curve formula
                              </li>
                              <li>
                                The price increases along the curve until 800m tokens in total have been sold (~21k USDC
                                in liquidity raised)
                              </li>
                              <li>
                                The WGHO is swapped into $IASNOB and paired with 200m newly minted tokens on Uniswap v4
                                for a total supply of 1 billion tokens
                              </li>
                            </ul>
                            <ul className="list-disc pl-5 mt-4 text-lg/70"></ul>
                            <p className="text-lg text-secondary pt-8">Fees</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>
                                Bonding curve fees are split between protocol/creator/client and are currently set to
                                1/1/1 - totaling 3%
                              </li>
                              <li>
                                When tokens graduate to Uniswap, the fee is set to 1.5% and shared with the token
                                creator at a 60/40 split
                              </li>
                              <li>
                                Bonsai NFT holders pay 0% trading fees on bonding curves and 0% fees on tokens that
                                graduate
                              </li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Hooks</p>
                            <p className="text-lg/70 mt-4 text-secondary">
                              Uniswap v4 allows for token pools to be instantiated with Hooks - smart contracts that
                              execute custom logic before or after transfers. NOT
                            </p>
                            <li>Our default hook removes trading fees for Bonsai NFT holders</li>
                            <li>
                              Hook developers can{" "}
                              <Link href="https://orb.club/c/bonsai" target="_blank" rel="noreferrer">
                                <span className="link link-hover text-brand-highlight/80 cursor-pointer">
                                  submit their hook
                                </span>
                              </Link>{" "}
                              so IASNOB Launchpad users can use it
                            </li>
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
                          <Disclosure.Button
                            className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80"
                            onClick={() => handleDisclosureClick(ANCHOR_SOCIAL)}
                          >
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
                            <p className="text-lg text-secondary">
                              All social features are powered by{" "}
                              <Link href="https://lens.xyz" target="_blank" rel="noreferrer">
                                <span className="link link-hover text-brand-highlight/80 cursor-pointer">Lens</span>
                              </Link>{" "}
                              - a social graph built for agents
                            </p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>When you create a token, you also create a post to kick off the conversation</li>
                              <li>Anyone can trade the token, but leaving a comment requires a Lens profile</li>
                              <li>
                                Follow other profiles to grow your social graph and know who's in the trenches with you
                              </li>
                              <li>When you buy a token, you can share in a post which earns you referral fees</li>
                              <li>
                                Remixing a post will use the original token and you'll earn a commission on all trades
                                from your post. This will be 0.25% of the trade value or 2% if the creator has funded a
                                reward pool.
                              </li>
                              <li>
                                Profiles and content are portable. Comment on a token page, see it on other Lens apps
                                like Orb
                              </li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">
                              Native mobile integrations on{" "}
                              <Link href="https://orb.club" target="_blank" rel="noreferrer">
                                <span className="link link-hover text-brand-highlight/80 cursor-pointer">Orb</span>
                              </Link>{" "}
                            </p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>Fiat onramp via Apple/Google Pay</li>
                              <li>
                                Create a post in the /bonsai club and tag our agent @bons_ai to create a token (example:
                                "hey @bons_ai create $BLONDE for the all the blondes out there" + attach an image)
                              </li>
                              <li>
                                Share a token link in a post to share a "Copy Trade" component that earns you referral
                                fees
                              </li>
                              <li>Token lists and social charts</li>
                            </ul>
                            <p className="text-lg text-secondary pt-8">Lens Wallet</p>
                            <ul className="list-disc pl-5 mt-4 text-lg/70">
                              <li>
                                Your Lens account is a smart account that has its own wallet. In order to collect posts
                                you needs $IASNOB in your Lens wallet.
                              </li>
                              <li>
                                Collected posts are stored on the wallet that owns the Lens account. This is most likely
                                your connected wallet.
                              </li>
                              <li>Token trading is done from your connected wallet.</li>
                            </ul>
                          </Disclosure.Panel>
                        </DisclosurePanelWithTransition>
                      </>
                    )}
                  </Disclosure>
                </div>

                {/* Tokenomics */}
                <div className="bg-card rounded-lg p-6">
                  <Disclosure as="div" key="tokenomics" defaultOpen={section == "tokenomics"}>
                    {({ open }) => (
                      <>
                        <h3 className="text-xl leading-6 text-secondary">
                          <Disclosure.Button
                            className="flex w-full items-center justify-between px-2 py-3 text-secondary hover:text-secondary/80"
                            onClick={() => handleDisclosureClick("tokenomics")}
                          >
                            <span className="font-medium">Tokenomics</span>
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
                              $BONSAI was originally created on Polygon but has been sunsetted in favor of IASNOB to
                              create improved distribution and tokenomics. BONSAI NFTs still grant you 0 trading fees.
                            </p>
                            <p className="text-lg text-secondary mt-4">
                              The original supply was airdropped to active Lens users in March 2024. Team and private
                              sale allocations are vesting on Superfluid on Polygon starting April 2024 for 18 months
                              with a 6-month cliff.
                            </p>
                            <p className="text-lg text-secondary mt-4">
                              <Link
                                href="https://fountain.ink/p/natem/jr7nevb4z3rnbg0srg"
                                target="_blank"
                                rel="noreferrer"
                              >
                                <span className="link link-hover text-brand-highlight/80 cursor-pointer">
                                  Read more about $BONSAI tokenomics and value accrual
                                </span>
                              </Link>
                            </p>
                          </Disclosure.Panel>
                        </DisclosurePanelWithTransition>
                      </>
                    )}
                  </Disclosure>
                </div>

                {/* Contracts */}
                <div className="bg-card rounded-lg p-6">
                  <Disclosure
                    as="div"
                    key={ANCHOR_DEPLOYED_CONTRACTS}
                    defaultOpen={section == ANCHOR_DEPLOYED_CONTRACTS}
                  >
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
                            <p className="mt-4 text-lg text-secondary">
                              IASNOB Token
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
                                href={lensScanUrl(getLaunchpadAddress("BonsaiLaunchpad", "lens"), false)}
                              >
                                Lens: {getLaunchpadAddress("BonsaiLaunchpad", "lens")}
                              </a>
                            </p>
                            <p className="mt-4 text-lg text-secondary">
                              Launchpad Creator NFT
                              <br />
                              <a
                                className="link link-hover text-brand-highlight/80"
                                target="_blank"
                                rel="noreferrer"
                                href={lensScanUrl(getLaunchpadAddress("CreatorNFT", "lens"), false)}
                              >
                                Lens: {getLaunchpadAddress("CreatorNFT", "lens")}
                              </a>
                            </p>
                            <p className="mt-4 text-lg text-secondary">
                              Launchpad Periphery
                              <br />
                              <a
                                className="link link-hover text-brand-highlight/80"
                                target="_blank"
                                rel="noreferrer"
                                href={lensScanUrl(getLaunchpadAddress("Periphery", "lens"), false)}
                              >
                                Lens: {getLaunchpadAddress("Periphery", "lens")}
                              </a>
                            </p>
                            <p className="mt-4 text-lg text-secondary">
                              Bonsai Staking
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
                      </>
                    )}
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
