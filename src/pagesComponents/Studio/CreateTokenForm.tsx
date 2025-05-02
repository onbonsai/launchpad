import { brandFont } from "@src/fonts/fonts";
import { useMemo, useState } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { InfoOutlined, ScheduleOutlined, SwapHoriz, LocalAtmOutlined, KeyboardArrowDown } from "@mui/icons-material";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/outline";

import { Button } from "@src/components/Button"
import { Tooltip } from "@src/components/Tooltip";
import { roundedToFixed, shortAddress } from "@src/utils/utils";
import { useGetRegistrationFee } from "@src/hooks/useMoneyClubs";
import { useCreatorTokens } from "@src/hooks/useCreatorTokens";
import {
  USDC_CONTRACT_ADDRESS,
  MAX_INITIAL_SUPPLY,
  WHITELISTED_UNI_HOOKS,
  PricingTier,
  WGHO_CONTRACT_ADDRESS,
  NETWORK_CHAIN_IDS,
} from "@src/services/madfi/moneyClubs";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import clsx from "clsx";
import { Subtitle } from "@src/styles/text";
import CurrencyInput from "@pagesComponents/Club/CurrencyInput";
import { localizeNumber } from "@src/constants/utils";
import SelectDropdown from "@src/components/Select/SelectDropdown";
import { IS_PRODUCTION, LENS_CHAIN_ID } from "@src/services/madfi/utils";
import Image from "next/image";

type NetworkOption = {
  value: 'base' | 'lens';
  label: string;
  icon: string;
};

const NETWORK_OPTIONS: NetworkOption[] = [
  {
    value: 'lens',
    label: 'Lens',
    icon: '/lens.png'
  },
  // {
  //   value: 'base',
  //   label: 'Base',
  //   icon: '/base.png'
  // }
];

const LENS_PRICING_TIERS = {
  // TODO: comment this after testing
  // [PricingTier.TEST]: {
  //   label: 'Test',
  //   value: 1,
  //   icon: 'local-atm',
  //   iconLabel: '$1 to graduate'
  // },
  [PricingTier.SMALL]: {
    label: 'Small',
    value: 6000,
    icon: 'local-atm',
    iconLabel: '$6k to graduate'
  },
  [PricingTier.MEDIUM]: {
    label: 'Medium',
    value: 11000,
    icon: 'local-atm',
    iconLabel: '$11k to graduate'
  },
  [PricingTier.LARGE]: {
    label: 'Large',
    value: 21000,
    icon: 'local-atm',
    iconLabel: '$21k to graduate'
  }
};

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

