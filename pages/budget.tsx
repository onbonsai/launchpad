import { useState, useEffect } from 'react';
import { useAccount, useBalance, useWalletClient } from 'wagmi';
import { erc20Abi, formatUnits, parseUnits } from 'viem';
import { switchChain } from 'viem/actions';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { sdk } from '@farcaster/miniapp-sdk';

import { Layout } from '@src/components/Layouts/Layout';
import { Button } from '@src/components/Button';
import Spinner from '@src/components/LoadingSpinner/LoadingSpinner';
import { brandFont } from '@src/fonts/fonts';
import { getChain, SAGE_EVM_ADDRESS } from '@src/services/madfi/utils';
import { publicClient, USDC_CONTRACT_ADDRESS, USDC_DECIMALS } from '@src/services/madfi/moneyClubs';
import { useIsMiniApp } from '@src/hooks/useIsMiniApp';
import useLensSignIn from '@src/hooks/useLensSignIn';

const ALLOWANCE_AMOUNTS = [5, 10, 25, 50];

export default function BudgetPage() {
  const router = useRouter();
  const { chain, address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isMiniApp } = useIsMiniApp();
  const { isAuthenticated } = useLensSignIn(walletClient);

  const [selectedAmount, setSelectedAmount] = useState<number>(5);
  const [isApprovingBudget, setIsApprovingBudget] = useState(false);

  // USDC Balance for Base
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_CONTRACT_ADDRESS,
    chainId: getChain("base").id,
    query: {
      enabled: isConnected && isMiniApp,
    },
  });

  const formattedUsdcBalance = Number(formatUnits(usdcBalance?.value || 0n, USDC_DECIMALS)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  // Redirect if not authenticated or not in mini app
  useEffect(() => {
    if (!isMiniApp) {
      router.push('/');
      return;
    }
    if (!isAuthenticated) {
      router.push('/?modal=budget');
      return;
    }
  }, [isMiniApp, isAuthenticated, router]);

  const handleApproveBudget = async () => {
    if (!walletClient) return;
    const _base = getChain("base");

    if (_base.id !== chain?.id && walletClient) {
      try {
        await switchChain(walletClient, { id: _base.id });
      } catch (error) {
        console.log(error);
        toast.error("Please switch to Base to approve");
        return;
      }
    }

    setIsApprovingBudget(true);
    try {
      const client = publicClient("base");
      const hash = await walletClient.writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [SAGE_EVM_ADDRESS, parseUnits(selectedAmount.toString(), USDC_DECIMALS)],
        chain: _base
      });
      console.log(`hash: ${hash}`)
      await client.waitForTransactionReceipt({ hash });

      toast.success("Budget approved successfully!");

      // Prompt to add mini app
      if (!(await sdk.context).client.added) {
        try {
          await sdk.actions.addMiniApp();
        } catch (error) {
          console.log(error);
        }
      }

      // Redirect to home after successful approval
      router.push('/');
    } catch (error) {
      console.error("Error approving budget:", error);
      toast.error("Failed to approve allowance", { duration: 5000 });
    } finally {
      setIsApprovingBudget(false);
    }
  };

  return (
    <div className={clsx("flex flex-col w-full max-w-md mx-auto mt-12 px-8", brandFont.className)}>
      <h1 className="text-4xl text-center font-bold mb-2">Set Allowance</h1>
      <p className="text-center text-gray-400 mt-2 mb-8">
        Set an allowance (USDC) for generations
      </p>

      <div className="grid grid-cols-4 gap-2 mb-6">
        {ALLOWANCE_AMOUNTS.map((amount) => (
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

      <div className="py-2 px-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Your Balance:</span>
          <span className="text-sm font-semibold">
            {`${formattedUsdcBalance} USDC`}
          </span>
        </div>
      </div>

      <Button
        className="w-full px-3 py-3 text-lg mb-4"
        onClick={handleApproveBudget}
        disabled={isApprovingBudget}
        variant="accentBrand"
      >
        {isApprovingBudget ? (
          <div className="flex items-center justify-center gap-2">
            <Spinner customClasses="h-4 w-4" color="#5be39d" />
            <span>Approving...</span>
          </div>
        ) : (
          `Approve $${selectedAmount} USDC`
        )}
      </Button>
    </div>
  );
}