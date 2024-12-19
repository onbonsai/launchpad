import { inter } from "@src/fonts/fonts";
import { useMemo, useState, useEffect, useRef } from "react";
import { useAccount, useWalletClient, useSwitchChain, useReadContract } from "wagmi";
import { formatUnits, parseUnits, erc721Abi } from "viem";
import toast from "react-hot-toast";
import Link from "next/link";
import { InformationCircleIcon } from "@heroicons/react/solid";
import ConfettiExplosion from 'react-confetti-explosion';

import { Button } from "@src/components/Button"
import { roundedToFixed } from "@src/utils/utils";
import {
  useGetSellPrice,
  useGetClubLiquidity,
  useGetBuyAmount,
} from "@src/hooks/useMoneyClubs";
import {
  DECIMALS,
  CONTRACT_CHAIN_ID,
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  buyChips as buyChipsTransaction,
  sellChips as sellChipsTransaction,
  claimTokens as claimTokensTransaction,
  approveToken,
  BONSAI_NFT_BASE_ADDRESS,
  releaseLiquidity as releaseLiquidityTransaction,
  MIN_LIQUIDITY_THRESHOLD,
} from "@src/services/madfi/moneyClubs";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import Countdown from "@src/components/Countdown";
import { Tooltip } from "@src/components/Tooltip";
import { MADFI_CLUBS_URL } from "@src/constants/constants";
import { Header2, Subtitle } from "@src/styles/text";
import clsx from "clsx";
import CurrencyInput from "./CurrencyInput";
import { ArrowDownIcon } from "@heroicons/react/outline";

