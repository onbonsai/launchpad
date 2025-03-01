import { inter } from "@src/fonts/fonts";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useAccount, useWalletClient, useSwitchChain, useReadContract } from "wagmi";
import { erc20Abi, formatUnits, parseUnits, zeroAddress } from "viem";
import { Dialog } from "@headlessui/react";
import { InfoOutlined, ScheduleOutlined, SwapHoriz, LocalAtmOutlined, KeyboardArrowDown } from "@mui/icons-material";
import toast from "react-hot-toast"

import { Button } from "@src/components/Button"
import { Tooltip } from "@src/components/Tooltip";
import { roundedToFixed } from "@src/utils/utils";
import { useGetRegistrationFee } from "@src/hooks/useMoneyClubs";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import {
  DECIMALS,
  CONTRACT_CHAIN_ID,
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  registerClub as registerClubTransaction,
  approveToken,
  MAX_INITIAL_SUPPLY,
  BENEFITS_AUTO_FEATURE_HOURS,
  WHITELISTED_UNI_HOOKS,
  PricingTier,
  BONSAI_NFT_BASE_ADDRESS,
} from "@src/services/madfi/moneyClubs";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import { pinFile, storjGatewayURL } from "@src/utils/storj";
import clsx from "clsx";
import { Subtitle } from "@src/styles/text";
import BondingCurveSelector from "@pagesComponents/Dashboard/BondingCurveSelector";
import CurrencyInput from "@pagesComponents/Club/CurrencyInput";
import { localizeNumber } from "@src/constants/utils";
import { IS_PRODUCTION, lens } from "@src/services/madfi/utils";
import SelectDropdown from "@src/components/Select/SelectDropdown";
import { base } from "viem/chains";

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
  {
    value: 'base',
    label: 'Base',
    icon: '/base.png'
  }
];

