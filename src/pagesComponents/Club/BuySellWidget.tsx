import { inter } from "@src/fonts/fonts";
import { useMemo, useState } from "react";
import { useAccount, useWalletClient, useSwitchChain, useReadContract } from "wagmi";
import { formatUnits, parseUnits, erc721Abi, parseEther, formatEther } from "viem";
import toast from "react-hot-toast";
import Link from "next/link";
import { InformationCircleIcon } from "@heroicons/react/solid";
import ConfettiExplosion from 'react-confetti-explosion';
import clsx from "clsx";

import { Button } from "@src/components/Button"
import { castIntentTokenReferral, kFormatter, roundedToFixed, tweetIntentTokenReferral } from "@src/utils/utils";
import {
  useGetSellPrice,
  useGetClubLiquidity,
  useGetBuyAmount,
  useGetAvailableBalance,
} from "@src/hooks/useMoneyClubs";
import {
  DECIMALS,
  CONTRACT_CHAIN_ID,
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  buyChips as buyChipsTransaction,
  sellChips as sellChipsTransaction,
  approveToken,
  BONSAI_NFT_BASE_ADDRESS,
  releaseLiquidity as releaseLiquidityTransaction,
  MIN_LIQUIDITY_THRESHOLD,
} from "@src/services/madfi/moneyClubs";
import { MADFI_CLUBS_URL } from "@src/constants/constants";
import CurrencyInput from "./CurrencyInput";
import { ArrowDownIcon } from "@heroicons/react/outline";
import { Header as HeaderText, Header2 as Header2Text, BodySemiBold } from "@src/styles/text";
import { useRouter } from "next/router";

