import { useState, useEffect } from "react";
import { useAccount, useWalletClient, useBalance, useReadContract } from "wagmi";
import { formatUnits, parseUnits, erc20Abi, Address, maxUint256, concat, numberToHex, size } from "viem";
import { base } from "viem/chains";
import toast from "react-hot-toast";
import axios from "axios";
import { Button } from "@src/components/Button";
import CurrencyInput from "@src/pagesComponents/Club/CurrencyInput";
import { ArrowDownIcon } from "@heroicons/react/outline";
import { USDC_CONTRACT_ADDRESS, USDC_DECIMALS, publicClient } from "@src/services/madfi/moneyClubs";
import { kFormatter, roundedToFixed } from "@src/utils/utils";

interface MatchaSwapWidgetProps {
  tokenAddress: Address;
  tokenSymbol: string;
  tokenImage: string;
  tokenDecimals: number;
  isBuying: boolean;
  onSuccess?: () => void;
  defaultAmount?: string;
}

interface PriceResponse {
  buyAmount: string;
  sellAmount: string;
  price: string;
  gasEstimate: string;
  estimatedGas: string;
  issues: {
    allowance: {
      actual: string;
      spender: string;
    };
  };
  permit2?: {
    eip712: {
      types: any;
      primaryType: string;
      domain: any;
      values: any;
    };
  };
}

interface QuoteResponse extends PriceResponse {
  transaction: {
    to: Address;
    data: string;
    value: string;
    gas: string;
  };
}

