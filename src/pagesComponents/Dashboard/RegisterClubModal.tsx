import { brandFont } from "@src/fonts/fonts";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useAccount, useWalletClient, useReadContract, useBalance } from "wagmi";
import { switchChain } from "viem/actions";
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
  WGHO_CONTRACT_ADDRESS,
  registerClubTransaction,
  approveToken,
  MAX_INITIAL_SUPPLY,
  BENEFITS_AUTO_FEATURE_HOURS,
  WHITELISTED_UNI_HOOKS,
  PricingTier,
  setLensData,
} from "@src/services/madfi/moneyClubs";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import { SITE_URL } from "@src/constants/constants";
import clsx from "clsx";
import { Subtitle } from "@src/styles/text";
import BondingCurveSelector from "./BondingCurveSelector";
import CurrencyInput from "@pagesComponents/Club/CurrencyInput";
import { localizeNumber } from "@src/constants/utils";
import { IS_PRODUCTION, LENS_CHAIN_ID } from "@src/services/madfi/utils";
import SelectDropdown from "@src/components/Select/SelectDropdown";
import { createPost } from "@src/services/lens/createPost";
import { resumeSession } from "@src/hooks/useLensLogin";
import { SessionClient } from "@lens-protocol/client";
import { immutable } from "@lens-chain/storage-client";
import { storageClient } from "@src/services/lens/client";

type NetworkOption = {
  value: 'base' | 'lens';
  label: string;
  icon: string;
};

const NETWORK_OPTIONS: NetworkOption[] = [
  {
    value: 'lens',
    label: 'Lens',
    icon: '/lens.webp'
  },
  {
    value: 'base',
    label: 'Base',
    icon: '/base.webp'
  }
];

const LENS_PRICING_TIERS = {
  ...(!IS_PRODUCTION && {
    [PricingTier.TEST]: {
      label: 'Test',
      value: 1,
      icon: 'local-atm',
      iconLabel: '$1 to graduate'
    },
  }),
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
  'lens': IS_PRODUCTION ? 232 : 37111
} as const;