export const BuySellWidget = ({
  refetchClubBalance,
  refetchClubPrice,
  club,
  clubBalance,
  tokenBalance, // balance in USDC
  openTab: _openTab,
}) => {
  const { chain, address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [openTab, setOpenTab] = useState<number>(_openTab);
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [isReleased, setIsReleased] = useState(false);
  const [tokenAddress, setTokenAddress] = useState(club.tokenAddress);
  const [showConfetti, setShowConfetti] = useState(false);

  // const { data: buyPriceResult, isLoading: isLoadingBuyPrice } = useGetBuyPrice(address, club?.id, buyAmount);
  const { data: buyAmountResult, isLoading: isLoadingBuyAmount } = useGetBuyAmount(address, club?.id, buyPrice);
  const { buyAmount, maxAllowed } = buyAmountResult || {};
  const { data: sellPriceResult, isLoading: isLoadingSellPrice } = useGetSellPrice(address, club?.id, sellAmount);
  const { data: clubLiquidity, refetch: refetchClubLiquidity } = useGetClubLiquidity(club?.clubId);
  const minLiquidityThreshold = MIN_LIQUIDITY_THRESHOLD;
  const { sellPrice, sellPriceAfterFees } = sellPriceResult || {};
  const [claimEnabled, setClaimEnabled] = useState(false);
  const [justBought, setJustBought] = useState(false);
  const isBuyMax = parseFloat(buyPrice) > parseFloat(formatUnits(maxAllowed || 0n, USDC_DECIMALS));
  const notEnoughFunds = parseUnits(buyPrice || '0', USDC_DECIMALS) > (tokenBalance || 0n)

  const { data: bonsaiNftZkSync } = useReadContract({
    address: BONSAI_NFT_BASE_ADDRESS,
    abi: erc721Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address }
  });

  useEffect(() => {
    if (club.completedAt) {
      const isClaimEnabled = (Date.now() / 1000) - club.completedAt > 72 * 60 * 60;
      setClaimEnabled(isClaimEnabled);
    }
  }, [club.completedAt]);


  const sellPriceFormatted = useMemo(() => (
    roundedToFixed(parseFloat(formatUnits(sellPriceAfterFees || 0n, USDC_DECIMALS)), 4)
  ), [sellPrice, isLoadingSellPrice]);

  const sellAmountError: boolean = useMemo(() => {
    if (!sellAmount) return false;
    if (!clubBalance || clubBalance.toString() === "0") return true;

    // TOOD: handle not enough liquidity or selling the last chip edge cases
    // if (club?.supply && parseUnits(sellAmount.toString(), DECIMALS) >= BigInt(club.supply)) {
    //   toast.error('Cannot sell the last $cashtag; choose a smaller amount');
    //   return true;
    // }

    return !!sellAmount && parseUnits(sellAmount, DECIMALS) > clubBalance!;
  }, [club, sellAmount, clubBalance]);

  const bonded = useMemo(() => (
    clubLiquidity && minLiquidityThreshold && clubLiquidity >= (minLiquidityThreshold as bigint) * BigInt(10 ** USDC_DECIMALS)
  ), [clubLiquidity, minLiquidityThreshold]);

  const claimEnabledAtDate = club.completedAt
    ? new Date((club.completedAt + 72 * 60 * 60) * 1000)
    : (bonded ? new Date((Math.floor(Date.now() / 1000) + 72 * 60 * 60) * 1000) : null);

  const buyChips = async (e) => {
    e.preventDefault();
    setIsBuying(true);
    let toastId;

    if (chain!.id !== CONTRACT_CHAIN_ID) {
      try {
        console.log('switching to', CONTRACT_CHAIN_ID);
        switchChain({ chainId: CONTRACT_CHAIN_ID });
      } catch {
        toast.error("Please switch networks");
        setIsBuying(false);
        return;
      }
    }

    try {
      await approveToken(USDC_CONTRACT_ADDRESS, parseUnits(buyPrice, USDC_DECIMALS), walletClient, toastId);

      toastId = toast.loading("Buying", { id: toastId });
      await buyChipsTransaction(walletClient, club.id, buyAmount!);

      // give the indexer some time
      setTimeout(refetchClubBalance, 5000);
      setTimeout(refetchClubPrice, 5000);

      toast.success(`Bought ${formatUnits(buyAmount!, DECIMALS)} $${club.token.symbol}`, { duration: 10000, id: toastId });
      setJustBought(true);
      setShowConfetti(true);
      // Remove confetti after 5 seconds
      setTimeout(() => setShowConfetti(false), 5000);
    } catch (error) {
      console.log(error);
      toast.error("Failed to buy", { id: toastId });
    }
    setIsBuying(false);
  }

  const sellChips = async (e) => {
    e.preventDefault();
    setIsSelling(true);
    let toastId;

    if (chain!.id !== CONTRACT_CHAIN_ID && switchChain) {
      try {
        await switchChain({ chainId: CONTRACT_CHAIN_ID });
      } catch {
        toast.error("Please switch networks");
      }
      setIsBuying(false);
      return;
    }

    try {
      toastId = toast.loading("Selling...");
      await sellChipsTransaction(walletClient, club.id, sellAmount!);

      refetchClubLiquidity();
      setTimeout(refetchClubBalance, 5000);
      setTimeout(refetchClubPrice, 5000);

      toast.success(`Sold ${sellAmount} $${club.token.symbol}`, { duration: 10000, id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed to sell", { id: toastId });
    }
    setIsSelling(false);
  }

  const claimTokens = async () => {
    setIsBuying(true);
    let toastId;

    if (chain!.id !== CONTRACT_CHAIN_ID) {
      try {
        console.log('switching to', CONTRACT_CHAIN_ID);
        switchChain({ chainId: CONTRACT_CHAIN_ID });
      } catch {
        toast.error("Please switch networks");
        setIsBuying(false);
        return;
      }
    }

    try {
      toastId = toast.loading("Claiming tokens...");
      // also triggers token swap in the backend
      await claimTokensTransaction(walletClient, club.id);
      toast.success('Tokens claimed!', { id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed to claim tokens", { id: toastId });
    }
    setIsBuying(false);
  }

  const releaseLiquidity = async () => {
    setIsBuying(true);
    let toastId;

    try {
      toastId = toast.loading("Creating pool...");
      // also triggers token swap in the backend
      const token = await releaseLiquidityTransaction(club.id);
      setIsReleased(true);
      setTokenAddress(token);
      toast.success('Pool created!', { id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed to create the pool", { id: toastId });
    }
    setIsBuying(false);
  };

  const urlEncodedPostParams = () => {
    const params = {
      text: `Just aped $${buyPrice} into this new token! The ticker is $${club.token.symbol}
${MADFI_CLUBS_URL}/token/${club.id}
`,
    };

    return new URLSearchParams(params).toString();
  }

  if (club.complete && tokenAddress) {
    return (
      <div className={clsx("flex flex-col items-center justify-center w-full md:-mt-4", inter.className)}>
        <div className="text-center mt-12">
          <p className="mt-2 text-lg text-secondary/70">
            ${club.token.symbol}/BONSAI pool is live!{" "}
            <Link href={`https://app.uniswap.org/explore/tokens/base/${tokenAddress}?chain=base`} legacyBehavior target="_blank">
              <span className="text-grey link-hover cursor-pointer">Trade on Uniswap here</span>
            </Link>
          </p>
        </div>
        {clubBalance > 0n && (
          <div className="flex flex-col items-center justify-center space-y-2 mt-8 w-full">
            {claimEnabled && (
              <div className="w-full flex justify-center">
                <Button
                  variant="accent"
                  className="mb-2 md:mb-0 text-base"
                  onClick={claimTokens}
                >
                  Claim Tokens
                </Button>
              </div>
            )}
            {!claimEnabled && claimEnabledAtDate && (
              <div className="w-full flex justify-center">
                <Countdown
                  date={claimEnabledAtDate}
                  onComplete={() => setClaimEnabled(true)}
                  label={"Claim tokens in"}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  } else if (club.complete || bonded) {
    return (
      <div className={clsx("flex flex-col items-center justify-center w-full h-[190px] md:-mt-4", inter.className)}>
        <div className="text-center">
          <p className="mt-12 text-md text-secondary/70">
            ${club.token.symbol} has bonded & anyone can create the pool.<br /> After 72 hours, token claims will be enabled.
          </p>
        </div>
        {(club.complete || bonded) && !club.tokenAddress && !isReleased && (
          <div className="flex justify-center space-y-2 mt-8">
            {!club.tokenAddress && (
              <Button
                variant="accentBrand"
                className="mb-2 md:mb-0 text-base hover:bg-bullish"
                onClick={releaseLiquidity}
                disabled={isBuying}
              >
                Create Pool
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full"
    style={{
      fontFamily: inter.style.fontFamily
    }}>
      <div className="flex items-center justify-between mb-4">
        <Tabs openTab={openTab} setOpenTab={setOpenTab} />
        {/* {(!!bonsaiNftZkSync && bonsaiNftZkSync > 0n) && (
          <label className="text-xs font-medium text-secondary/70 whitespace-nowrap mt-4">
            Trading Fee: $0
          </label>
        )} */}
      </div>
      <div className="w-full">
        {/* Buy */}
        {openTab === 1 && (
          <div className="w-full divide-y divide-dark-grey">
            {showConfetti && <ConfettiExplosion zIndex={99999 + 1} className="ml-40" /> }
            <div className="space-y-8">
              <div className="gap-y-6 gap-x-4">
                <div className="flex flex-col">
                  <div className="flex flex-col justify-between gap-2">
                    <div className="relative flex flex-col">
                     <CurrencyInput
                        tokenImage='/usdc.png'
                        tokenBalance={tokenBalance}
                        price={buyPrice}
                        isError={(!isLoadingBuyAmount && isBuyMax) || notEnoughFunds}
                        onPriceSet={setBuyPrice}
                        symbol="USDC"
                        showMax
                      />

                        <div className="relative w-full min-h-[16px] max-h-[16px] flex justify-center">
                          <div className='backdrop-blur-[40px] absolute min-h-[28px] h-7 w-7 rounded-[10px] bg-[#333]  border-card border top-1/2 transform -translate-y-1/2 text-xs text-secondary/70'>
                            <div className="flex justify-center items-center h-full">
                              <ArrowDownIcon className="w-4 h-4 text-white"/>
                            </div>
                          </div>
                        </div>

                      <CurrencyInput
                        tokenImage={club.token.image}
                        tokenBalance={clubBalance}
                        price={`${buyAmount ? formatUnits(buyAmount, DECIMALS) : 0.0}`}
                        isError={false}
                        onPriceSet={() => {
                          // TODO: Set USDC amount based on the token amount
                        }}
                        symbol={club.token.symbol}
                        overridePrice={formatUnits((clubBalance * BigInt(club.currentPrice)), 12)}
                      />

                      {(!isLoadingBuyAmount && isBuyMax) && (
                        <div className="mt-3 flex justify-start text-secondary/70 text-xs cursor-pointer" onClick={() => setBuyPrice(formatUnits(maxAllowed || 0n, USDC_DECIMALS))}>
                          <p className="text-bearish">Max Allowed: {formatUnits(maxAllowed || 0n, USDC_DECIMALS)}{" USDC"}</p>
                          <Tooltip message="The first 2 hours of a token launch has snipe protection to limit buy orders" direction="top">
                            <InformationCircleIcon
                              width={14}
                              height={14}
                              className="inline-block -mt-1 text-secondary ml-2"
                            />
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full flex flex-col justify-center items-center space-y-2">
                {!justBought && (
                  <Button className="w-full hover:bg-bullish" disabled={!isConnected || isBuying || !buyPrice || isLoadingBuyAmount || !buyAmount || notEnoughFunds} onClick={buyChips} variant="accentBrand">
                    Buy ${club.token.symbol}
                  </Button>
                )}
                {justBought && (
                  <div className="w-full flex flex-col items-center">
                    <p className="text-center mb-4 gradient-txt">{`You bought ${formatUnits(buyAmount!, DECIMALS)} $${club.token.symbol}!`}</p>
                    <a href={`https://orb.club/create-post?${urlEncodedPostParams()}`} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant="accent" className="w-full">
                        Share to Orb
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Sell */}
        {openTab === 2 && (
          <div className="w-full space-y-8 divide-y divide-dark-grey">
            <div className="space-y-8">
              <div className="gap-y-6 gap-x-4">
                <div className="flex flex-col">
                  <div className="flex flex-col justify-between gap-2">
                    <div className="relative flex flex-col">
                    <CurrencyInput
                        tokenImage={club.token.image}
                        tokenBalance={clubBalance}
                        price={sellAmount}
                        isError={sellAmountError}
                        onPriceSet={setSellAmount}
                        symbol={club.token.symbol}
                        showMax
                      />

                        <div className="relative w-full min-h-[16px] max-h-[16px] flex justify-center">
                          <div className='backdrop-blur-[40px] absolute min-h-[28px] h-7 w-7 rounded-[10px] bg-[#333]  border-card border top-1/2 transform -translate-y-1/2 text-xs text-secondary/70'>
                            <div className="flex justify-center items-center h-full">
                              <ArrowDownIcon className="w-4 h-4 text-white"/>
                            </div>
                          </div>
                        </div>

                        <CurrencyInput
                        tokenImage='/usdc.png'
                        tokenBalance={tokenBalance}
                        price={sellPriceFormatted}
                        isError={false}
                        onPriceSet={() => {}}
                        symbol="USDC"
                      />
                      {/* <div className="relative">
                        <input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          value={sellAmount}
                          className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                          onChange={(e) => setSellAmount(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-xs">{clubBalance ? roundedToFixed(parseFloat(formatUnits(clubBalance, DECIMALS)), 2) : 0.0}{" "}{club.token.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        {[10, 25, 50, 100].map((percent) => (
                          <Button
                            key={percent}
                            size="sm"
                            onClick={() => setSellAmount(clubBalance ? formatUnits((clubBalance * BigInt(percent)) / BigInt(100), DECIMALS) : '0')}
                          >
                            {percent}%
                          </Button>
                        ))}
                      </div>
                      <span
                        className={`absolute right-3 top-full mt-2 text-xs ${sellAmountError ? 'text-primary/90' : 'text-secondary/70'}`}
                      >
                        You will receive:{" $"}{sellPriceFormatted}
                      </span> */}
                    </div>


                  </div>
                </div>
              </div>
              <div className="pt-4 w-full flex justify-center items-center">
                <Button className="w-full hover:bg-bullish" disabled={!isConnected || isSelling || !sellAmount || isLoadingSellPrice || !sellPriceAfterFees || club.supply == (Number(sellAmount) * 1e6)} onClick={sellChips} variant="accentBrand">
                  Sell ${club.token.symbol}
                </Button>
              </div>
              {/* TODO: use custom hook to fetch this supply and refetch every 15s */}
              {club.supply != "0" && club.supply == (Number(sellAmount) * 1e6) && <p className="mt-2 text-bearish max-w-xs text-xs">You can't sell the last chip from the club. Decrease your input by 0.000001</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Tabs = ({ openTab, setOpenTab }) => {
  return (
    <div
      className="flex w-full"
      style={{
        fontFamily: inter.style.fontFamily,
      }}
    >
      <ul
        className="nav nav-pills flex flex-row flex-wrap list-none w-full"
        id="pills-tab"
        role="tablist"
      >
        <li className="nav-item" role="presentation">
          <button
            onClick={() => setOpenTab(1)}
            className={clsx(`
            nav-link
            block
            rounded
            w-full
            text-center
            md:w-auto
            mr-2
            focus:outline-none focus:ring-0`,
            )}
          >
            <Header2 className={clsx('font-sans', openTab === 1 ? "text-white" : "text-white/30")}>
              Buy
            </Header2>
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            onClick={() => setOpenTab(2)}
            className={clsx(`
            nav-link
            block
            rounded
            w-full
            text-center
            md:w-auto
            mr-2
            focus:outline-none focus:ring-0`,
            )}
          >
            <Header2 className={clsx(openTab === 2 ? "text-white" : "text-white/30")}>
              Sell
            </Header2>
          </button>
        </li>
      </ul>
    </div>
  );
}