export const BuySellWidget = ({
  refetchClubBalance,
  refetchClubPrice,
  club,
  clubBalance,
  tokenBalance, // balance in USDC
  openTab: _openTab,
}) => {
  const router = useRouter();
  const referralAddress = router.query.ref as `0x${string}`;
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

  // const { data: buyPriceResult, isLoading: isLoadingBuyPrice } = useGetBuyPrice(address, club?.clubId, buyAmount);
  const { data: buyAmountResult, isLoading: isLoadingBuyAmount } = useGetBuyAmount(address, club?.tokenAddress, buyPrice);
  const { buyAmount } = buyAmountResult || {};
  const { data: sellPriceResult, isLoading: isLoadingSellPrice } = useGetSellPrice(address, club?.clubId, sellAmount);
  const { data: clubLiquidity, refetch: refetchClubLiquidity } = useGetClubLiquidity(club?.clubId);
  const { data: availableBalance } = useGetAvailableBalance(club.tokenAddress, address);
  const minLiquidityThreshold = MIN_LIQUIDITY_THRESHOLD;
  const { sellPrice, sellPriceAfterFees } = sellPriceResult || {};
  const [justBought, setJustBought] = useState(false);
  const [justBoughtAmount, setJustBoughtAmount] = useState<string>();
  const notEnoughFunds = parseUnits(buyPrice || '0', USDC_DECIMALS) > (tokenBalance || 0n)

  const { data: bonsaiBalanceNFT } = useReadContract({
    address: BONSAI_NFT_BASE_ADDRESS,
    abi: erc721Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address }
  });

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

  const fullTokenBalance = useMemo(() => {
    if (club.completedAt && clubBalance > 0n) {
      return kFormatter(parseFloat(formatEther(clubBalance * parseEther("800000000") / BigInt(club.supply))))
    }
  }, [club, clubBalance]);

  const availableTokenBalance = useMemo(() => {
    if (club.completedAt && availableBalance && availableBalance.availableBalance > 0n) {
      return kFormatter(parseFloat(formatEther(availableBalance.availableBalance)))
    }
  }, [club, clubBalance, availableBalance]);

  // when tokens are fully vested
  const fullTokenBalanceVestedAt = club.completedAt && club.claimAt
    ? new Date(club.claimAt * 1000).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })
    : null;

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
      await buyChipsTransaction(walletClient, club.clubId, buyAmount!, referralAddress);

      // give the indexer some time
      setTimeout(refetchClubBalance, 5000);
      setTimeout(refetchClubPrice, 5000);

      toast.success(`Bought ${formatUnits(buyAmount!, DECIMALS)} $${club.token.symbol}`, { duration: 10000, id: toastId });
      setJustBought(true);
      setShowConfetti(true);
      setJustBoughtAmount(formatUnits(buyAmount!, DECIMALS));
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
      await sellChipsTransaction(walletClient, club.clubId, sellAmount!);

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

  const releaseLiquidity = async () => {
    setIsBuying(true);
    let toastId;

    try {
      toastId = toast.loading("Creating pool...");
      // also triggers token swap in the backend
      const token = await releaseLiquidityTransaction(club.clubId);
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
      text: `Just aped into $${club.token.symbol}!
${MADFI_CLUBS_URL}/token/${club.clubId}?ref=${address}`,
    };

    return new URLSearchParams(params).toString();
  }

  // after liquidity released
  if (!!club.completedAt) {
    return (
      <div className={clsx("flex flex-col items-center justify-center w-full md:-mt-4", inter.className)}>
        <div className="text-center pt-12">
          <HeaderText>
            ${club.token.symbol}/BONSAI pool is live
          </HeaderText>
          <Header2Text>
            <Link href={`https://dexscreener.com/base/${tokenAddress}`} target="_blank" rel="noreferrer">
              <span className="text-grey link-hover cursor-pointer">View on Dexscreener</span>
            </Link>
          </Header2Text>
        </div>
        {clubBalance > 0n && (
          <div className="flex flex-col items-center justify-center space-y-2 mt-4 w-full">
            <Header2Text className={"text-white"}>{`Tokens vested and available to trade: ${availableTokenBalance}`}</Header2Text>
            <BodySemiBold className="text-white/60 font-medium">{`Total tokens available: ${fullTokenBalance} (on ${fullTokenBalanceVestedAt})`}</BodySemiBold>
          </div>
        )}
      </div>
    )
  } else if (club.complete || bonded) {
    console.log(club.complete, bonded, club.tokenAddress, isReleased);
    return (
      <div className={clsx("flex flex-col items-center justify-center w-full h-[190px] md:-mt-4", inter.className)}>
        <div className="text-center">
          <p className="mt-12 text-md text-secondary/70">
            ${club.token.symbol} has bonded & anyone can create the pool.<br /> Tokens will begin linear vesting immediately.
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
    <div className="flex flex-col w-[calc(100vw-65px)] sm:w-full"
      style={{
        fontFamily: inter.style.fontFamily
      }
      }>
      <div className="flex items-center justify-between mb-4">
        <Tabs openTab={openTab} setOpenTab={setOpenTab} />
        {/* {(!!bonsaiBalanceNFT && bonsaiBalanceNFT > 0n) && (
          <label className="text-xs font-medium text-secondary/70 whitespace-nowrap mt-4">
            Trading Fee: $0
          </label>
        )} */}
      </div>
      <div className="w-full">
        {/* Buy */}
        {openTab === 1 && (
          <div className="w-full divide-y divide-dark-grey">
            {showConfetti && <ConfettiExplosion zIndex={99999 + 1} className="ml-40" />}
            <div className="space-y-8">
              <div className="gap-y-6 gap-x-4">
                <div className="flex flex-col">
                  <div className="flex flex-col justify-between gap-2">
                    <div className="relative flex flex-col">
                      <CurrencyInput
                        tokenImage='/usdc.png'
                        tokenBalance={tokenBalance}
                        price={buyPrice}
                        isError={isLoadingBuyAmount || notEnoughFunds}
                        onPriceSet={setBuyPrice}
                        symbol="USDC"
                        showMax
                      />

                      <div className="relative w-full min-h-[16px] max-h-[16px] flex justify-center">
                        <div className='backdrop-blur-[40px] absolute min-h-[28px] h-7 w-7 rounded-[10px] bg-[#333]  border-card border top-1/2 transform -translate-y-1/2 text-xs text-secondary/70'>
                          <div className="flex justify-center items-center h-full">
                            <ArrowDownIcon className="w-4 h-4 text-white" onClick={() => setOpenTab(2)} />
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
                        overridePrice={formatUnits((BigInt(clubBalance || 0) * BigInt(club.currentPrice)), 24)}
                      />
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
                  <div className="w-full flex flex-col items-center space-y-4">
                    <p className="text-center gradient-txt">{`You bought ${justBoughtAmount} $${club.token.symbol}!`}</p>
                    <p className="text-center gradient-txt">{`Share and earn referral rewards`}</p>
                    <div className="flex flex-row md:flex-row flex-col items-center md:space-x-2 space-y-2 md:space-y-0">
                      <a href={`https://orb.club/create-post?${urlEncodedPostParams()}`} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button className="w-[150px] bg-black hover:bg-black">
                          <img src="/svg/orb-logo-white.svg" alt="X Logo" className="mr-2 w-4 h-4" />
                          Orb
                        </Button>
                      </a>
                      <a href={tweetIntentTokenReferral({
                        text: `Just aped into $${club.token.symbol}!`,
                        clubId: club.clubId,
                        referralAddress: address!
                      })} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="accent" className="w-[150px] flex items-center justify-center">
                          <img src="/svg/X_logo_2023.svg" alt="X Logo" className="w-4 h-4" />
                        </Button>
                      </a>
                      <a href={castIntentTokenReferral({
                        text: `Just aped into $${club.token.symbol}!`,
                        clubId: club.clubId,
                        referralAddress: address!
                      })} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button className="w-[150px] bg-[#472a91] hover:bg-[#472a91] text-white">
                          Warpcast
                        </Button>
                      </a>
                    </div>
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
                            <ArrowDownIcon className="w-4 h-4 text-white" onClick={() => setOpenTab(1)} />
                          </div>
                        </div>
                      </div>

                      <CurrencyInput
                        tokenImage='/usdc.png'
                        tokenBalance={tokenBalance}
                        price={sellPriceFormatted}
                        isError={false}
                        onPriceSet={() => { }}
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

        {!isConnected && (
          <div className="flex items-center justify-center w-full h-full mt-2">
            <p className="text-bearish">Log In with your wallet to begin trading</p>
          </div>
        )}
      </div>
    </div >
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
            <Header2Text className={clsx('font-sans', openTab === 1 ? "text-white" : "text-white/30")}>
              Buy
            </Header2Text>
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
            <Header2Text className={clsx(openTab === 2 ? "text-white" : "text-white/30")}>
              Sell
            </Header2Text>
          </button>
        </li>
      </ul>
    </div>
  );
}
