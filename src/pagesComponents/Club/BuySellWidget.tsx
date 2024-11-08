import { useMemo, useState, useEffect } from "react";
import { useAccount, useWalletClient, useSwitchChain, useReadContract } from "wagmi";
import { formatUnits, parseUnits, erc721Abi } from "viem";
import toast from "react-hot-toast";
import Link from "next/link";

import { Button } from "@src/components/Button"
import { roundedToFixed } from "@src/utils/utils";
import {
  useGetBuyPrice,
  useGetSellPrice,
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
} from "@src/services/madfi/moneyClubs";
import Countdown from "@src/components/Countdown";

export const BuySellWidget = ({
  refetchRegisteredClub,
  refetchClubBalance,
  refetchClubPrice,
  club,
  clubBalance,
  tokenBalance, // balance in USDC
  openTab: _openTab,
}) => {
  const { chain, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [openTab, setOpenTab] = useState<number>(_openTab);
  const [buyAmount, setBuyAmount] = useState<string>('');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [isReleased, setIsReleased] = useState(false);
  const [tokenAddress, setTokenAddress] = useState(club.tokenAddress);

  const { data: buyPriceResult, isLoading: isLoadingBuyPrice } = useGetBuyPrice(address, club?.id, buyAmount);
  const { data: sellPriceResult, isLoading: isLoadingSellPrice } = useGetSellPrice(address, club?.id, sellAmount);
  const { buyPriceAfterFees } = buyPriceResult || {};
  const { sellPrice, sellPriceAfterFees } = sellPriceResult || {};
  const [claimEnabled, setClaimEnabled] = useState(false);
  const claimEnabledAtDate = club.completedAt ? new Date((club.completedAt + 72 * 60 * 60) * 1000) : null;

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

  const buyPriceFormatted = useMemo(() => (
    roundedToFixed(parseFloat(formatUnits(buyPriceAfterFees || 0n, USDC_DECIMALS)), 4)
  ), [buyPriceAfterFees, isLoadingBuyPrice]);

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
      await approveToken(USDC_CONTRACT_ADDRESS, buyPriceAfterFees!, walletClient, toastId);

      toastId = toast.loading("Buying", { id: toastId });
      await buyChipsTransaction(walletClient, club.id, buyAmount!);

      // give the indexer some time
      setTimeout(refetchRegisteredClub, 5000);
      setTimeout(refetchClubBalance, 5000);
      setTimeout(refetchClubPrice, 5000);

      toast.success(`Bought ${buyAmount} $${club.token.symbol}`, { duration: 10000, id: toastId });
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

      setTimeout(refetchRegisteredClub, 5000);
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

  }

  const releaseLiquidity = async () => {
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
      toastId = toast.loading("Creating pool...");
      // also triggers token swap in the backend
      const token = await releaseLiquidityTransaction(walletClient, club.id);
      setIsReleased(true);
      setTokenAddress(token);

      setTimeout(refetchRegisteredClub, 5000);
      toast.success('Pool created!');
    } catch (error) {
      console.log(error);
      toast.error("Failed to create the pool", { id: toastId });
    }
    setIsBuying(false);
  };

  if (club.complete && tokenAddress) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[250px] md:-mt-4">
        <div className="text-center">
          <p className="mt-2 text-lg text-secondary/70">
            ${club.token.symbol}/USDC pool is live!{" "}
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
                  disabled
                >
                  [TODO] Claim Tokens
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
  } else if (club.complete) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[250px] md:-mt-4">
        <div className="text-center">
          <p className="mt-2 text-lg text-secondary/70">
            ${club.token.symbol} has bonded.<br /> Anyone can create the pool.<br /> After 72 hours, token claims will be enabled.
          </p>
        </div>
        {club.complete && !club.tokenAddress && !isReleased && (
          <div className="flex justify-center space-y-2 mt-8">
            {!club.tokenAddress && (
              <Button
                variant="accent"
                className="mb-2 md:mb-0 text-base"
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
    <div className="flex flex-col w-full h-full md:-mt-4">
      <div className="flex items-center justify-between mb-4">
        <Tabs openTab={openTab} setOpenTab={setOpenTab} />
        {(!!bonsaiNftZkSync && bonsaiNftZkSync > 0n) && (
          <label className="text-xs font-medium text-secondary/70 whitespace-nowrap mt-4">
            Trading Fee: $0
          </label>
        )}
      </div>
      <div className="w-full">
        {/* Buy */}
        {openTab === 1 && (
          <div className="w-full space-y-8 divide-y divide-dark-grey">
            <div className="space-y-8">
              <div className="gap-y-6 gap-x-4">
                <div className="flex flex-col">
                  <div className="flex flex-col justify-between gap-2">
                    <div className="relative flex flex-col space-y-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          value={buyAmount}
                          className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                          onChange={(e) => setBuyAmount(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-xs">{club.token.symbol}</span>
                      </div>

                      <div className="absolute left-1/2 transform -translate-x-1/2 bg-black/70 rounded-full p-1 shadow-md top-6 z-10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-secondary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      <div className="relative flex-1">
                        <input
                          type="number"
                          className={"block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"}
                          value={buyPriceFormatted}
                          disabled
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-xs">USDC</span>
                      </div>
                      <p className={`absolute right-3 top-full mt-2 text-xs ${tokenBalance < (buyPriceAfterFees || 0n) ? 'text-primary/90' : 'text-secondary/70'}`}>
                        USDC Balance: {tokenBalance ? roundedToFixed(parseFloat(formatUnits(tokenBalance, USDC_DECIMALS)), 2) : 0.0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 w-full flex justify-center items-center">
                <Button className="w-full" disabled={isBuying || !buyAmount || isLoadingBuyPrice || !buyPriceAfterFees || tokenBalance < (buyPriceAfterFees || 0n)} onClick={buyChips} variant="primary">
                  Buy
                </Button>
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
                    <div className="relative flex flex-col space-y-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="1"
                          placeholder="0.0"
                          value={sellAmount}
                          className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                          onChange={(e) => setSellAmount(e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-xs">{club.token.symbol}</span>
                      </div>

                      <div className="absolute left-1/2 transform -translate-x-1/2 bg-black/70 rounded-full p-1 shadow-md top-6 z-10">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-secondary"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>

                      <div className="relative flex-1">
                        <input
                          type="number"
                          className={"block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"}
                          value={sellPriceFormatted}
                          disabled
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary text-xs">USDC</span>
                      </div>
                      <a
                        className={`absolute right-3 top-full mt-2 text-xs link link-hover ${sellAmountError ? 'text-primary/90' : 'text-secondary/70'}`}
                        onClick={() => setSellAmount(formatUnits(clubBalance, DECIMALS))}
                      >
                        {club.token.symbol}{" "}Balance: {clubBalance ? roundedToFixed(parseFloat(formatUnits(clubBalance, DECIMALS)), 2) : 0.0}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 w-full flex justify-center items-center">
                <Button className="w-full" disabled={isSelling || !sellAmount || isLoadingSellPrice || !sellPriceAfterFees} onClick={sellChips} variant="primary">
                  Sell
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Tabs = ({ openTab, setOpenTab }) => {
  return (
    <div className="flex w-full">
      <ul
        className="nav nav-pills flex flex-row flex-wrap list-none w-full"
        id="pills-tab"
        role="tablist"
      >
        <li className="nav-item" role="presentation">
          <button
            onClick={() => setOpenTab(1)}
            className={`
            nav-link
            block
            font-medium
            text-md
            leading-tight
            rounded
            px-6
            py-2
            w-full
            text-center
            md:w-auto
            md:mr-2
            focus:outline-none focus:ring-0
            ${openTab === 1 ? "bg-dark-grey text-white hover:bg-dark-grey/90" : ""}
          `}
          >
            Buy
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            onClick={() => setOpenTab(2)}
            className={`
            nav-link
            block
            font-medium
            text-md
            leading-tight
            rounded
            px-6
            py-2
            w-full
            text-center
            md:w-auto
            md:mr-2
            focus:outline-none focus:ring-0
            ${openTab === 2 ? "bg-dark-grey text-white hover:bg-dark-grey/90" : ""}
          `}
          >
            Sell
          </button>
        </li>
      </ul>
    </div>
  );
}