const LENS_PRICING_TIERS = {
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

const NETWORK_CHAIN_IDS = {
  'base': CONTRACT_CHAIN_ID,
  'lens': IS_PRODUCTION ? 167004 : 37111
} as const;

export const CreateTokenForm = ({ onCreateToken, back }) => {
  const router = useRouter();
  const { chainId, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [initialSupply, setInitialSupply] = useState<number>();
  const [uniHook, setUniHook] = useState<string>("BONSAI_NFT_ZERO_FEES_HOOK");
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [vestingCliff, setVestingCliff] = useState<number>(10);
  const [vestingDuration, setVestingDuration] = useState<number>(2);
  const [vestingDurationUnit, setVestingDurationUnit] = useState<string>("hours");
  const [strategy, setStrategy] = useState<string>("lens");
  const [isBuying, setIsBuying] = useState(false);
  const [tokenImage, setTokenImage] = useState<any[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<"lens" | "base">('lens');
  const [pricingTier, setPricingTier] = useState<string>("SMALL");

  const { data: tokenBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: selectedNetwork === "base" ? base.id : lens.id,
    functionName: 'balanceOf',
    args: [address as `0x${string}`]
  });

  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: totalRegistrationFee, isLoading: isLoadingRegistrationFee } = useGetRegistrationFee(initialSupply || 0, address);
  // TODO: might need to check this after registration fees enabled
  const isValid = tokenName && tokenSymbol && tokenBalance >= (totalRegistrationFee || 0n) && !!tokenImage && ((initialSupply || 0) <= MAX_INITIAL_SUPPLY)

  const { data: usdcBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address || zeroAddress],
    query: {
      refetchInterval: 5000
    }
  });

  const registrationCost = BigInt(0);

  const buyPriceFormatted = useMemo(() => (
    roundedToFixed(parseFloat(formatUnits(totalRegistrationFee || 0n, USDC_DECIMALS)), 4)
  ), [totalRegistrationFee, isLoadingRegistrationFee]);

  // const registrationFee = useMemo(() => (
  //   bonsaiNftBalance > 0n ? '0' : (registrationCost?.toString() || '-')
  // ), [registrationCost]);

  const convertVestingDurationToSeconds = (duration: number, unit: string): number => {
    switch (unit) {
      case 'hours':
        return duration * 3600;
      case 'days':
        return duration * 3600 * 24;
      case 'weeks':
        return duration * 3600 * 24 * 7;
      default:
        return 0; // Default case to handle unexpected units
    }
  };

  const registerClub = async () => {
    setIsBuying(true);
    let toastId;

    const targetChainId = NETWORK_CHAIN_IDS[selectedNetwork];

    if (chainId !== targetChainId) {
      try {
        switchChain({ chainId: targetChainId });
      } catch {
        toast.error(`Please switch to ${selectedNetwork}`);
        setIsBuying(false);
      }
      return;
    }

    try {
      if (totalRegistrationFee && totalRegistrationFee > 0n) {
        await approveToken(USDC_CONTRACT_ADDRESS, totalRegistrationFee!, walletClient, toastId)
      }

      toastId = toast.loading("Creating token...");
      const _tokenImage = storjGatewayURL(await pinFile(tokenImage[0]));

      const { objectId, clubId, txHash } = await registerClubTransaction(walletClient, !!authenticatedProfile?.id, {
        initialSupply: parseUnits((initialSupply || 0).toString(), DECIMALS).toString(),
        strategy,
        tokenName,
        tokenSymbol,
        tokenImage: _tokenImage,
        tokenDescription: "",
        hook: selectedNetwork === 'base' ? WHITELISTED_UNI_HOOKS[uniHook].contractAddress as `0x${string}` : zeroAddress,
        cliffPercent: vestingCliff * 100,
        // TODO: some sensible default
        vestingDuration: convertVestingDurationToSeconds(6, "hours"),
        pricingTier: selectedNetwork === 'lens' ? pricingTier as PricingTier : undefined,
        // TODO: postId
      }, selectedNetwork);
      if (!(objectId && clubId)) throw new Error("failed");

      setIsBuying(false);

      // TODO: send request to eliza server

    } catch (error) {
      setIsBuying(false);
      console.log(error);
      toast.error("Failed", { id: toastId });
    }
  };

  const sharedInputClasses = 'bg-card-light rounded-xl text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm';

  const networkOptions = useMemo(() => [{
    // label: "Networks",
    options: NETWORK_OPTIONS.map(option => ({
      value: option.value,
      label: option.label
    }))
  }], []);

  return (
    <form
      className="mt-5 mx-auto w-full space-y-4 divide-y divide-dark-grey"
      style={{ fontFamily: inter.style.fontFamily }}
    >
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-y-5 gap-x-8">
          {/* Network Selector */}
          <div className="sm:col-span-2 flex flex-col">
            <div className="flex flex-col justify-between gap-2">
              <div className="flex items-center gap-1">
                <Subtitle className="text-white/70">
                  Network
                </Subtitle>
                <div className="text-sm inline-block">
                  <Tooltip message="Select the network where you want to create your token. Different networks may have different options." direction="right">
                    <InfoOutlined
                      className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40 mr-1"
                    />
                  </Tooltip>
                </div>
              </div>
              <div className="relative">
                <SelectDropdown
                  options={networkOptions}
                  value={networkOptions[0].options.find(opt => opt.value === selectedNetwork) || networkOptions[0].options[0]}
                  onChange={(option) => {
                    const network = option.value as 'base' | 'lens';
                    setSelectedNetwork(network);
                    if (network === 'lens') {
                      setUniHook(''); // or some default value
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
                <Subtitle className="text-white/70">
                  Name
                </Subtitle>
                <div className="text-sm inline-block">
                  <Tooltip message="Once your token reaches the liquidity threshold, a uni v4 pool will be created with this token name and ticker" direction="right">
                    <InfoOutlined
                      className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40 mr-1"
                    />
                  </Tooltip>
                </div>
              </div>
              <div>
                <input
                  type="text"
                  value={tokenName}
                  className={clsx("w-full pr-4", sharedInputClasses)}
                  onChange={(e) => { setTokenName(e.target.value); setTokenSymbol(e.target.value.substring(0, 6).toUpperCase()); }}
                />
              </div>
            </div>
          </div>
          <div className="sm:col-span-2 flex flex-col">
            <div className="flex flex-col justify-between gap-2">
              <div className="flex items-center gap-1">
                <Subtitle className="text-white/70">
                  Ticker
                </Subtitle>
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
              <Subtitle className="text-white/70 mb-2">
                  Token image
                </Subtitle>
              </div>
              <div>
                <ImageUploader files={tokenImage} setFiles={setTokenImage} maxFiles={1} />
              </div>
            </div>
          </div>

          {/* Uniswap v4 Hook - Only show for Base network */}
          {selectedNetwork === 'base' ? (
            <div className="sm:col-span-6 flex flex-col">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Subtitle className="text-white/70">
                    Uniswap v4 Hook
                  </Subtitle>
                  <div className="text-sm inline-block">
                    <Tooltip message="Choose a Uni v4 hook to attach custom logic to your token once it graduates" direction="top">
                      <InfoOutlined
                        className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40 mr-1"
                      />
                    </Tooltip>
                  </div>
                </div>
                <div className="flex overflow-x-auto space-x-4 py-2">
                  {Object.keys(WHITELISTED_UNI_HOOKS).map((key) => (
                    <div
                      key={`hook-${key}`}
                      className={clsx(
                        "flex-shrink-0 w-48 cursor-pointer bg-card-light justify-center border-2 rounded-xl transition-all p-3",
                        uniHook === key ? "" : "border-card-lightest"
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
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Subtitle className="text-white/70">
                    Pricing Options
                  </Subtitle>
                  <div className="text-sm inline-block">
                    <Tooltip message="Select the liquidity threshold required for your token to graduate" direction="top">
                      <InfoOutlined
                        className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40 mr-1"
                      />
                    </Tooltip>
                  </div>
                </div>
                <div className="flex overflow-x-auto space-x-4 py-2">
                  {Object.keys(LENS_PRICING_TIERS).map((key) => (
                    <div
                      key={`tier-${key}`}
                      className={clsx(
                        "flex-shrink-0 w-48 cursor-pointer bg-card-light justify-center border-2 rounded-xl transition-all p-3",
                        pricingTier === key ? "" : "border-card-lightest"
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
                          <span className="ml-1 text-white/40 text-sm">{LENS_PRICING_TIERS[key].iconLabel}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="sm:col-span-6 flex flex-col">
            <div className="flex flex-col justify-between gap-2">
              <div className="flex justify-between">
                <div className="flex items-center gap-1">
                  <Subtitle className="text-white/70">
                    Buy initial supply
                  </Subtitle>
                  <div className="text-sm inline-block">
                    <Tooltip message="Buying the initial supply is optional, but recommended" direction="top">
                    <InfoOutlined
                      className="max-w-4 max-h-4 inline-block text-white/40 mr-1"
                    />
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
                    trailingAmountSymbol="USDC"
                    tokenBalance={tokenBalance}
                    price={`${initialSupply}`}
                    isError={false}
                    onPriceSet={(e) => setInitialSupply(parseFloat(e))}
                    symbol={tokenSymbol}
                    hideBalance
                />
                <div className="flex justify-end">
                  <Subtitle className="text-xs text-white/70 mr-4">
                    Balance: {localizeNumber(formatUnits(usdcBalance || 0n, 6))}
                  </Subtitle>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-8 flex flex-col gap-4 justify-center items-center">
          <Button size='md' disabled={isBuying || !isValid} onClick={registerClub} variant="accentBrand" className="w-full hover:bg-bullish">
            Create token
          </Button>
          {initialSupply && initialSupply > MAX_INITIAL_SUPPLY
            ? <Subtitle className="text-primary/90">You can only buy 10% of the mintable supply (80mil)</Subtitle>
            : null
          }
          <Button size='md' onClick={() => back()} variant="dark-grey" className="w-full hover:bg-bullish">
            Back
          </Button>
        </div>
      </div>
    </form>
  );
};
