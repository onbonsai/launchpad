import { useEffect, useMemo, useState } from "react";
import { Button } from "@src/components/Button";
import { brandFont } from "@src/fonts/fonts";
import clsx from "clsx";
import { useAccount, useBalance, useWalletClient } from "wagmi";
import { erc20Abi, formatUnits, parseUnits, encodeAbiParameters, zeroAddress } from "viem";
import { toast } from "react-hot-toast";
import {
  ADMIN_WALLET,
  USDC_CONTRACT_ADDRESS,
  USDC_DECIMALS,
  WGHO_CONTRACT_ADDRESS,
  WGHO_ABI,
  approveToken,
  SWAP_TO_BONSAI_POST_ID,
  DECIMALS,
  getRegisteredClubByTokenAddress,
  buyChips,
  getBuyAmount,
} from "@src/services/madfi/moneyClubs";
import { base } from "viem/chains";
import { switchChain } from "viem/actions";
import {
  ACTION_HUB_ADDRESS,
  LENS_BONSAI_DEFAULT_FEED,
  LENS_CHAIN_ID,
  LENS_GLOBAL_FEED,
  PROTOCOL_DEPLOYMENT,
} from "@src/services/madfi/utils";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import axios from "axios";
import ActionHubAbi from "@src/services/madfi/abi/ActionHub.json";
import {
  calculatePath,
  PARAM__AMOUNT_IN,
  PARAM__AMOUNT_OUT_MINIMUM,
  PARAM__CLIENT_ADDRESS,
  PARAM__PATH,
  PARAM__REFERRALS,
} from "@src/services/lens/rewardSwap";
import { sdk } from "@farcaster/frame-sdk";
import { getPostId } from "@src/services/lens/getStats";
import BuyUSDCWidget from "@pagesComponents/Club/BuyUSDCWidget";

interface SwapToGenerateModalProps {
  open: boolean;
  onClose: () => void;
  token: {
    symbol: string;
    address: string;
    chain: string;
  };
  postId: string;
  creditsNeeded: number;
  onSuccess: () => void;
}

const CREDIT_PRICE = 0.01; // $0.01 per credit since we're swapping
const SWAP_AMOUNTS = [2, 5, 15, 50];

