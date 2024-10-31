import { useMemo, useState } from "react";
import { useAccount, useWalletClient, useSwitchChain, useReadContract } from "wagmi";
import { formatUnits, parseUnits, erc721Abi } from "viem";
import toast from "react-hot-toast"

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
} from "@src/services/madfi/moneyClubs";

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

  const { data: buyPriceResult, isLoading: isLoadingBuyPrice } = useGetBuyPrice(address, club?.id, buyAmount);
  const { data: sellPriceResult, isLoading: isLoadingSellPrice } = useGetSellPrice(address, club?.id, sellAmount);
  const { buyPriceAfterFees } = buyPriceResult || {};
  const { sellPrice, sellPriceAfterFees } = sellPriceResult || {};

  const { data: bonsaiNftZkSync } = useReadContract({
    address: BONSAI_NFT_BASE_ADDRESS,
    abi: erc721Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address }
  });

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
