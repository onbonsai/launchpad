import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@src/components/Button";
import { Dialog } from "@headlessui/react";
import { brandFont } from "@src/fonts/fonts";
import clsx from "clsx";
import { useAccount, useBalance, useReadContract, useWalletClient } from "wagmi";
import { getChain, LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { erc20Abi, formatEther, parseUnits } from "viem";
import { DECIMALS, WGHO_CONTRACT_ADDRESS, publicClient, WGHO_ABI } from "@src/services/madfi/moneyClubs";
import { formatUnits } from "viem";
import { swapGhoForBonsai, calculatePath } from "@src/services/lens/rewardSwap";
import useQuoter from "@src/services/uniswap/useQuote";
import { readContract } from "viem/actions";
import { toast } from "react-hot-toast";
import useLensSignIn from "@src/hooks/useLensSignIn";

interface TopUpOption {
  bonsai: number;
  price: number;
  ghoRequired: bigint;
  highlight?: boolean;
}

interface TopUpModalProps {
  requiredAmount?: bigint;
}

export const TopUpModal = ({ requiredAmount }: TopUpModalProps) => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [selectedOption, setSelectedOption] = useState<TopUpOption | null>(null);
  const { authenticatedProfile } = useLensSignIn(walletClient);

  // GHO Balance
  const { data: ghoBalance } = useBalance({
    address,
    chainId: LENS_CHAIN_ID,
  });

  // WGHO Balance
  const { data: wghoBalance } = useReadContract({
    address: WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: "balanceOf",
    args: [address!],
    query: {
      refetchInterval: 10000,
      enabled: isConnected,
    },
  });

  // BONSAI Balance of Lens Account
  const { data: bonsaiBalance } = useReadContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: "balanceOf",
    args: [authenticatedProfile?.address as `0x${string}`],
    query: {
      refetchInterval: 10000,
      enabled: !!authenticatedProfile?.address,
    },
  });

  const totalGhoBalance = (ghoBalance?.value || 0n) + (wghoBalance || 0n);
  const formattedGhoBalance = Number(formatUnits(totalGhoBalance, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  const formattedBonsaiBalance = bonsaiBalance ? Number(formatUnits(bonsaiBalance, 18)).toLocaleString() : "0";

  const { data: quoteResult, isLoading: isLoadingQuote } = useQuoter({
    account: address as `0x${string}`,
    path: calculatePath(PROTOCOL_DEPLOYMENT.lens.Bonsai),
    amountIn: parseUnits("1", DECIMALS),
    enabled: !!address,
  });

  const topUpOptions: TopUpOption[] = useMemo(() => {
    if (!quoteResult || isLoadingQuote) return [];

    const bonsaiPerGho = Number(formatUnits(quoteResult[0], DECIMALS));
    const prices = [5, 10, 25];

    // Calculate options for standard prices
    const standardOptions = prices.map((price) => {
      const bonsaiAmount = Math.floor(price * bonsaiPerGho);
      const ghoRequired = parseUnits(price.toString(), DECIMALS);

      return {
        bonsai: bonsaiAmount,
        price,
        ghoRequired,
        highlight: false,
      };
    });

    // Calculate first option based on requiredAmount or default $2.50
    const firstOption = requiredAmount
      ? {
          bonsai: Number(formatEther(requiredAmount)),
          price: Number((Number(formatEther(requiredAmount)) / bonsaiPerGho).toFixed(2)),
          ghoRequired: parseUnits((Number(formatEther(requiredAmount)) / bonsaiPerGho).toString(), DECIMALS),
          highlight: true,
        }
      : {
          bonsai: Math.floor(2.5 * bonsaiPerGho),
          price: 2.5,
          ghoRequired: parseUnits("2.5", DECIMALS),
          highlight: true,
        };

    return [firstOption, ...standardOptions];
  }, [quoteResult, isLoadingQuote, requiredAmount]);

  const topUp = async () => {
    if (!walletClient || !address) {
      toast.error("No wallet client or address found");
      throw new Error("No wallet client or address found");
    }
    if (!selectedOption) {
      toast.error("No selected option");
      throw new Error("No selected option");
    }

    const _publicClient = publicClient("lens");

    // check WGHO balance
    const wghoBalance = await readContract(walletClient, {
      address: WGHO_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [address],
    });

    const requiredWgho = (102n * parseUnits(selectedOption.price.toString(), DECIMALS)) / 100n;

    // If enough WGHO, swap it to BONSAI
    if (wghoBalance >= requiredWgho) {
      const swapToastId = toast.loading("Swapping WGHO to BONSAI...");
      try {
        await swapGhoForBonsai(
          walletClient,
          parseUnits(selectedOption.bonsai.toString(), DECIMALS),
          address,
          requiredWgho,
        );
        toast.success("Swapped WGHO to BONSAI", { id: swapToastId });
      } catch (error) {
        toast.error("Failed to swap WGHO to BONSAI", { id: swapToastId });
        throw error;
      }
    } else {
      // Check GHO balance
      const ghoBalance = await _publicClient.getBalance({
        address: address,
      });

      // Calculate how much more WGHO we need
      const additionalWGHONeeded = requiredWgho - wghoBalance;

      if (ghoBalance < additionalWGHONeeded) {
        toast.error("Insufficient GHO balance");
        throw new Error("Insufficient GHO balance");
      }

      // Wrap the required amount of GHO
      const toastId = toast.loading("Wrapping GHO...");
      try {
        const wrapHash = await walletClient.writeContract({
          address: WGHO_CONTRACT_ADDRESS,
          abi: WGHO_ABI,
          functionName: "deposit",
          args: [],
          value: additionalWGHONeeded,
        });

        await _publicClient.waitForTransactionReceipt({ hash: wrapHash });
        toast.success("Wrapped GHO", { id: toastId });
      } catch (error) {
        toast.error("Failed to wrap GHO", { id: toastId });
        throw error;
      }

      // Now swap the WGHO to BONSAI
      const swapToastId = toast.loading("Swapping WGHO to BONSAI...");
      try {
        await swapGhoForBonsai(
          walletClient,
          parseUnits(selectedOption.bonsai.toString(), DECIMALS),
          address,
          requiredWgho,
        );
        toast.success("Swapped WGHO to BONSAI", { id: swapToastId });
      } catch (error) {
        toast.error("Failed to swap WGHO to BONSAI", { id: swapToastId });
        throw error;
      }
    }

    const amountToTransfer = parseUnits(selectedOption.bonsai.toString(), DECIMALS);
    const transferToastId = toast.loading(`Transferring ${formatEther(amountToTransfer)} $BONSAI to Lens account...`);

    const transferResult = await walletClient.writeContract({
      address: PROTOCOL_DEPLOYMENT.lens.Bonsai,
      abi: erc20Abi,
      functionName: "transfer",
      args: [authenticatedProfile?.address as `0x${string}`, amountToTransfer],
      chain: getChain("lens"),
    });

    if (!transferResult) {
      toast.error("Failed to transfer BONSAI tokens to lens account", { id: transferToastId });
      throw new Error("Failed to transfer BONSAI tokens to lens account");
    }

    await _publicClient.waitForTransactionReceipt({ hash: transferResult });
    toast.success("BONSAI tokens transferred to lens account", { id: transferToastId });
  };

  const hasSufficientGho = useMemo(() => {
    if (!selectedOption || !totalGhoBalance) return false;
    return totalGhoBalance >= selectedOption.ghoRequired;
  }, [selectedOption, totalGhoBalance]);

  return (
    <div
      className="p-4 space-y-4 min-w-[600px] text-white"
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <div className="flex items-center justify-between">
        <Dialog.Title as="h2" className="text-2xl font-bold">
          Buy $BONSAI
        </Dialog.Title>
      </div>

      <div className="text-gray-400">
        <p>Bonsai tokens are used to collect content and participate in the app.</p>
        <p>Purchased Bonsai will be deposited in your Lens account wallet.</p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
        <div className="space-y-1">
          <div className="text-sm text-gray-400">Lens Account Balance</div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4">
              <Image src="/bonsai.png" alt="BONSAI" width={16} height={16} />
            </div>
            <div className="font-semibold">{formattedBonsaiBalance} $BONSAI</div>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-sm text-gray-400">Available GHO (connected wallet)</div>
          <div className="font-semibold">{formattedGhoBalance} GHO</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {topUpOptions.map((option, index) => (
          <button
            key={index}
            onClick={() => setSelectedOption(option)}
            className={clsx(
              "relative p-3 rounded-xl border transition-colors",
              "flex flex-col items-center justify-center text-center group",
              "focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2]",
              selectedOption === option
                ? "border-[#0891B2] bg-[#0891B2]/10"
                : "border-gray-700/50 bg-gray-800/50 hover:border-[#0891B2]/50",
            )}
          >
            <div className="w-12 h-12 mb-2 relative">
              <Image
                src="/static/images/logo.png"
                alt="BONSAI"
                width={48}
                height={48}
                className={clsx(
                  "transition-all duration-200 rounded-full",
                  option === selectedOption
                    ? "brightness-125 scale-110"
                    : option.highlight
                    ? "brightness-110 scale-105"
                    : "brightness-75 group-hover:brightness-100",
                )}
              />
              {option.highlight && (
                <div className="absolute inset-0 rounded-full animate-pulse bg-gradient-to-br from-[#0891B2]/20 to-transparent -z-10" />
              )}
            </div>
            <div className="text-xl font-bold">{option.bonsai.toLocaleString()}</div>
            <div className="text-gray-400 text-sm">${option.price.toFixed(2)}</div>
          </button>
        ))}
      </div>

      <Button
        variant="blue"
        className={clsx("w-full py-3 text-base font-semibold")}
        onClick={topUp}
        disabled={!selectedOption || !hasSufficientGho}
      >
        {!selectedOption
          ? "Select an amount"
          : !hasSufficientGho
          ? "Insufficient GHO"
          : `Pay ${selectedOption.price} GHO`}
      </Button>
      <a
        href="https://app.across.to/bridge?fromChain=8453&toChain=232&outputToken=0x0000000000000000000000000000000000000000"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full"
      >
        <Button variant="primary" size="md" className="mt-4 w-full flex items-center justify-center gap-2">
          <img src="/gho.webp" alt="gho" className="w-5 h-5" />
          Bridge GHO to Lens
        </Button>
      </a>
    </div>
  );
};