export const MatchaSwapWidget = ({
  tokenAddress,
  tokenSymbol,
  tokenImage,
  tokenDecimals,
  isBuying,
  onSuccess,
  defaultAmount = "",
}: MatchaSwapWidgetProps) => {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [amount, setAmount] = useState(defaultAmount);
  const [isLoading, setIsLoading] = useState(false);
  const [priceData, setPriceData] = useState<PriceResponse | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  // Get USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_CONTRACT_ADDRESS,
    chainId: base.id,
  });

  // Get token balance
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address!],
    chainId: base.id,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // Fetch price quote
  useEffect(() => {
    if (!amount || !address || parseFloat(amount) === 0) {
      setPriceData(null);
      return;
    }

    const fetchPrice = async () => {
      setIsLoadingPrice(true);
      try {
        const sellToken = isBuying ? USDC_CONTRACT_ADDRESS : tokenAddress;
        const buyToken = isBuying ? tokenAddress : USDC_CONTRACT_ADDRESS;
        const sellDecimals = isBuying ? USDC_DECIMALS : tokenDecimals;
        const sellAmount = parseUnits(amount, sellDecimals).toString();

        const response = await axios.post("/api/matcha/price", {
          chainId: base.id,
          sellToken,
          buyToken,
          sellAmount,
          taker: address,
        });

        setPriceData(response.data);
      } catch (error) {
        console.error("Error fetching price:", error);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    const debounceTimer = setTimeout(fetchPrice, 500);
    return () => clearTimeout(debounceTimer);
  }, [amount, address, isBuying, tokenAddress, tokenDecimals]);

  const executeSwap = async () => {
    if (!walletClient || !address || !priceData || !amount) return;

    setIsLoading(true);
    let toastId;

    try {
      // Switch to Base chain if needed
      if (chainId !== base.id) {
        toastId = toast.loading("Please switch to Base network");
        await walletClient.switchChain({ id: base.id });
        toast.dismiss(toastId);
      }

      const sellToken = isBuying ? USDC_CONTRACT_ADDRESS : tokenAddress;
      const buyToken = isBuying ? tokenAddress : USDC_CONTRACT_ADDRESS;
      const sellDecimals = isBuying ? USDC_DECIMALS : tokenDecimals;
      const sellAmount = parseUnits(amount, sellDecimals);

      // Check if we need to approve based on the price response
      const currentAllowance = BigInt(priceData?.issues?.allowance?.actual || "0");
      const needsApproval = currentAllowance < sellAmount || !priceData?.issues?.allowance;

      if (needsApproval && priceData?.issues?.allowance?.spender) {
        toastId = toast.loading("Approving token...");
        const approveTx = await walletClient.writeContract({
          address: sellToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [priceData.issues.allowance.spender as Address, maxUint256],
          chain: base,
        });
        await publicClient("base").waitForTransactionReceipt({ hash: approveTx });
        toast.success("Approved!", { id: toastId });
      }

      // Get firm quote
      toastId = toast.loading("Getting final quote...");
      const quoteResponse = await axios.post("/api/matcha/quote", {
        chainId: base.id,
        sellToken,
        buyToken,
        sellAmount: sellAmount.toString(),
        taker: address,
      });

      const quote: QuoteResponse = quoteResponse.data;
      toast.dismiss(toastId);

      // Sign Permit2 if needed
      if (quote.permit2?.eip712) {
        toastId = toast.loading("Please sign the permit...");
        try {
          // @ts-ignore
          const signature = await walletClient.signTypedData(quote.permit2.eip712);

          // Append signature length and signature data as per 0x docs
          // Format: <sig len><sig data> where sig len is 32-byte unsigned big-endian integer
          const signatureLengthInHex = numberToHex(size(signature), {
            signed: false,
            size: 32,
          });

          // Concatenate: original data + signature length + signature
          quote.transaction.data = concat([quote.transaction.data as `0x${string}`, signatureLengthInHex, signature]);

          toast.success("Permit signed!", { id: toastId });
        } catch (error) {
          toast.error("Permit signing cancelled", { id: toastId });
          throw error;
        }
      }

      // Execute the swap
      toastId = toast.loading("Swapping...");
      const hash = await walletClient.sendTransaction({
        to: quote.transaction.to,
        data: quote.transaction.data as `0x${string}`,
        value: BigInt(quote.transaction.value || 0),
        gas: BigInt(quote.transaction.gas) * BigInt("2"),
        chain: base,
      });

      await publicClient("base").waitForTransactionReceipt({ hash });

      const buyDecimals = isBuying ? tokenDecimals : USDC_DECIMALS;
      const buySymbol = isBuying ? tokenSymbol : "USDC";
      const buyAmount = formatUnits(BigInt(quote.buyAmount), buyDecimals);

      toast.success(
        `Swapped ${amount} ${isBuying ? "USDC" : tokenSymbol} for ${kFormatter(parseFloat(buyAmount))} ${buySymbol}`,
        {
          id: toastId,
          duration: 10000,
        },
      );

      setAmount("");
      setPriceData(null);
      onSuccess?.();
    } catch (error: any) {
      console.error("Swap error:", error);
      toast.error(error?.message || "Swap failed", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const outputAmount =
    priceData && priceData.buyAmount
      ? formatUnits(BigInt(priceData.buyAmount), isBuying ? tokenDecimals : USDC_DECIMALS)
      : "0";

  const balance = isBuying ? usdcBalance?.value : tokenBalance;
  const balanceSymbol = isBuying ? "USDC" : tokenSymbol;
  const insufficientBalance =
    balance && amount && parseFloat(amount) > 0
      ? parseUnits(amount, isBuying ? USDC_DECIMALS : tokenDecimals) > balance
      : false;

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <CurrencyInput
          tokenImage={isBuying ? "/usdc.png" : tokenImage}
          tokenBalance={balance || 0n}
          price={amount}
          isError={insufficientBalance}
          onPriceSet={setAmount}
          symbol={balanceSymbol}
          showMax
          chain="base"
        />

        <div className="relative w-full min-h-[16px] max-h-[16px] flex justify-center">
          <div className="backdrop-blur-[40px] absolute min-h-[28px] h-7 w-7 rounded-[10px] bg-[#333] border-card border top-1/2 transform -translate-y-1/2 text-xs text-secondary/70">
            <div className="flex justify-center items-center h-full">
              <ArrowDownIcon className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <CurrencyInput
          tokenImage={isBuying ? tokenImage : "/usdc.png"}
          tokenBalance={0n}
          price={isLoadingPrice ? "..." : parseFloat(outputAmount || "0").toFixed(4)}
          isError={false}
          onPriceSet={() => {}}
          symbol={isBuying ? tokenSymbol : "USDC"}
          disabled
          chain="base"
        />
      </div>

      <Button
        className="w-full"
        variant="accentBrand"
        disabled={!address || isLoading || !amount || insufficientBalance || isLoadingPrice || !priceData}
        onClick={executeSwap}
      >
        {isLoading ? "Swapping..." : `Swap ${isBuying ? "USDC" : tokenSymbol} for ${isBuying ? tokenSymbol : "USDC"}`}
      </Button>
    </div>
  );
};
