import { useMemo, useState } from "react";
import { Button } from "@src/components/Button";
import { Dialog } from "@headlessui/react";
import { brandFont } from "@src/fonts/fonts";
import clsx from "clsx";
import { useAccount, useBalance, useReadContract, useWalletClient } from "wagmi";
import { LENS_CHAIN_ID } from "@src/services/madfi/utils";
import { base } from "viem/chains";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { toast } from "react-hot-toast";
import { useGetCredits } from "@src/hooks/useGetCredits";
import { ADMIN_WALLET, publicClient, WGHO_CONTRACT_ADDRESS, WGHO_ABI, USDC_CONTRACT_ADDRESS, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { CreditCardIcon } from "@heroicons/react/outline";
import BuyUSDCWidget from "@pagesComponents/Club/BuyUSDCWidget";
import { switchChain } from "viem/actions";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import axios from "axios";

interface TopUpOption {
  credits: number;
  price: number;
  ghoRequired: bigint;
  usdcRequired: bigint;
  highlight?: boolean;
}

interface ApiCreditsModalProps {
  customHeader?: string;
  customSubheader?: string;
}

export const ApiCreditsModal = ({ customHeader, customSubheader }: ApiCreditsModalProps) => {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [selectedOption, setSelectedOption] = useState<TopUpOption | null>(null);
  const [buyUSDCModalOpen, setBuyUSDCModalOpen] = useState(false);
  const { data: creditBalance, refetch: refetchCredits } = useGetCredits(address as string, isConnected);
  const { isMiniApp } = useIsMiniApp();

  // GHO Balance
  const { data: ghoBalance } = useBalance({
    address,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: isConnected && !isMiniApp,
    },
  });

  // WGHO Balance
  const { data: wghoBalance } = useReadContract({
    address: WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: LENS_CHAIN_ID,
    functionName: "balanceOf",
    args: [address!],
    query: {
      enabled: isConnected && !isMiniApp,
    },
  });

  // USDC Balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: base.id,
    functionName: "balanceOf",
    args: [address!],
    query: {
      enabled: isConnected && isMiniApp,
    },
  });

  const totalGhoBalance = (ghoBalance?.value || 0n) + (wghoBalance || 0n);
  const formattedGhoBalance = Number(formatUnits(totalGhoBalance, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  const formattedUsdcBalance = Number(formatUnits(usdcBalance || 0n, USDC_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  const topUpOptions: TopUpOption[] = useMemo(() => {
    const credits = [500, 1000, 3000, 10000];
    return credits.map((credit, index) => {
      const price = (3 * credit) / 200;
      const ghoRequired = parseUnits(price.toString(), 18);
      const usdcRequired = parseUnits(price.toString(), USDC_DECIMALS);
      return {
        credits: credit,
        price,
        ghoRequired,
        usdcRequired,
      };
    });
  }, []);

  const hasSufficientFunds = useMemo(() => {
    if (!selectedOption) return false;
    if (isMiniApp) {
      return (usdcBalance || 0n) >= selectedOption.usdcRequired;
    }
    return totalGhoBalance >= selectedOption.ghoRequired;
  }, [selectedOption, totalGhoBalance, usdcBalance, isMiniApp]);

  const topUp = async () => {
    if (!walletClient || !address) {
      toast.error("No wallet client or address found");
      return;
    }
    if (!selectedOption) {
      toast.error("No selected option");
      return;
    }

    if (isMiniApp) {
      if (chain?.id !== base.id && walletClient) {
        try {
          await switchChain(walletClient, { id: base.id });
          return;
        } catch {
          toast.error("Please switch to Base chain");
          return;
        }
      }
    } else {
      if (chain?.id !== LENS_CHAIN_ID && walletClient) {
        try {
          await switchChain(walletClient, { id: LENS_CHAIN_ID });
          return;
        } catch {
          toast.error("Please switch to Lens chain");
          return;
        }
      }
    }

    let toastId = toast.loading("Purchasing credits...");

    try {
      if (isMiniApp) {
        // Handle USDC payment on Base
        if (usdcBalance && usdcBalance >= selectedOption.usdcRequired) {
          try {
            const tx = await walletClient.writeContract({
              address: USDC_CONTRACT_ADDRESS,
              abi: erc20Abi,
              functionName: "transfer",
              args: [ADMIN_WALLET, selectedOption.usdcRequired],
            });

            await updateCredits(tx);
            toast.success("Successfully purchased API credits!", { id: toastId });
          } catch {
            toast.error("Failed to purchase credits", { id: toastId });
          }
        } else {
          toast.error("Insufficient USDC balance", { id: toastId });
        }
      } else {
        // Handle GHO payment on Lens
        const _publicClient = publicClient("lens");
        const requiredWgho = selectedOption.ghoRequired;

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
          const additionalWghoNeeded = requiredWgho - (wghoBalance || 0n);

          if (ghoBalance && ghoBalance.value >= additionalWghoNeeded) {
            try {
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
      }
    } catch (error) {
      console.error("Error purchasing credits:", error);
      toast.error("Failed to purchase credits", { id: toastId });
    }
  };

  const updateCredits = async (txHash: `0x${string}`) => {
    try {
      const response = await axios.post("/api/credits/purchase", {
        txHash,
        chain: isMiniApp ? "base" : "lens",
      });

      if (response.status !== 200) {
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
          {customHeader || "Buy API Credits"}
        </Dialog.Title>
      </div>

      <div className="text-gray-400">
        <p>{customSubheader || "Generate stunning media using AI models. Credits purchased will be saved to your account balance."}</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between p-2 sm:p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 gap-2 sm:gap-3 md:gap-0">
        <div className="space-y-1">
          <div className="text-xs sm:text-sm text-gray-400">Current Balance</div>
          <div className="text-base sm:text-lg md:text-xl font-bold">{creditBalance?.creditsRemaining || 0} credits</div>
        </div>
        <div className="space-y-1 md:text-right">
          <div className="text-xs sm:text-sm text-gray-400">Available {isMiniApp ? "USDC" : "GHO"}</div>
          <div className="text-sm sm:text-base font-semibold">{isMiniApp ? formattedUsdcBalance : formattedGhoBalance} {isMiniApp ? "USDC" : "GHO"}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
        {topUpOptions.map((option, index) => (
          <button
            key={index}
            onClick={() => setSelectedOption(option)}
            className={clsx(
              "relative p-2 sm:p-3 rounded-xl border transition-colors",
              "flex flex-row md:flex-col items-center justify-between md:justify-center text-center group",
              "focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2]",
              "text-white border-white/80 hover:border-white",
              selectedOption === option ? "border-[#0891B2] bg-[#0891B2]/10" : "bg-gray-800/50",
            )}
          >
            <div className="flex items-center gap-2 md:flex-col">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 relative">
                <CreditCardIcon
                  className={clsx(
                    "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-all duration-200",
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
              <div className="text-left md:text-center">
                <div className="text-base sm:text-lg md:text-xl font-bold">{option.credits.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-gray-400">${option.price.toFixed(2)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Button
          variant="blue"
          className={clsx("w-full py-2 text-xs sm:text-sm md:text-base font-semibold")}
          onClick={topUp}
          disabled={!selectedOption || !hasSufficientFunds}
        >
          {!selectedOption
            ? "Select an amount"
            : chain?.id !== (isMiniApp ? base.id : LENS_CHAIN_ID)
            ? `Switch to ${isMiniApp ? "Base" : "Lens"} Chain`
            : !hasSufficientFunds
            ? `Insufficient ${isMiniApp ? "USDC" : "GHO"}`
            : `Pay ${selectedOption.price} ${isMiniApp ? "USDC" : "GHO"}`}
        </Button>
        <Button
          variant={"primary"}
          size='md'
          className="w-full !border-none text-xs sm:text-sm md:text-base"
          onClick={() => {
            setBuyUSDCModalOpen(true);
          }}
        >
          Fund wallet
        </Button>
      </div>
      <BuyUSDCWidget
        open={buyUSDCModalOpen}
        buyAmount={selectedOption?.price.toString() || "20"}
        onClose={() => {
          setBuyUSDCModalOpen(false);
        }}
        chain={isMiniApp ? "base" : "lens"}
      />
    </div>
  );
};
