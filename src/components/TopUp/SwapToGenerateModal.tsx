import { useEffect, useMemo, useState } from "react";
import { Button } from "@src/components/Button";
import { brandFont } from "@src/fonts/fonts";
import clsx from "clsx";
import { useAccount, useBalance, useWalletClient } from "wagmi";
import { erc20Abi, formatUnits, parseUnits, encodeAbiParameters, zeroAddress, type SendCallsParameters } from "viem";
import { toast } from "react-hot-toast";
import {
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
  publicClient,
} from "@src/services/madfi/moneyClubs";
import { base } from "viem/chains";
import { switchChain } from "viem/actions";
import {
  ACTION_HUB_ADDRESS,
  getChain,
  LENS_BONSAI_DEFAULT_FEED,
  LENS_CHAIN_ID,
  LENS_GLOBAL_FEED,
  PROTOCOL_DEPLOYMENT,
  getLaunchpadAddress,
} from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
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
import { getPostId } from "@src/services/lens/getStats";
import BuyUSDCWidget from "@pagesComponents/Club/BuyUSDCWidget";
import { base as baseChain } from "viem/chains";
import { maxUint256, concat, numberToHex, size } from "viem";
import { useGetCredits } from "@src/hooks/useGetCredits";

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
  refetchCredits?: () => void;
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
  refetchCredits,
  onSuccess,
}: SwapToGenerateModalProps) => {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isMiniApp, context } = useIsMiniApp();
  const { refetch: _refetchCredits } = useGetCredits(address as string, isConnected);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(5);
  const [rememberSelection, setRememberSelection] = useState(false);
  const [buyUSDCModalOpen, setBuyUSDCModalOpen] = useState(false);

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
    chainId: getChain("base").id,
    query: {
      enabled: isConnected && token.chain === "base",
    },
  });

  // GHO Balance for Lens
  const { data: ghoBalance } = useBalance({
    address,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: isConnected && token.chain === "lens",
    },
  });

  // WGHO Balance for Lens
  const { data: wghoBalance } = useBalance({
    address,
    token: WGHO_CONTRACT_ADDRESS,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: isConnected && token.chain === "lens",
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
    if (token.chain === "base") {
      return (usdcBalance?.value || 0n) >= parseUnits(totalCost.toString(), USDC_DECIMALS);
    }
    return totalGhoBalance >= parseUnits(totalCost.toString(), 18);
  }, [selectedAmount, totalCost, usdcBalance, totalGhoBalance, token.chain]);

  // Check if wallet supports sendCalls (EIP-5792)
  const checkWalletCapabilities = async () => {
    try {
      if (!walletClient) return null;

      const capabilities = await walletClient.getCapabilities({
        account: address as `0x${string}`,
      });

      // Check if Base chain (8453) supports sendCalls
      return (
        capabilities?.[baseChain.id]?.atomicBatch?.supported === true ||
        capabilities?.[baseChain.id]?.atomic.status === "ready" ||
        capabilities?.[baseChain.id]?.atomic.status === "supported"
      );
    } catch (error) {
      console.log("Wallet doesn't support getCapabilities or sendCalls");
      return false;
    }
  };

  const handleSwap = async () => {
    if (!walletClient || !address || !selectedAmount) {
      toast.error("Missing required data");
      return;
    }

    if (token.chain === "base") {
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

    let transferTx: any = {
      txHash: "",
      creditsAmount: "",
      user: address,
    };

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
            postId && token.address != PROTOCOL_DEPLOYMENT.lens.Bonsai
              ? await getPostId(postId)
              : SWAP_TO_BONSAI_POST_ID,
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
                  [club && !club.complete ? (105n * requiredWgho) / 100n : 0n],
                ),
              },
              { key: PARAM__CLIENT_ADDRESS, value: encodeAbiParameters([{ type: "address" }], [zeroAddress]) },
              { key: PARAM__REFERRALS, value: encodeAbiParameters([{ type: "address[]" }], [[]]) },
            ],
          ],
        });

        const creditsAmount = parseUnits(generationFee.toString(), DECIMALS);
        transferTx.txHash = await walletClient.writeContract({
          address: WGHO_CONTRACT_ADDRESS,
          abi: erc20Abi,
          functionName: "transfer",
          args: [PROTOCOL_DEPLOYMENT[token.chain].RevenueSplitter, creditsAmount],
        });
        transferTx.creditsAmount = Math.floor(generationFee * 100).toString();
      } else {
        let supportsBatchedCalls = await checkWalletCapabilities();
        const creditsAmount = parseUnits(generationFee.toString(), USDC_DECIMALS);
        const _selectedAmount = parseUnits(selectedAmount.toString(), USDC_DECIMALS);

        // swap USDC to token
        if (club && !club.complete && !club.liquidityReleasedAt) {
          console.log("launchpad club", club);
          // swap through launchpad
          const { buyAmount } = await getBuyAmount(
            address as `0x${string}`,
            token.address as `0x${string}`,
            selectedAmount.toString(),
            false,
            club.chain,
          );

          if (supportsBatchedCalls) {
            // Check current allowances to determine what needs approval
            const client = publicClient("base");

            const launchpadAddress = getLaunchpadAddress("BonsaiLaunchpad", club.clubId, club.chain);
            const launchpadAllowance = await client.readContract({
              address: USDC_CONTRACT_ADDRESS,
              abi: erc20Abi,
              functionName: "allowance",
              args: [address as `0x${string}`, launchpadAddress],
            });

            // Batch approve + buy + credit payment
            toast.loading("Processing launchpad purchase and credits in batch...", { id: toastId });

            const calls: any[] = [];

            // Add approval call if needed
            if (launchpadAllowance < _selectedAmount) {
              calls.push({
                to: USDC_CONTRACT_ADDRESS,
                abi: erc20Abi,
                functionName: "approve",
                args: [launchpadAddress, maxUint256],
              });
            }

            // Add buy chips call
            calls.push({
              to: launchpadAddress,
              abi: BonsaiLaunchpadAbi,
              functionName: "buyChips",
              args: [club.clubId, buyAmount, _selectedAmount, zeroAddress, address as `0x${string}`, zeroAddress],
            });

            // Add credit payment call
            calls.push({
              to: USDC_CONTRACT_ADDRESS,
              abi: erc20Abi,
              functionName: "transfer",
              args: [PROTOCOL_DEPLOYMENT[token.chain].RevenueSplitter, creditsAmount],
            });

            try {
              const result = await walletClient.sendCalls({
                account: address as `0x${string}`,
                calls,
                chain: baseChain,
                // @ts-ignore - experimental_fallback might not be in types yet
                experimental_fallback: true, // Allow fallback to sequential if sendCalls not supported
              });

              // Wait for the batch to complete
              if (result.id) {
                toast.loading("Waiting for batch transaction...", { id: toastId });

                // Poll for status
                let completed = false;
                let attempts = 0;

                while (!completed && attempts < 60) { // 60 attempts, ~1 minute timeout
                  try {
                    const status = await walletClient.getCallsStatus({
                      id: result.id,
                    });

                    // Check status - it might be 'success', 'CONFIRMED', etc. depending on wallet
                    const statusValue = (status.status || '').toString().toUpperCase();
                    if (statusValue === 'CONFIRMED' || statusValue === 'SUCCESS') {
                      completed = true;
                      toast.success("Purchase and credit payment completed!", { id: toastId });
                      // Set transferTx for the credit update later
                      transferTx.txHash = "batched";
                      transferTx.creditsAmount = Math.floor(generationFee * 100).toString();
                    } else if (statusValue === 'REVERTED' || statusValue === 'FAILURE' || statusValue === 'FAILED') {
                      throw new Error("Batch transaction reverted");
                    }
                  } catch (e) {
                    // If getCallsStatus is not supported, just wait a bit and assume success
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    completed = true;
                    transferTx.txHash = "batched";
                    transferTx.creditsAmount = Math.floor(generationFee * 100).toString();
                  }

                  attempts++;
                  if (!completed) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }

                if (!completed) {
                  throw new Error("Batch transaction timeout");
                }
              }
            } catch (batchError) {
              console.warn("Batch call failed, falling back to sequential:", batchError);
              // Fall back to sequential execution
              supportsBatchedCalls = false;
            }
          }

          if (!supportsBatchedCalls) {
            // Execute sequentially (original flow)
            await approveToken(USDC_CONTRACT_ADDRESS, _selectedAmount, walletClient, toastId, undefined, "base");
            toast.loading("Buying", { id: toastId });
            await buyChips(walletClient, club.clubId, buyAmount, _selectedAmount, zeroAddress, club.chain, zeroAddress);

            // Pay for credits after launchpad buy
            transferTx.txHash = await walletClient.writeContract({
              address: USDC_CONTRACT_ADDRESS,
              abi: erc20Abi,
              functionName: "transfer",
              args: [PROTOCOL_DEPLOYMENT[token.chain].RevenueSplitter, creditsAmount],
            });
            transferTx.creditsAmount = Math.floor(generationFee * 100).toString();
          }
        } else {
          // Execute Matcha swap
          toast.loading("Preparing swap...", { id: toastId });
          const sellAmountBigInt = parseUnits(selectedAmount.toString(), USDC_DECIMALS);
          const sellAmount = sellAmountBigInt.toString();

          // Get quote from Matcha
          const quoteResponse = await axios.post("/api/matcha/quote", {
            chainId: baseChain.id,
            sellToken: USDC_CONTRACT_ADDRESS,
            buyToken: token.address,
            sellAmount,
            taker: address,
          });

          const quote = quoteResponse.data;

          // Check if we need to approve based on the quote response
          const currentAllowance = BigInt(quote?.issues?.allowance?.actual || "0");
          const needsApproval = currentAllowance < sellAmountBigInt || !quote?.issues?.allowance;
          if (needsApproval && quote?.issues?.allowance?.spender) {
            toast.loading("Approving USDC...", { id: toastId });
            const approveTx = await walletClient.writeContract({
              address: USDC_CONTRACT_ADDRESS,
              abi: erc20Abi,
              functionName: "approve",
              args: [quote.issues.allowance.spender as `0x${string}`, maxUint256],
              chain: baseChain,
            });
            await publicClient("base").waitForTransactionReceipt({ hash: approveTx });
          }

          // Sign Permit2 if needed
          if (quote.permit2?.eip712) {
            toast.loading("Please sign the permit...", { id: toastId });
            // @ts-ignore
            const signature = await walletClient.signTypedData(quote.permit2.eip712);

            // Append signature length and signature data as per 0x docs
            // Format: <sig len><sig data> where sig len is 32-byte unsigned big-endian integer
            const signatureLengthInHex = numberToHex(size(signature), {
              signed: false,
              size: 32,
            });

            // Concatenate: original data + signature length + signature
            quote.transaction.data = concat([
              quote.transaction.data as `0x${string}`,
              signatureLengthInHex,
              signature,
            ]);
          }

          if (supportsBatchedCalls) {
            // Batch the swap and credit payment
            toast.loading("Processing swap and credits in batch...", { id: toastId });

            const calls: SendCallsParameters['calls'] = [
              // Matcha swap call
              {
                to: quote.transaction.to as `0x${string}`,
                data: quote.transaction.data as `0x${string}`,
                value: BigInt(quote.transaction.value || 0),
              },
              // Credit payment call
              {
                to: USDC_CONTRACT_ADDRESS,
                abi: erc20Abi,
                functionName: "transfer",
                args: [PROTOCOL_DEPLOYMENT[token.chain].RevenueSplitter, creditsAmount],
              }
            ];

            try {
              const result = await walletClient.sendCalls({
                account: address as `0x${string}`,
                calls,
                chain: baseChain,
                // @ts-ignore - experimental_fallback might not be in types yet
                experimental_fallback: true, // Allow fallback to sequential if sendCalls not supported
              });

              // Wait for the batch to complete
              if (result.id) {
                toast.loading("Waiting for batch transaction...", { id: toastId });

                // Poll for status (you might want to implement waitForCallsStatus if available)
                let completed = false;
                let attempts = 0;
                while (!completed && attempts < 60) { // 60 attempts, ~1 minute timeout
                  try {
                    const status = await walletClient.getCallsStatus({
                      id: result.id,
                    });

                    // Check status - it might be 'success', 'CONFIRMED', etc. depending on wallet
                    const statusValue = (status.status || '').toString().toUpperCase();
                    if (statusValue === 'CONFIRMED' || statusValue === 'SUCCESS') {
                      completed = true;
                      toast.success("Swap and credit payment completed!", { id: toastId });
                      // Set transferTx for the credit update later
                      transferTx.txHash = "batched";
                      transferTx.creditsAmount = Math.floor(generationFee * 100).toString();
                    } else if (statusValue === 'REVERTED' || statusValue === 'FAILURE' || statusValue === 'FAILED') {
                      throw new Error("Batch transaction reverted");
                    }
                  } catch (e) {
                    // If getCallsStatus is not supported, just wait a bit and assume success
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    completed = true;
                    transferTx.txHash = "batched";
                    transferTx.creditsAmount = Math.floor(generationFee * 100).toString();
                  }

                  attempts++;
                  if (!completed) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }

                if (!completed) {
                  throw new Error("Batch transaction timeout");
                }
              }
            } catch (batchError) {
              console.warn("Batch call failed, falling back to sequential:", batchError);
              // Fall back to sequential execution
              supportsBatchedCalls = false;
            }
          }

          if (!supportsBatchedCalls) {
            // Execute sequentially (original flow)
            toast.loading("Swapping...", { id: toastId });
            const hash = await walletClient.sendTransaction({
              to: quote.transaction.to,
              data: quote.transaction.data,
              value: BigInt(quote.transaction.value || 0),
              gas: BigInt(quote.transaction.gas),
              chain: baseChain,
            });

            await publicClient("base").waitForTransactionReceipt({ hash });
            toast.success("Swap completed!", { id: toastId });

            // Pay for the credits
            transferTx.txHash = await walletClient.writeContract({
              address: USDC_CONTRACT_ADDRESS,
              abi: erc20Abi,
              functionName: "transfer",
              args: [PROTOCOL_DEPLOYMENT[token.chain].RevenueSplitter, creditsAmount],
            });
            transferTx.creditsAmount = Math.floor(generationFee * 100).toString();
          }
        }
      }
    } catch (error) {
      console.error("Error processing swap:", error);
      toast.error("Failed to complete transaction", { id: toastId });
      return;
    }

    // then update the credits
    try {
      const response = await axios.post("/api/credits/purchase", {
        fid: isMiniApp ? context?.user?.fid : undefined,
        transferTx,
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
          <span className="text-sm text-gray-400">Your {token.chain === "base" ? "USDC" : "GHO"} balance</span>
          <span className="text-sm font-semibold">
            {token.chain === "base" ? `${formattedUsdcBalance} USDC` : `${formattedGhoBalance} GHO`}
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
          : chain?.id !== (token.chain === "base" ? base.id : LENS_CHAIN_ID)
          ? `Switch to ${token.chain === "base" ? "Base" : "Lens"}`
          : !hasSufficientFunds
          ? `Insufficient ${token.chain === "base" ? "USDC" : "GHO"}`
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
        chain={token.chain === "base" ? "base" : "lens"}
      />
    </div>
  );
};