export const CreateTokenForm = ({ finalTokenData, setFinalTokenData, back, next, postImage, setSavedTokenAddress, savedTokenAddress }) => {
  const { address } = useAccount();
  const [initialSupply, setInitialSupply] = useState<number>(finalTokenData?.initialSupply);
  const [rewardPoolPercentage, setRewardPoolPercentage] = useState<number>(finalTokenData?.rewardPoolPercentage || 0);
  const [uniHook, setUniHook] = useState<string>(finalTokenData?.uniHook || "BONSAI_NFT_ZERO_FEES_HOOK");
  const [tokenName, setTokenName] = useState<string>(finalTokenData?.tokenName || "");
  const [tokenSymbol, setTokenSymbol] = useState<string>(finalTokenData?.tokenSymbol || "");
  const [tokenImage, setTokenImage] = useState<any[]>(finalTokenData?.tokenImage?.length > 0 ? finalTokenData?.tokenImage : (postImage?.length > 0 ? postImage : []));
  const [selectedNetwork, setSelectedNetwork] = useState<"lens" | "base">(finalTokenData?.selectedNetwork || "lens");
  const [pricingTier, setPricingTier] = useState<string>(finalTokenData?.pricingTier || "SMALL");
  const [useExistingToken, setUseExistingToken] = useState<boolean>(false);
  const stableDecimals = selectedNetwork === "lens" ? 18 : 6;

  const { data: existingTokens } = useCreatorTokens(address as `0x${string}`);

  // GHO Balance
  const { data: ghoBalance } = useBalance({
    address,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: selectedNetwork === "lens",
      refetchInterval: 10000,
    }
  })

  // stablecoin balance (WGHO on lens, USDC on base)
  const { data: tokenBalance } = useReadContract({
    address: selectedNetwork === "base" ? USDC_CONTRACT_ADDRESS : WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: NETWORK_CHAIN_IDS[selectedNetwork],
    functionName: 'balanceOf',
    args: [address as `0x${string}`]
  });

  const { data: totalRegistrationFee, isLoading: isLoadingRegistrationFee } = useGetRegistrationFee(initialSupply || 0, address, selectedNetwork, pricingTier);

  const buyPriceFormatted = useMemo(() => (
    roundedToFixed(parseFloat(formatUnits(totalRegistrationFee || 0n, stableDecimals)), 4)
  ), [totalRegistrationFee, isLoadingRegistrationFee]);

  const networkOptions = useMemo(() => [{
    // label: "Networks",
    options: NETWORK_OPTIONS.map(option => ({
      value: option.value,
      label: option.label
    }))
  }], []);

  const notEnoughFunds = useMemo(() => {
    const requiredAmount = totalRegistrationFee || 0n;
    const currentWGHOBalance = tokenBalance || 0n;

    if (selectedNetwork === "lens") {
      // For Lens chain, consider both GHO and WGHO balances
      const ghoBalanceInWei = ghoBalance?.value || 0n;
      const totalAvailableBalance = currentWGHOBalance + ghoBalanceInWei;
      return requiredAmount > totalAvailableBalance;
    }

    // For other chains, just check USDC balance as before
    return requiredAmount > currentWGHOBalance;
  }, [totalRegistrationFee, tokenBalance, ghoBalance?.value, selectedNetwork]);

  const isValid = (() => {
    if (useExistingToken) {
      return !!savedTokenAddress;
    }
    return tokenName &&
      tokenSymbol &&
      (tokenBalance !== undefined) &&
      !notEnoughFunds &&
      !!tokenImage &&
      ((initialSupply || 0) <= MAX_INITIAL_SUPPLY);
  })();

  const setTokenDataBefore = (fn) => {
    setFinalTokenData({
      initialSupply,
      rewardPoolPercentage,
      uniHook,
      tokenName,
      tokenSymbol,
      tokenImage,
      selectedNetwork,
      pricingTier,
      totalRegistrationFee,
    });

    fn();
  }

  const setExistingToken = (token: any, fn) => {
    setSavedTokenAddress(token.tokenAddress);
    setFinalTokenData({
      tokenName: token.name,
      tokenSymbol: token.symbol,
      tokenImage: [{ preview: token.uri }],
      selectedNetwork: "lens",
    });

    fn();
  };

  const sharedInputClasses = 'bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm';

  return (
    <form
      className="mt-5 mx-auto w-full space-y-4 divide-y divide-dark-grey"
      style={{ fontFamily: brandFont.style.fontFamily }}
    >
      <div className="space-y-2">
        {/* Token Type Selection */}
        <div className="mb-4 sm:col-span-2 flex flex-col">
          <div className="flex flex-col justify-between gap-2">
            <div className="flex items-center gap-1">
              <Subtitle className="text-white/70">Token Type</Subtitle>
              <div className="text-sm inline-block">
                <Tooltip message="Choose between creating a new token or using an existing one" direction="right">
                  <InfoOutlined className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40 mr-1" />
                </Tooltip>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setUseExistingToken(false)}
                className={clsx(
                  "flex-1 py-2 px-4 rounded-lg border-2 transition-all",
                  !useExistingToken
                    ? "border-brand-highlight bg-brand-highlight/10"
                    : "border-card-lightest hover:border-brand-highlight/50",
                )}
              >
                Create New Token
              </button>
              <button
                type="button"
                onClick={() => setUseExistingToken(true)}
                className={clsx(
                  "flex-1 py-2 px-4 rounded-lg border-2 transition-all",
                  useExistingToken
                    ? "border-brand-highlight bg-brand-highlight/10"
                    : "border-card-lightest hover:border-brand-highlight/50",
                )}
              >
                Use Existing Token
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-y-5 gap-x-8">
          {useExistingToken ? (
            <div className="sm:col-span-2 flex flex-col">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Subtitle className="text-white/70">Select Token</Subtitle>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {existingTokens?.map((token) => (
                    <div
                      key={token.id}
                      onClick={() => setExistingToken(token, next)}
                      className={clsx(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all",
                        savedTokenAddress === token.tokenAddress
                          ? "border-brand-highlight bg-brand-highlight/10"
                          : "border-card-lightest hover:border-brand-highlight/50",
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {token.uri && (
                          <Image src={token.uri} alt={token.name} className="rounded-full object-cover" width={48} height={48} />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{token.name}</h3>
                            <span className="text-sm text-white/70">{token.symbol}</span>
                          </div>
                          <div className="mt-2 text-sm text-white/70">
                            <div className="flex items-center gap-2">
                              <span>Address: {shortAddress(token.tokenAddress)}</span>
                              {token.complete && (
                                <span className="px-2 py-1 text-xs rounded-full bg-brand-highlight/20 text-brand-highlight">
                                  Graduated
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span>
                                Supply:{" "}
                                {token.supply ? localizeNumber(formatUnits(BigInt(token.supply), 18), "decimal") : "-"}
                              </span>
                              <span>Holders: {token.holders ? token.holders : "-"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Network Selector */}
              <div className="sm:col-span-2 flex flex-col">
                <div className="flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Subtitle className="text-white/70">Network</Subtitle>
                    <div className="text-sm inline-block">
                      <Tooltip
                        message="Select the network where you want to create your token. Different networks may have different options."
                        direction="right"
                      >
                        <InfoOutlined className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40 mr-1" />
                      </Tooltip>
                    </div>
                  </div>
                  <div className="relative">
                    <SelectDropdown
                      options={networkOptions}
                      value={
                        networkOptions[0].options.find((opt) => opt.value === selectedNetwork) ||
                        networkOptions[0].options[0]
                      }
                      onChange={(option) => {
                        const network = option.value as "base" | "lens";
                        setSelectedNetwork(network);
                        if (network === "lens") {
                          setUniHook(""); // or some default value
                        }
                      }}
                      isMulti={false}
                      zIndex={1001}
                    />
                    <KeyboardArrowDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 w-5 h-5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 flex flex-col">
                <div className="flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Subtitle className="text-white/70">Name</Subtitle>
                    <div className="text-sm inline-block">
                      <Tooltip
                        message="Once your token reaches the liquidity threshold, a uni v4 pool will be created with this token name and ticker"
                        direction="right"
                      >
                        <InfoOutlined className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40 mr-1" />
                      </Tooltip>
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={tokenName}
                      className={clsx("w-full pr-4", sharedInputClasses)}
                      onChange={(e) => {
                        setTokenName(e.target.value);
                        setTokenSymbol(e.target.value.substring(0, 10).toUpperCase());
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2 flex flex-col">
                <div className="flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Subtitle className="text-white/70">Ticker</Subtitle>
                    <div className="text-sm inline-block text-white/40">$</div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={tokenSymbol}
                      className={clsx("w-full pr-4", sharedInputClasses)}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-6 flex flex-col">
                <div className="flex flex-col justify-between">
                  <div className="flex items-center">
                    <Subtitle className="text-white/70 mb-2">Token image</Subtitle>
                  </div>
                  <div>
                    <ImageUploader files={tokenImage} setFiles={setTokenImage} maxFiles={1} />
                  </div>
                </div>
              </div>

              {/* Uniswap v4 Hook - Only show for Base network */}
              {selectedNetwork === "base" ? (
                <div className="sm:col-span-6 flex flex-col">
                  <div className="flex flex-col justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Subtitle className="text-white/70">Uniswap v4 Hook</Subtitle>
                      <div className="text-sm inline-block">
                        <Tooltip
                          message="Choose a Uni v4 hook to attach custom logic to your token once it graduates"
                          direction="top"
                        >
                          <InfoOutlined className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40 mr-1" />
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex overflow-x-auto space-x-4 py-2">
                      {Object.keys(WHITELISTED_UNI_HOOKS).map((key) => (
                        <div
                          key={`hook-${key}`}
                          className={clsx(
                            "flex-shrink-0 w-48 cursor-pointer bg-card-light justify-center border-2 rounded-lg transition-all p-3",
                            uniHook === key ? "" : "border-card-lightest",
                          )}
                          onClick={() => setUniHook(key)}
                        >
                          <div className="flex flex-col items-center">
                            <div className="text-center">
                              <h3 className="text-sm font-semibold">{WHITELISTED_UNI_HOOKS[key].label}</h3>
                            </div>
                            <div className="flex justify-center items-center mt-2">
                              <span>
                                {WHITELISTED_UNI_HOOKS[key].icon === "schedule" && (
                                  <ScheduleOutlined className="max-w-5 max-h-5 inline-block text-white/40 -mt-1" />
                                )}
                                {WHITELISTED_UNI_HOOKS[key].icon === "swap-horiz" && (
                                  <SwapHoriz className="max-w-6 max-h-6 inline-block text-white/40" />
                                )}
                                {WHITELISTED_UNI_HOOKS[key].icon === "local-atm" && (
                                  <LocalAtmOutlined className="max-w-6 max-h-6 inline-block text-white/40" />
                                )}
                              </span>
                              <span className="ml-1 text-white/40 text-sm">{WHITELISTED_UNI_HOOKS[key].iconLabel}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sm:col-span-6 flex flex-col">
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <h3 className="leading-6">
                          <Disclosure.Button className="flex w-full items-center justify-between py-3 hover:text-secondary/80">
                            <div className="flex items-center gap-1">
                              <Subtitle className="text-white/70">{`Token graduation - ${LENS_PRICING_TIERS[pricingTier].iconLabel}`}</Subtitle>
                              <Tooltip
                                message="Select the liquidity threshold required for your token to graduate"
                                direction="top"
                              >
                                <InfoOutlined className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40 mr-1" />
                              </Tooltip>
                            </div>
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
                            <div className="grid grid-cols-3 gap-4 py-2">
                              {Object.keys(LENS_PRICING_TIERS).map((key) => (
                                <div
                                  key={`tier-${key}`}
                                  className={clsx(
                                    "flex-shrink-0 cursor-pointer bg-card-light justify-center border-2 rounded-lg transition-all p-3",
                                    pricingTier === key ? "" : "border-card-lightest",
                                  )}
                                  onClick={() => setPricingTier(key)}
                                >
                                  <div className="flex flex-col items-center">
                                    <div className="text-center">
                                      <h3 className="text-sm font-semibold">{LENS_PRICING_TIERS[key].label}</h3>
                                    </div>
                                    <div className="flex justify-center items-center mt-2">
                                      <span>
                                        <LocalAtmOutlined className="max-w-6 max-h-6 inline-block text-white/40" />
                                      </span>
                                      <span className="ml-1 text-white/40 text-sm">
                                        {LENS_PRICING_TIERS[key].iconLabel}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Disclosure.Panel>
                        </DisclosurePanelWithTransition>
                      </>
                    )}
                  </Disclosure>
                </div>
              )}

              <div className="sm:col-span-6 flex flex-col">
                <div className="flex flex-col justify-between gap-2">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-1">
                      <Subtitle className="text-white/70">Buy initial supply</Subtitle>
                      <div className="text-sm inline-block">
                        <Tooltip message="Buying the initial supply is optional, but recommended" direction="top">
                          <InfoOutlined className="max-w-4 max-h-4 inline-block text-white/40 mr-1" />
                        </Tooltip>
                      </div>
                    </div>
                    {/* <label className="inline-block text-xs font-medium text-secondary/70 mr-4">
                      Fee: ${registrationFee}
                    </label> */}
                  </div>
                  <div className="relative flex flex-col space-y-1 gap-1">
                    <CurrencyInput
                      trailingAmount={`${buyPriceFormatted}`}
                      trailingAmountSymbol={selectedNetwork === "base" ? "USDC" : "GHO"}
                      tokenBalance={tokenBalance || 0n}
                      price={initialSupply?.toString() || "0"}
                      isError={tokenBalance ? tokenBalance < (totalRegistrationFee || 0n) : false}
                      onPriceSet={(e) => setInitialSupply(parseFloat(e))}
                      symbol={tokenSymbol}
                      hideBalance
                    />
                    <div className="flex justify-end">
                      <Subtitle className="text-xs text-white/70 mr-4">
                        Balance:{" "}
                        {localizeNumber(
                          formatUnits(
                            selectedNetwork === "lens"
                              ? (ghoBalance?.value || 0n) + (tokenBalance || 0n)
                              : tokenBalance || 0n,
                            stableDecimals,
                          ),
                        )}
                      </Subtitle>
                    </div>
                  </div>

                  {/* Reward Pool Slider */}
                  {initialSupply ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <Subtitle className="text-white/70">Swap rewards for reposts and remixes</Subtitle>
                          <div className="text-sm inline-block">
                            <Tooltip
                              message="Allocate a percentage of your tokens for trading incentives. These will be deposited from your wallet into a reward pool on graduation. You can still sell back to the Launchpad before then and withdraw or topup the rewards anytime after."
                              direction="top"
                            >
                              <InfoOutlined className="max-w-4 max-h-4 inline-block text-white/40 mr-1" />
                            </Tooltip>
                          </div>
                        </div>
                        <Subtitle className="text-white/70">{rewardPoolPercentage}%</Subtitle>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={rewardPoolPercentage}
                          onChange={(e) => setRewardPoolPercentage(parseInt(e.target.value))}
                          className="w-full h-2 bg-card-light rounded-lg appearance-none cursor-pointer accent-brand-highlight [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-highlight [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-none [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-brand-highlight [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-none"
                          style={{
                            background: `linear-gradient(to right, #5be39d ${rewardPoolPercentage * 2}%, #1A1A1A ${
                              rewardPoolPercentage * 2
                            }%)`,
                          }}
                        />
                      </div>
                      <div className="mt-2 text-sm text-white/60">
                        {initialSupply
                          ? `${localizeNumber(
                              (initialSupply * rewardPoolPercentage) / 100,
                              "decimal",
                              0,
                            )} ${tokenSymbol} will be deposited from your wallet on graduation.`
                          : "Enter initial supply first"}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="pt-8 flex flex-col gap-2 justify-center items-center">
          <Button
            size="md"
            disabled={!isValid}
            onClick={() => setTokenDataBefore(next)}
            variant="accentBrand"
            className="w-full hover:bg-bullish"
          >
            Next
          </Button>
          {initialSupply && initialSupply > MAX_INITIAL_SUPPLY ? (
            <Subtitle className="text-brand-highlight/90">You can only buy 10% of the mintable supply (80mil)</Subtitle>
          ) : null}
          <Button
            size="md"
            onClick={() => setTokenDataBefore(back)}
            variant="dark-grey"
            className="w-full hover:bg-bullish"
          >
            Back
          </Button>
        </div>
      </div>
    </form>
  );
};
