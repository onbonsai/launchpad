import { useMemo, useState } from "react";
import { Button } from "@src/components/Button";
import { Dialog } from "@headlessui/react";
import { brandFont } from "@src/fonts/fonts";
import clsx from "clsx";
import { useAccount, useBalance, useReadContract, useWalletClient } from "wagmi";
import { LENS_CHAIN_ID } from "@src/services/madfi/utils";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { toast } from "react-hot-toast";
import { useGetCredits } from "@src/hooks/useGetCredits";
import { ADMIN_WALLET, publicClient, WGHO_CONTRACT_ADDRESS, WGHO_ABI } from "@src/services/madfi/moneyClubs";
import { CreditCardIcon } from "@heroicons/react/outline";
import BuyUSDCWidget from "@pagesComponents/Club/BuyUSDCWidget";
import { switchChain } from "viem/actions";

interface TopUpOption {
  credits: number;
  price: number;
  ghoRequired: bigint;
  highlight?: boolean;
}

export const ApiCreditsModal = () => {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [selectedOption, setSelectedOption] = useState<TopUpOption | null>(null);
  const [buyUSDCModalOpen, setBuyUSDCModalOpen] = useState(false);
  const { data: creditBalance, refetch: refetchCredits } = useGetCredits(address as string, isConnected);

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

  const totalGhoBalance = (ghoBalance?.value || 0n) + (wghoBalance || 0n);
  const formattedGhoBalance = Number(formatUnits(totalGhoBalance, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  const topUpOptions: TopUpOption[] = useMemo(() => {
    const credits = [100, 350, 750, 2500];
    return credits.map((credit, index) => {
      const price = (3 * credit) / 200;
      const ghoRequired = parseUnits(price.toString(), 18);
      return {
        credits: credit,
        price,
        ghoRequired,
      };
    });
  }, []);

  const hasSufficientGho = useMemo(() => {
    if (!selectedOption || !totalGhoBalance) return false;
    return totalGhoBalance >= selectedOption.ghoRequired;
  }, [selectedOption, totalGhoBalance]);

  const topUp = async () => {
    if (!walletClient || !address) {
      toast.error("No wallet client or address found");
      return;
    }
    if (!selectedOption) {
      toast.error("No selected option");
      return;
    }
    if (chain?.id !== LENS_CHAIN_ID && walletClient) {
      try {
        await switchChain(walletClient, { id: LENS_CHAIN_ID });
        // toast("Please re-connect your wallet");
        // setOpen(true);
        return;
      } catch {
        toast.error("Please switch chains");
        return;
      }
    }
    let toastId = toast.loading("Purchasing credits...");

    try {
      const _publicClient = publicClient("lens");
      const requiredWgho = selectedOption.ghoRequired;

      // If we have enough WGHO, just transfer it
      if (wghoBalance && wghoBalance >= requiredWgho) {
        try {
          const tx = await walletClient.writeContract({
            address: WGHO_CONTRACT_ADDRESS,
            abi: erc20Abi,
            functionName: "transfer",
            args: [ADMIN_WALLET, requiredWgho],
          });

          await updateCredits(tx);
          toast.success("Successfully purchased API credits!", { id: toastId });
        } catch {
          toast.error("Failed to purchase credits", { id: toastId });
        }
      } else {
        // We need to wrap some GHO first
        const additionalWghoNeeded = requiredWgho - (wghoBalance || 0n);

        if (ghoBalance && ghoBalance.value >= additionalWghoNeeded) {
          try {
            // Wrap the required amount of GHO
            const wrapTx = await walletClient.writeContract({
              address: WGHO_CONTRACT_ADDRESS,
              abi: WGHO_ABI,
              functionName: "deposit",
              args: [],
              value: additionalWghoNeeded,
            });

            const wrapReceipt = await _publicClient.waitForTransactionReceipt({ hash: wrapTx });
            if (wrapReceipt.status !== "success") {
              throw new Error("Failed to wrap GHO");
            }

            // Now transfer the total amount
            const transferTx = await walletClient.writeContract({
              address: WGHO_CONTRACT_ADDRESS,
              abi: erc20Abi,
              functionName: "transfer",
              args: [ADMIN_WALLET, requiredWgho],
            });

            await updateCredits(transferTx);
            toast.success("Successfully purchased API credits!", { id: toastId });
          } catch {
            toast.error("Failed to purchase credits", { id: toastId });
          }
        } else {
          toast.error("Insufficient GHO balance", { id: toastId });
        }
      }
    } catch (error) {
      console.error("Error purchasing credits:", error);
      toast.error("Failed to purchase credits", { id: toastId });
    }
  };

  const updateCredits = async (txHash: `0x${string}`) => {
    try {
      const response = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txHash,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update credits");
      }

      refetchCredits();
    } catch (error) {
      console.error("Error updating credits:", error);
    }
  };

  return (
    <div
      className="p-4 space-y-4 min-w-[600px] text-white"
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <div className="flex items-center justify-between">
        <Dialog.Title as="h2" className="text-2xl font-bold">
          Buy AI Credits
        </Dialog.Title>
      </div>

      <div className="text-gray-400">
        <p>AI credits are used to make requests to our generative AI services.</p>
        <p>Purchased credits are one time use and will not refresh. 1.5 cents per credit.</p>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
        <div className="space-y-1">
          <div className="text-sm text-gray-400">Current Balance</div>
          <div className="text-xl font-bold">{creditBalance?.creditsRemaining || 0} credits</div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-sm text-gray-400">Available GHO</div>
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
              "text-white border-white/80 hover:border-white",
              selectedOption === option ? "border-[#0891B2] bg-[#0891B2]/10" : "bg-gray-800/50",
            )}
          >
            <div className="w-12 h-12 mb-2 relative">
              <CreditCardIcon
                className={clsx(
                  "w-12 h-12 transition-all duration-200",
                  selectedOption === option
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
            <div className="text-xl font-bold">{option.credits.toLocaleString()}</div>
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
          : chain?.id !== LENS_CHAIN_ID
          ? "Switch to Lens Chain"
          : !hasSufficientGho
          ? "Insufficient GHO"
          : `Pay ${selectedOption.price} GHO`}
      </Button>
      <Button
        variant={"primary"}
        size='md'
        className="w-full !border-none"
        onClick={() => {
          setBuyUSDCModalOpen(true);
        }}
      >
        Fund wallet
      </Button>
      <BuyUSDCWidget
        open={buyUSDCModalOpen}
        buyAmount={selectedOption?.price.toString() || "20"}
        onClose={() => {
          setBuyUSDCModalOpen(false);
        }}
        chain={"lens"}
      />
    </div>
  );
};
