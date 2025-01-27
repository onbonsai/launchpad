import { inter } from "@src/fonts/fonts";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useAccount, useWalletClient, useSwitchChain, useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { InformationCircleIcon } from "@heroicons/react/solid";
import { Dialog } from "@headlessui/react";
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
  MIN_LIQUIDITY_THRESHOLD,
  BENEFITS_AUTO_FEATURE_HOURS,
  WHITELISTED_UNI_HOOKS,
} from "@src/services/madfi/moneyClubs";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import { pinFile, storjGatewayURL, pinJson } from "@src/utils/storj";
import publicationBody from "@src/services/lens/publicationBody";
import { createPostMomoka } from "@src/services/lens/createPost";
import { MADFI_CLUBS_URL } from "@src/constants/constants";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import clsx from "clsx";
import { Subtitle } from "@src/styles/text";
import { InfoOutlined } from "@mui/icons-material";
import BondingCurveSelector from "./BondingCurveSelector";
import CurrencyInput from "@pagesComponents/Club/CurrencyInput";
import { localizeNumber } from "@src/constants/utils";


export const RegisterClubModal = ({
  closeModal,
  refetchRegisteredClub,
  refetchClubBalance,
  tokenBalance, // balance in USDC
  bonsaiNftBalance, // bonsai nft balance
}) => {
  const router = useRouter();
  const { chain, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [initialSupply, setInitialSupply] = useState<number>();
  const [uniHook, setUniHook] = useState<string>("BONSAI_NFT_ZERO_FEES");
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [vestingCliff, setVestingCliff] = useState<number>(10);
  const [vestingDuration, setVestingDuration] = useState<number>(2);
  const [vestingDurationUnit, setVestingDurationUnit] = useState<string>("hours");
  const [tokenDescription, setTokenDescription] = useState<string>("");
  const [strategy, setStrategy] = useState<string>("lens");
  const [isBuying, setIsBuying] = useState(false);
  const [tokenImage, setTokenImage] = useState<any[]>([]);
  const creatorLiqMax = ((MIN_LIQUIDITY_THRESHOLD * BigInt(10 ** DECIMALS)) / BigInt(10));

  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: totalRegistrationFee, isLoading: isLoadingRegistrationFee } = useGetRegistrationFee(initialSupply || 0, address);
  // TODO: might need to check this after registration fees enabled
  const isValid = tokenName && tokenSymbol && tokenBalance > (totalRegistrationFee || 0n) && !!tokenImage && (totalRegistrationFee || 0) < creatorLiqMax;

  const registrationCost = BigInt(0);

  const buyPriceFormatted = useMemo(() => (
    roundedToFixed(parseFloat(formatUnits(totalRegistrationFee || 0n, USDC_DECIMALS)), 4)
  ), [totalRegistrationFee, isLoadingRegistrationFee]);

  const registrationFee = useMemo(() => (
    bonsaiNftBalance > 0n ? '0' : (registrationCost?.toString() || '-')
  ), [registrationCost]);

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

    if (chain!.id !== CONTRACT_CHAIN_ID) {
      try {
        switchChain({ chainId: CONTRACT_CHAIN_ID });
      } catch {
        toast.error("Please switch networks");
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
      const featureStartAt = bonsaiNftBalance > 0n ? Math.floor(Date.now() / 1000) : undefined;

      const { objectId, clubId, txHash } = await registerClubTransaction(walletClient, !!authenticatedProfile?.id, {
        initialSupply: parseUnits((initialSupply || 0).toString(), DECIMALS).toString(),
        strategy,
        tokenName,
        tokenSymbol,
        tokenImage: _tokenImage,
        tokenDescription,
        featureStartAt,
        hook: WHITELISTED_UNI_HOOKS[uniHook].contractAddress as `0x${string}`,
        cliffPercent: vestingCliff * 100,
        vestingDuration: convertVestingDurationToSeconds(vestingDuration, vestingDurationUnit)
      });
      if (!(objectId && clubId)) throw new Error("failed");

      toastId = toast.loading("Preparing post...", { id: toastId });
      const pubId = await createPost(clubId!, {
        item: _tokenImage,
        type: tokenImage[0].type,
        altTag: tokenImage[0].name,
      }, txHash!);
      if (!pubId) throw new Error("Failed to create post");

      const response = await fetch('/api/clubs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updateRecord: {
            id: objectId,
            pubId
          }
        })
      });
      if (!response.ok) throw new Error("Failed to link publication");

      setTimeout(refetchRegisteredClub, 8000); // give the indexer some time
      setTimeout(refetchClubBalance, 8000); // give the indexer some time
      setIsBuying(false);

      // toast.success("Token created! Share your Frame URL to invite your community", { duration: 10000, id: toastId });
      toast.success("Token created! Going to page...", { duration: 5000, id: toastId });
      closeModal();
      setTimeout(() => router.push(`/token/${clubId}`), 2000);
    } catch (error) {
      setIsBuying(false);
      console.log(error);
      toast.error("Failed", { id: toastId });
    }
  };

  // create a post from the authenticated profile _or_ from Sage (@bons_ai)
  const createPost = async (clubId: string, attachment: any, txHash: string) => {
    try {
      const publicationMetadata = publicationBody(
        `${tokenName} ($${tokenSymbol})
${tokenDescription}
${MADFI_CLUBS_URL}/token/${clubId}
`,
        [attachment],
        authenticatedProfile?.metadata?.displayName || authenticatedProfile?.handle!.suggestedFormatted.localName || "Sage"
      );

      // creating a post on momoka
      const { data: postIpfsHash } = await pinJson(publicationMetadata);

      if (authenticatedProfile?.id) {
        const broadcastResult = await createPostMomoka(
          walletClient,
          storjGatewayURL(`ipfs://${postIpfsHash}`),
          authenticatedProfile,
        );

        // broadcastResult might be the `pubId` if it was a wallet tx
        if (broadcastResult) {
          // create seo image
          return typeof broadcastResult === "string"
            ? broadcastResult
            : broadcastResult.id || broadcastResult.txHash || `${authenticatedProfile?.id}-${broadcastResult?.toString(16)}`;
        }
      }

      const response = await fetch('/api/clubs/sage-create-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          postIpfsHash
        })
      });

      if (!response.ok) throw new Error("Failed to create post");
      const data = await response.json();
      return data?.pubId;
    } catch (error) {
      console.log(error);
    }
  };

  const sharedInputClasses = 'bg-card-light rounded-xl text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm';

  return (
    <div className={clsx("flex flex-col md:w-[448px] w-full")}
    style={{
      fontFamily: inter.style.fontFamily,
    }}>
      <Dialog.Title as="h2" className="text-2xl leading-7 font-bold">
        Create token
      </Dialog.Title>
      <form
        className="mt-5 mx-auto md:w-[448px] w-full space-y-4 divide-y divide-dark-grey"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-y-5 gap-x-8">

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
                        className="h-5 w-5 border-none text-primary focus:ring-primary/70"
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
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Subtitle className="text-white/70">
                    Description
                  </Subtitle>
                </div>
                <div>
                  <textarea
                    value={tokenDescription}
                    className={clsx("w-full pr-4 resize-none", sharedInputClasses)}
                    onChange={(e) => setTokenDescription(e.target.value)}
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
                    <Tooltip message="How long after graduation when tokens are 100% unlocked" direction="left">
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
                  <select
                    className={clsx("w-full pr-4", sharedInputClasses)}
                    onChange={(e) => setVestingDurationUnit(e.target.value)}
                    value={vestingDurationUnit}
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </div>
              </div>
            </div>

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
                <div>
                  <select
                    className={clsx("w-full pr-4", sharedInputClasses)}
                    onChange={(e) => setUniHook(e.target.value)}
                    value={uniHook}
                  >
                    {Object.keys(WHITELISTED_UNI_HOOKS).map((key) => (
                      <option key={`hook-${key}`} value={key}>{WHITELISTED_UNI_HOOKS[uniHook].label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

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
                  <label className="inline-block text-xs font-medium text-secondary/70 mr-4">
                    Fee: ${registrationFee}
                  </label>
                </div>
                <div className="relative flex flex-col space-y-1">
                  <CurrencyInput
                      trailingAmount={`${buyPriceFormatted}`}
                      trailingAmountSymbol="USDC"
                      trailingAmountLimit={(Number(creatorLiqMax) / 10 ** DECIMALS).toString()}
                      tokenBalance={tokenBalance}
                      price={`${initialSupply}`}
                      isError={false}
                      onPriceSet={(e) => setInitialSupply(parseFloat(e))}
                      symbol={tokenSymbol}
                  />
                </div>
                {(!!totalRegistrationFee && (totalRegistrationFee > creatorLiqMax)) && (
                    <p className={`mt-2 text-sm text-primary/90`}>
                      Max Purchase Spend: {localizeNumber(Number(creatorLiqMax) / 10 ** DECIMALS, "decimal")} USDC
                    </p>
                  )}
              </div>
            </div>
          </div>
          <div className="pt-8 flex flex-col gap-4 justify-center items-center">
            <Button size='md' disabled={isBuying || !isValid} onClick={registerClub} variant="accentBrand" className="w-full hover:bg-bullish">
              Create token
            </Button>
            <Subtitle>
              Creating will also make a post from {`${authenticatedProfile?.id ? 'your profile' : '@bons_ai'}`}
            </Subtitle>
            {(bonsaiNftBalance > 0n) && (
              <Subtitle>
                As a Bonsai NFT holder, your token will be featured for {BENEFITS_AUTO_FEATURE_HOURS} hours
              </Subtitle>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