export const RegisterClubModal = ({
  closeModal,
  refetchRegisteredClub,
  refetchClubBalance,
  tokenBalance, // balance in USDC
  bonsaiNftBalance, // bonsai nft balance
}) => {
  const router = useRouter();
  const { chainId, address } = useAccount();
  const { data: walletClient } = useWalletClient();
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

  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: totalRegistrationFee, isLoading: isLoadingRegistrationFee } = useGetRegistrationFee(
    initialSupply || 0,
    address,
    selectedNetwork,
    selectedNetwork === 'lens' ? pricingTier : undefined,
  );

  const { data: usdcBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address || zeroAddress],
  });

  // Lens balances: WGHO (ERC20) + native GHO
  const { data: wghoBalance } = useReadContract({
    address: WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address || zeroAddress],
  });

  const { data: ghoBalance } = useBalance({
    address,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: selectedNetwork === 'lens',
      refetchInterval: 10000,
    }
  });

  const stableDecimals = selectedNetwork === 'lens' ? 18 : USDC_DECIMALS;

  const registrationCost = BigInt(0);

  const buyPriceFormatted = useMemo(() => (
    roundedToFixed(parseFloat(formatUnits(totalRegistrationFee || 0n, stableDecimals)), 4)
  ), [totalRegistrationFee, isLoadingRegistrationFee, stableDecimals]);

  const registrationFee = useMemo(() => (
    bonsaiNftBalance > 0n ? '0' : (registrationCost?.toString() || '-')
  ), [registrationCost]);

  const combinedStableBalance = selectedNetwork === 'lens'
    ? ((ghoBalance?.value || 0n) + (wghoBalance || 0n))
    : (usdcBalance || 0n);

  console.log(tokenImage, !!tokenImage)

  const isValid = tokenName && tokenSymbol && combinedStableBalance >= (totalRegistrationFee || 0n) && !!tokenImage && tokenImage.length > 0 && ((initialSupply || 0) <= MAX_INITIAL_SUPPLY)

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

    if (chainId !== targetChainId && walletClient) {
      try {
        await switchChain(walletClient, { id: targetChainId });
      } catch {
        toast.error(`Please switch to ${selectedNetwork}`);
        setIsBuying(false);
      }
      return;
    }

    try {
      if (totalRegistrationFee && totalRegistrationFee > 0n) {
        await approveToken(
          selectedNetwork === 'base' ? USDC_CONTRACT_ADDRESS : WGHO_CONTRACT_ADDRESS,
          totalRegistrationFee!,
          walletClient,
          toastId,
          "Approving tokens...",
          selectedNetwork
        )
      }

      toastId = toast.loading("Creating token...");
      const { gatewayUrl: _tokenImage } = await storageClient.uploadFile(tokenImage[0], { acl: immutable(LENS_CHAIN_ID) });

      const { clubId, txHash, tokenAddress } = await registerClubTransaction(walletClient, {
        initialSupply: parseUnits((initialSupply || 0).toString(), DECIMALS).toString(),
        tokenName,
        tokenSymbol,
        tokenImage: _tokenImage,
        hook: selectedNetwork === 'base' ? WHITELISTED_UNI_HOOKS[uniHook].contractAddress as `0x${string}` : zeroAddress,
        cliffPercent: vestingCliff * 100,
        vestingDuration: convertVestingDurationToSeconds(vestingDuration, vestingDurationUnit),
        pricingTier: selectedNetwork === 'lens' ? pricingTier as PricingTier : undefined,
      }, selectedNetwork);
      if (!clubId) throw new Error("failed");

      let postId;
      if (authenticatedProfile?.address) {
        toastId = toast.loading("Preparing post...", { id: toastId });
        postId = await _createPost(tokenAddress as string);
        if (!postId) toast.error("Failed to create post");
      }

      // link the creator handle and post id
      await setLensData({
        hash: txHash as string,
        postId,
        handle: authenticatedProfile?.username?.localName ? authenticatedProfile.username.localName : address as string,
        chain: selectedNetwork,
        tokenAddress: tokenAddress as string, // Added required tokenAddress property
      });

      setTimeout(refetchRegisteredClub, 8000); // give the indexer some time
      setTimeout(refetchClubBalance, 8000); // give the indexer some time
      setIsBuying(false);

      toast.success("Token created! Going to page...", { duration: 5000, id: toastId });
      closeModal();

      setTimeout(() => router.push(`/token/${selectedNetwork}/${tokenAddress}`), 2000);
    } catch (error) {
      setIsBuying(false);
      console.log(error);
      toast.error("Failed", { id: toastId });
    }
  };

  // create a post from the authenticated profile
  const _createPost = async (tokenAddress: string): Promise<string | undefined> => {
    try {
      const text = `Created ${tokenName} ($${tokenSymbol}) on @bonsai

${SITE_URL}/token/${selectedNetwork}/${tokenAddress}`;

      const sessionClient = await resumeSession();
      const result = await createPost(
        sessionClient as SessionClient,
        walletClient,
        { text }
      );

      return result?.postId;
    } catch (error) {
      console.log(error);
    }
  };

  const sharedInputClasses = 'bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm';

  const networkOptions = useMemo(() => [{
    // label: "Networks",
    options: NETWORK_OPTIONS.map(option => ({
      value: option.value,
      label: option.label
    }))
  }], []);

  const vestingDurationOptions = useMemo(() => [{
    label: "",
    options: [
      { value: "hours", label: "Hours" },
      { value: "days", label: "Days" },
      { value: "weeks", label: "Weeks" }
    ]
  }], []);

  return (
    <div className={clsx("flex flex-col md:w-[448px] w-full")}
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}>
      <div className="flex items-center justify-between">
        <Dialog.Title as="h2" className="text-2xl leading-7 font-bold">
          Create a token
        </Dialog.Title>
      </div>
      <form
        className="mt-5 mx-auto md:w-[448px] w-full space-y-4 divide-y divide-dark-grey"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-y-5 gap-x-8">
            {/* Network Selector */}
            <div className="sm:col-span-6 flex flex-col">
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

            {/* Linked social profile */}
            {/* <div className="sm:col-span-6 flex flex-col">
                <div className="flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="inline-block text-sm font-medium text-secondary">
                      Linked social profile
                    </label>
                    <div className="text-sm inline-block">
                      <Tooltip message="Your token will have a social feed, and by default use your currently logged-in Lens profile" direction="top">
                        <InformationCircleIcon
                          width={18}
                          height={18}
                          className="inline-block -mt-1 text-secondary mr-1"
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 max-w-fit flex-wrap">
                  {[{ strategy: "lens", label: `@${authenticatedProfileHandle}` }].map(({ strategy: _strategy, label }) => (
                    <label
                      key={_strategy}
                      htmlFor={`curve-${_strategy}`}
                      className="mt-2 text-sm text-secondary flex items-center justify-center gap-2 bg-dark-grey rounded-md p-2 min-w-[100px]"
                    >
                      <input
                        type="radio"
                        className="h-5 w-5 border-none text-brand-highlight focus:ring-brand-highlight/70"
                        value={_strategy}
                        id={`strategy-${_strategy}`}
                        name="strategy"
                        onChange={(e) => setStrategy(e.target.value)}
                        checked={strategy === _strategy}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div> */}

            <div className="sm:col-span-3 flex flex-col">
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
            <div className="sm:col-span-3 flex flex-col">
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

            <div className="sm:col-span-3 flex flex-col justify-start items-start">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Subtitle className="text-white/70 mb-2">
                    Vesting Cliff Unlock %
                  </Subtitle>
                  <div className="text-sm inline-block">
                    <Tooltip message="The % of tokens that are unlocked and immediately available after graduation" direction="top">
                      <InfoOutlined
                        className="max-w-4 max-h-4 -mt-[8px] inline-block text-white/40 mr-1"
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 w-full flex-wrap">
                <BondingCurveSelector
                  value={vestingCliff}
                  onChange={(type) => setVestingCliff(type)}
                  options={[{ vestingCliff: 10, label: '10' }, { vestingCliff: 25, label: '25' }, { vestingCliff: 50, label: '50' }, { vestingCliff: 100, label: '100' }]}
                />
              </div>
            </div>

            <div className="sm:col-span-3 flex flex-col justify-start items-start">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Subtitle className="text-white/70 mb-2">
                    Vesting Duration
                  </Subtitle>
                  <div className="text-sm inline-block">
                    <Tooltip message="How long after graduation when the remaining tokens are 100% unlocked" direction="left">
                      <InfoOutlined
                        className="max-w-4 max-h-4 -mt-[8px] inline-block text-white/40 mr-1"
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={vestingDuration}
                    className={clsx("w-full pr-4", sharedInputClasses)}
                    onChange={(e) => setVestingDuration(parseInt(e.target.value))}
                  />
                </div>
                <div className="col-span-3">
                  <SelectDropdown
                    options={vestingDurationOptions}
                    value={vestingDurationOptions[0].options.find(opt => opt.value === vestingDurationUnit) || vestingDurationOptions[0].options[0]}
                    onChange={(option) => setVestingDurationUnit(option.value)}
                    isMulti={false}
                    zIndex={1001}
                  />
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
                          "flex-shrink-0 w-48 cursor-pointer bg-card-light justify-center border-2 rounded-lg transition-all p-3",
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
                          "flex-shrink-0 w-48 cursor-pointer bg-card-light justify-center border-2 rounded-lg transition-all p-3",
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
                    trailingAmountSymbol={selectedNetwork === 'base' ? 'USDC' : 'GHO'}
                    tokenBalance={combinedStableBalance}
                    price={`${initialSupply}`}
                    isError={false}
                    onPriceSet={(e) => setInitialSupply(parseFloat(e))}
                    symbol={tokenSymbol}
                    hideBalance
                  />
                  <div className="flex justify-end">
                    <Subtitle className="text-xs text-white/70 mr-4">
                      Balance: {localizeNumber(formatUnits(combinedStableBalance || 0n, stableDecimals))}
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
            {/* {initialSupply && initialSupply > MAX_INITIAL_SUPPLY
              ? <Subtitle className="text-brand-highlight/90">You can only buy 10% of the mintable supply (80mil)</Subtitle>
              : <>
                <Subtitle>
                  Creating will also make a post from {`${authenticatedProfile?.id ? 'your profile' : '@bons_ai'}`}
                </Subtitle>
              </>
            } */}
          </div>
        </div>
      </form>
    </div>
  );
};