export const SwapToGenerateModal = ({
  open,
  onClose,
  token,
  postId,
  creditsNeeded,
  onSuccess,
}: SwapToGenerateModalProps) => {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(5);
  const [rememberSelection, setRememberSelection] = useState(false);
  const [buyUSDCModalOpen, setBuyUSDCModalOpen] = useState(false);
  const { isMiniApp } = useIsMiniApp();

  // Load remembered selection
  useEffect(() => {
    const remembered = localStorage.getItem("swapToGenerateAmount");
    if (remembered) {
      setSelectedAmount(Number(remembered));
      setRememberSelection(true);
    }
  }, []);

  // USDC Balance for Base
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_CONTRACT_ADDRESS,
    chainId: base.id,
    query: {
      enabled: isConnected && isMiniApp,
    },
  });

  // GHO Balance for Lens
  const { data: ghoBalance } = useBalance({
    address,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: isConnected && !isMiniApp,
    },
  });

  // WGHO Balance for Lens
  const { data: wghoBalance } = useBalance({
    address,
    token: WGHO_CONTRACT_ADDRESS,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: isConnected && !isMiniApp,
    },
  });

  const totalGhoBalance = (ghoBalance?.value || 0n) + (wghoBalance?.value || 0n);
  const formattedGhoBalance = Number(formatUnits(totalGhoBalance, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  const formattedUsdcBalance = Number(formatUnits(usdcBalance?.value || 0n, USDC_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  const generationFee = useMemo(() => {
    return Math.ceil(creditsNeeded * CREDIT_PRICE * 100) / 100; // Round up to nearest cent
  }, [creditsNeeded]);

  const totalCost = useMemo(() => {
    if (!selectedAmount) return 0;
    return selectedAmount + generationFee;
  }, [selectedAmount, generationFee]);

  const hasSufficientFunds = useMemo(() => {
    if (!selectedAmount) return false;
    if (isMiniApp) {
      return (usdcBalance?.value || 0n) >= parseUnits(totalCost.toString(), USDC_DECIMALS);
    }
    return totalGhoBalance >= parseUnits(totalCost.toString(), 18);
  }, [selectedAmount, totalCost, usdcBalance, totalGhoBalance, isMiniApp]);

  const handleSwap = async () => {
    if (!walletClient || !address || !selectedAmount) {
      toast.error("Missing required data");
      return;
    }

    if (isMiniApp || token.chain === "base") {
      if (chain?.id !== base.id) {
        try {
          await switchChain(walletClient, { id: base.id });
          return;
        } catch {
          toast.error("Please switch to Base chain");
          return;
        }
      }
    } else if (token.chain === "lens") {
      if (chain?.id !== LENS_CHAIN_ID) {
        try {
          await switchChain(walletClient, { id: LENS_CHAIN_ID });
          return;
        } catch {
          toast.error("Please switch to Lens chain");
          return;
        }
      }
    }

    if (rememberSelection) {
      localStorage.setItem("swapToGenerateAmount", selectedAmount.toString());
    } else {
      localStorage.removeItem("swapToGenerateAmount");
    }

    let toastId = toast.loading("Processing swap and credits...");

    let transferTx = "";

    try {
      const club = await getRegisteredClubByTokenAddress(token.address as `0x${string}`, token.chain);

      // Lens specific logic: ensure enough WGHO, approve, and swap through reward swap then pay for credits
      if (token.chain === "lens") {
        // Make sure we have enough WGHO
        const requiredWgho = parseUnits(totalCost.toString(), 18);
        const enoughWgho = wghoBalance?.value && wghoBalance.value >= requiredWgho;
        if (!enoughWgho) {
          const additionalWGHONeeded = requiredWgho - (wghoBalance?.value || 0n);
          await walletClient!.writeContract({
            address: WGHO_CONTRACT_ADDRESS,
            abi: WGHO_ABI,
            functionName: "deposit",
            args: [],
            value: additionalWGHONeeded,
          });
        }

        await approveToken(
          WGHO_CONTRACT_ADDRESS,
          requiredWgho,
          walletClient,
          toastId,
          undefined,
          token.chain,
          PROTOCOL_DEPLOYMENT.lens.RewardSwap,
        );

        // NOTE: this may fail for lens tokens that haven't graduated where no reward pool is set because they won't have clubid
        await walletClient!.writeContract({
          address: ACTION_HUB_ADDRESS,
          abi: ActionHubAbi,
          functionName: "executePostAction",
          args: [
            PROTOCOL_DEPLOYMENT.lens.RewardSwap,
            // if output is Bonsai, use the global feed, since its a specific post
            token.address == PROTOCOL_DEPLOYMENT.lens.Bonsai ? LENS_GLOBAL_FEED : LENS_BONSAI_DEFAULT_FEED,
            postId ? await getPostId(postId) : SWAP_TO_BONSAI_POST_ID,
            [
              { key: PARAM__PATH, value: encodeAbiParameters([{ type: "bytes" }], [calculatePath(token.address)]) },
              {
                key: PARAM__AMOUNT_IN,
                value: encodeAbiParameters([{ type: "uint256" }], [parseUnits(selectedAmount.toString(), DECIMALS)]),
              },
              {
                key: PARAM__AMOUNT_OUT_MINIMUM,
                value: encodeAbiParameters(
                  [{ type: "uint256" }],
                  [club.complete ? 0n : parseUnits(selectedAmount.toString(), DECIMALS)],
                ),
              },
              { key: PARAM__CLIENT_ADDRESS, value: encodeAbiParameters([{ type: "address" }], [zeroAddress]) },
              { key: PARAM__REFERRALS, value: encodeAbiParameters([{ type: "address[]" }], [[]]) },
            ],
          ],
        });

        const creditsAmount = parseUnits(generationFee.toString(), DECIMALS);
        transferTx = await walletClient.writeContract({
          address: WGHO_CONTRACT_ADDRESS,
          abi: erc20Abi,
          functionName: "transfer",
          args: [ADMIN_WALLET, creditsAmount],
        });
      } else {
        // swap USDC to token
        if (club && !club.complete && !club.liquidityReleasedAt) {
          // swap through launchpad
          const _selectedAmount = parseUnits(selectedAmount.toString(), USDC_DECIMALS);
          await approveToken(USDC_CONTRACT_ADDRESS, _selectedAmount, walletClient, toastId, undefined, "base");
          const { buyAmount } = await getBuyAmount(
            address as `0x${string}`,
            token.address as `0x${string}`,
            _selectedAmount.toString(),
          );
          toastId = toast.loading("Buying", { id: toastId });
          await buyChips(walletClient, club.clubId, buyAmount, _selectedAmount, zeroAddress, club.chain, zeroAddress);
        } else {
          if (isMiniApp) {
            await sdk.actions.swapToken({
              sellToken: `eip155:8453/erc20:${USDC_CONTRACT_ADDRESS}`,
              buyToken: `eip155:8453/erc20:${token.address}`,
              sellAmount: parseUnits(selectedAmount.toString(), USDC_DECIMALS).toString(),
            });
          } else {
            toast.error("Swapping on Base is not supported on desktop, continuing to purchase credits");
          }
        }

        // then pay for the credits
        const creditsAmount = parseUnits(generationFee.toString(), USDC_DECIMALS);
        transferTx = await walletClient.writeContract({
          address: USDC_CONTRACT_ADDRESS,
          abi: erc20Abi,
          functionName: "transfer",
          args: [ADMIN_WALLET, creditsAmount],
        });
      }
    } catch (error) {
      console.error("Error processing swap:", error);
      toast.error("Failed to complete transaction", { id: toastId });
      return;
    }

    // then update the credits
    try {
      const response = await axios.post("/api/credits/purchase", {
        txHash: transferTx,
        chain: token.chain,
        price: 100, // 100 credits for 1$
      });

      if (response.status !== 200) {
        throw new Error("Failed to update credits");
      }
    } catch (error) {
      console.error("Error updating credits:", error);
      toast.error("Failed to update credits", { id: toastId });
      return;
    }

    toast.success("Successfully swapped and purchased credits!", { id: toastId });

    onSuccess();
    onClose();
  };

  return (
    <div
      className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 w-full text-white"
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <div>
        <h2 className="text-xl font-bold">Swap to continue</h2>
        <p className="text-sm text-gray-400 mt-1">
          Buy any amount of ${token.symbol} to continue. Coins are fully yours.
        </p>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Your {isMiniApp ? "USDC" : "GHO"} balance</span>
          <span className="text-sm font-semibold">
            {isMiniApp ? `${formattedUsdcBalance} USDC` : `${formattedGhoBalance} GHO`}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-400 mb-3">Select amount to swap</p>
        <div className="grid grid-cols-4 gap-2">
          {SWAP_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => setSelectedAmount(amount)}
              className={clsx(
                "py-3 px-4 rounded-lg font-semibold transition-all",
                "border focus:outline-none focus:ring-2 focus:ring-[#5be39d]",
                selectedAmount === amount
                  ? "bg-[#5be39d] border-[#5be39d] text-black"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600",
              )}
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="remember"
          checked={rememberSelection}
          onChange={(e) => setRememberSelection(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-[#5be39d] focus:ring-[#5be39d] focus:ring-offset-0"
        />
        <label htmlFor="remember" className="text-sm text-gray-400">
          Remember my selection
        </label>
      </div>

      <p className="text-xs text-gray-500">
        Includes ${generationFee.toFixed(2)} generation fee ({creditsNeeded.toFixed(2)} credits)
      </p>

      <Button
        variant="accentBrand"
        onClick={handleSwap}
        disabled={!selectedAmount || !hasSufficientFunds}
        className={clsx("w-full py-3 text-base font-semibold")}
      >
        {!selectedAmount
          ? "Select amount"
          : chain?.id !== (isMiniApp ? base.id : LENS_CHAIN_ID)
          ? `Switch to ${isMiniApp ? "Base" : "Lens"}`
          : !hasSufficientFunds
          ? `Insufficient ${isMiniApp ? "USDC" : "GHO"}`
          : `Swap $${totalCost.toFixed(2)}`}
      </Button>
      <Button
        variant={"primary"}
        size="md"
        className="w-full !border-none"
        onClick={() => {
          setBuyUSDCModalOpen(true);
        }}
      >
        Fund wallet
      </Button>
      <BuyUSDCWidget
        open={buyUSDCModalOpen}
        buyAmount={totalCost.toString()}
        onClose={() => {
          setBuyUSDCModalOpen(false);
        }}
        chain={"lens"}
      />
    </div>
  );
};
