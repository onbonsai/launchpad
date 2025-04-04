import { useMemo, useState } from "react";
import { switchChain } from "@wagmi/core";
import clsx from "clsx";
import toast from "react-hot-toast";
import { useAccount, useWalletClient, useReadContract, useBalance } from "wagmi";
import { Dialog } from "@headlessui/react";
import { base, polygon, zkSync } from "viem/chains";
import { erc20Abi, formatEther, type Chain } from "viem";
import { BONSAI_CONTRACTS, bridgeTokens, useGetEstimatedNativeFee } from "@src/services/layerzero/oftAdapter";
import { lens } from "@src/services/madfi/utils"
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { Button } from "@src/components/Button";
import { BodySemiBold, Subtitle } from "@src/styles/text";
import SelectDropdown from "@src/components/Select/SelectChain";
import { configureChainsConfig } from "@src/utils/wagmi";
import { useModal } from "connectkit";

export default ({ bonsaiBalance, onBridge, bridgeInfo }) => {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { setOpen } = useModal();

  const [amount, setAmount] = useState("");
  const [bridging, setBridging] = useState(false);

  const { data: bonsaiBalancePolygon, isLoading: isLoadingPolygon } = useReadContract({
    address: BONSAI_CONTRACTS[polygon.id] as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: polygon.id,
    query: {
      enabled: isConnected
    }
  });

  const { data: bonsaiBalanceBase, isLoading: isLoadingBase } = useReadContract({
    address: BONSAI_CONTRACTS[base.id] as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: base.id,
    query: {
      enabled: isConnected
    }
  });

  const { data: bonsaiBalanceZkSync, isLoading: isLoadingZkSync } = useReadContract({
    address: BONSAI_CONTRACTS[zkSync.id] as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    chainId: zkSync.id,
    query: {
      enabled: isConnected
    }
  });

  const chainOptions = useMemo(() => [{
    options: [
      { value: base, label: "Base", icon: "/svg/base.svg", size: 16, balance: bonsaiBalanceBase },
      { value: polygon, label: "Polygon", icon: "/svg/polygon-logo-dark.svg", balance: bonsaiBalancePolygon },
      { value: zkSync, label: "zkSync Era", icon: "/svg/zksync-logo-dark.svg", balance: bonsaiBalanceZkSync },
      // not allowing users to bridge _from_ Lens
      // { value: lens, label: "Lens", icon: "/svg/lens.svg", balance: bonsaiBalance }
    ]
  }], [bonsaiBalancePolygon, bonsaiBalanceBase, bonsaiBalanceZkSync]);

  const destinationChainOptions = [
    { value: lens, label: "Lens", icon: "/svg/lens.svg", balance: bonsaiBalance }
  ]

  const isLoading = isLoadingBase || isLoadingPolygon || isLoadingZkSync;
  const highestBalanceChain = useMemo(() => {
    if (!isLoading) {
      const balances = [
        { chain: base, balance: bonsaiBalanceBase || 0n },
        { chain: polygon, balance: bonsaiBalancePolygon || 0n },
        { chain: zkSync, balance: bonsaiBalanceZkSync || 0n },
      ];

      return balances.reduce((max, current) =>
        current.balance > max.balance ? current : max
      ).chain;
    }
  }, [isLoading]);

  const [fromChain, setFromChain] = useState<Chain | undefined>(highestBalanceChain);
  const [toChain, setToChain] = useState<Chain>(lens);

  const { data: estimatedFee } = useGetEstimatedNativeFee({
    fromChain,
    toChain,
    amount,
    recipient: address as `0x${string}`
  });

  const { data: nativeBalance } = useBalance({
    address,
    chainId: fromChain?.id
  });

  const formattedFee = useMemo(() => {
    if (fromChain && estimatedFee) {
      const symbol = fromChain.id === polygon.id ? "POL" : "ETH";
      return `~ ${parseFloat(formatEther(estimatedFee)).toFixed(symbol === "POL" ? 4 : 6)} ${symbol}`;
    }
  }, [fromChain, estimatedFee]);

  const fromChainBalance = useMemo(() => {
    if (!fromChain) return 0n;

    switch (fromChain.id) {
      case base.id:
        return bonsaiBalanceBase || 0n;
      case polygon.id:
        return bonsaiBalancePolygon || 0n;
      case zkSync.id:
        return bonsaiBalanceZkSync || 0n;
      default:
        return 0n;
    }
  }, [fromChain, bonsaiBalanceBase, bonsaiBalancePolygon, bonsaiBalanceZkSync]);

  const handleBridge = async () => {
    if (chain?.id !== fromChain?.id) {
      try {
        await switchChain(configureChainsConfig, { chainId: fromChain?.id });
        return;
      } catch {
        toast.error("Please switch chains");
        return;
      }
    }

    const toastId = toast.loading("Bridging...");
    setBridging(true);

    try {
      const hash = await bridgeTokens(
        fromChain as Chain,
        toChain as Chain,
        amount,
        walletClient,
        toastId
      );
      if (!hash) throw new Error("no hash");
      toast.success("Sent! Check LayerZero for estimated delivery", { id: toastId });

      onBridge(hash);
    } catch (error) {
      console.log(error);
      toast.error("Failed to bridge", { id: toastId });
    }

    setBridging(false);
  }

  const sharedInputClasses = 'bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm';
  const sufficientNativeFunds = nativeBalance && estimatedFee ? nativeBalance.value > estimatedFee : false;
  const isValid = fromChain && toChain && amount && estimatedFee && sufficientNativeFunds;

  return (
    <div className="space-y-6 md:min-w-[450px] text-secondary font-sf-pro-text">
      <div className="flex items-center justify-between">
        <Dialog.Title as="h2" className="text-2xl leading-7 font-bold">
          Bridge $BONSAI
        </Dialog.Title>
      </div>
      {isLoading && (
        <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>
      )}
      {!isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-y-5 gap-x-8">
            {/* From Chain */}
            <div className="sm:col-span-2 flex flex-col">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Subtitle className="text-white/70">From</Subtitle>
                </div>
                <div className="relative">
                  <SelectDropdown
                    options={chainOptions}
                    value={chainOptions[0].options.find(opt => opt.value.id === fromChain?.id)}
                    onChange={(option) => setFromChain(option.value)}
                    isMulti={false}
                    zIndex={1005}
                  />
                </div>
              </div>
            </div>

            {/* To Chain (only Lens) */}
            <div className="sm:col-span-2 flex flex-col">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Subtitle className="text-white/70">To</Subtitle>
                </div>
                <div className="relative">
                  <SelectDropdown
                    options={destinationChainOptions}
                    value={{ value: lens, label: "Lens", icon: "/svg/lens.svg", balance: bonsaiBalance }}
                    onChange={() => { }}
                    isMulti={false}
                    zIndex={1001}
                    isDisabled
                  />
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="sm:col-span-2 flex flex-col">
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Subtitle className="text-white/70">Amount</Subtitle>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={clsx("w-full pr-4", sharedInputClasses)}
                    placeholder="0"
                  />
                  <button
                    disabled={!fromChain}
                    onClick={() => setAmount(parseFloat(formatEther(fromChainBalance || 0n)).toFixed(2))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-bullish"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Estimated fee / time */}
          <div className="sm:col-span-2 flex flex-col">
            {!!formattedFee && (
              <div className="flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <Subtitle className="text-white/70">Estimated Fee</Subtitle>
                  <BodySemiBold className="text-white/70">{formattedFee}</BodySemiBold>
                </div>
                <div className="flex items-center justify-between">
                  <Subtitle className="text-white/70">Estimated Time</Subtitle>
                  <BodySemiBold className="text-white/70">~ 2 min</BodySemiBold>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 flex flex-col gap-2 justify-center items-center">
            <Button
              size='md'
              variant="accentBrand"
              className="w-full hover:bg-bullish"
              disabled={!isValid || bridging}
              onClick={handleBridge}
            >
              {(chain?.id !== fromChain?.id) ? `Switch to ${fromChain?.name}` : (
                (nativeBalance && estimatedFee && !sufficientNativeFunds) ? "Insufficient funds" : "Bridge"
              )}
            </Button>
          </div>

          {bridgeInfo?.txHash && (
            <div className="flex justify-center">
              <a
                href={`https://layerzeroscan.com/tx/${bridgeInfo.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-bullish hover:underline"
              >
                Check LayerZero
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};