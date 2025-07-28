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
  originalPrice?: number;
  ghoRequired: bigint;
  usdcRequired: bigint;
  highlight?: boolean;
  isMaxMode?: boolean;
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
  const { isMiniApp, context } = useIsMiniApp();

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
      const originalPrice = (3 * credit) / 200;
      const isMaxMode = index >= 2; // Last two options
      const price = (isMaxMode ? (2.5 * credit) / 200 : originalPrice) - 0.01;
      const ghoRequired = parseUnits(price.toString(), 18);
      const usdcRequired = parseUnits(price.toString(), USDC_DECIMALS);
      return {
        credits: credit,
        price,
        originalPrice: isMaxMode ? originalPrice - 0.01 : undefined,
        ghoRequired,
        usdcRequired,
        isMaxMode,
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
        fid: isMiniApp ? context?.user?.fid : undefined,
        txHash,
        chain: isMiniApp ? "base" : "lens",
        price: selectedOption?.isMaxMode ? 200 / 2.5 : 200 / 3, // Credits per dollar ratio
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
          className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 w-full max-w-2xl text-white"
          style={{
            fontFamily: brandFont.style.fontFamily,
          }}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title as="h2" className="text-lg sm:text-xl md:text-2xl font-bold">
              {customHeader || "Buy API Credits"}
            </Dialog.Title>
          </div>

          <div className="text-gray-400 text-sm md:text-base">
            <p>
              {customSubheader ||
                "Generate smart media using our genAI studio. Credits purchased will be saved to your account balance."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 gap-2 sm:gap-3">
            <div className="space-y-1">
              <div className="text-xs sm:text-sm text-gray-400">Current Balance</div>
              <div className="text-base sm:text-lg md:text-xl font-bold">
                {creditBalance?.creditsRemaining || 0} credits
              </div>
            </div>
            <div className="space-y-1 sm:text-right">
              <div className="text-xs sm:text-sm text-gray-400">Available {isMiniApp ? "USDC" : "GHO"}</div>
              <div className="text-sm sm:text-base font-semibold">
                {isMiniApp ? formattedUsdcBalance : formattedGhoBalance} {isMiniApp ? "USDC" : "GHO"}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-4 md:gap-6">
            {topUpOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedOption(option)}
                className={clsx(
                  "relative rounded-xl transition-all duration-300",
                  "flex flex-row sm:flex-col items-center justify-between sm:justify-center text-center group",
                  "focus:outline-none focus:ring-1 focus:ring-[#0891B2]",
                  "text-white",
                  // Max Mode styling
                  option.isMaxMode
                    ? [
                        "p-[2px] shining-border hover:scale-105 transform-gpu",
                        index === 2
                          ? "border-2 border-slate-400" // Silver border for third option
                          : "border-2 border-yellow-400", // Gold border for fourth option
                        selectedOption === option
                          ? index === 2
                            ? "bg-gradient-to-br from-slate-400/20 to-slate-600/20 shadow-lg shadow-slate-400/20" // Silver bg when selected
                            : "bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 shadow-lg shadow-yellow-400/20" // Gold bg when selected
                          : "bg-gray-800/50",
                      ]
                    : [
                        // Regular styling
                        "border border-white/40 hover:border-white p-2 sm:p-3 hover:scale-[1.02]",
                        selectedOption === option ? "border-[#0891B2] bg-[#0891B2]/10" : "bg-gray-800/50",
                      ],
                )}
              >
                {option.isMaxMode && (
                  <div
                    className={clsx(
                      "absolute -top-6 left-4 text-black px-3 py-1 rounded-t-lg rounded-b-none text-xs font-medium z-10 shadow-lg",
                      index === 2
                        ? "bg-gradient-to-r from-slate-400 to-slate-500" // Silver gradient for third option
                        : "bg-gradient-to-r from-yellow-400 to-yellow-500", // Gold gradient for fourth option
                    )}
                  >
                    MAX Mode
                  </div>
                )}
                <div className={clsx("flex items-center gap-2 sm:flex-col", option.isMaxMode ? "p-2 sm:p-3" : "")}>
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
                  <div className="text-base sm:text-lg md:text-xl font-bold">{option.credits.toLocaleString()}</div>
                  <div className="text-xs sm:text-sm flex items-center gap-2 -mt-1">
                    {option.originalPrice && (
                      <div className="text-gray-400 line-through">${option.originalPrice.toFixed(2)}</div>
                    )}
                    <div className={clsx(option.isMaxMode ? "text-brand-highlight font-semibold" : "text-gray-400")}>
                      ${option.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Button
              variant="blue"
              className={clsx("w-full py-2 sm:py-3 text-sm sm:text-base font-semibold")}
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
              size="md"
              className="w-full !border-none text-sm sm:text-base"
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
