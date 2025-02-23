import { useMemo, useState, useEffect, useRef } from "react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { formatUnits } from "viem";
import toast from "react-hot-toast";
import { GiftIcon } from "@heroicons/react/solid";
import { Button } from "@src/components/Button";
import { USDC_DECIMALS, withdrawFeesEarned } from "@src/services/madfi/moneyClubs";
import { useGetFeesEarned } from "@src/hooks/useMoneyClubs";
import { Subtitle, Header2 } from "@src/styles/text";
import { localizeNumber } from "@src/constants/utils";
import { IS_PRODUCTION, lens, lensTestnet } from "@src/services/madfi/utils";
import { base, baseSepolia } from "viem/chains";

export const ClaimFeesEarned = () => {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const { data: creatorFeesEarned, isLoading, refetch } = useGetFeesEarned(address);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Effect to add and remove the event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowTooltip(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    // If the tooltip is visible, add the event listener
    if (showTooltip) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTooltip]);

  const creatorFeesFormatted = useMemo(() => {
    if (creatorFeesEarned) {
      return localizeNumber(parseFloat(formatUnits(creatorFeesEarned.grandTotal, USDC_DECIMALS)), undefined, 2);
    }
    return "0.00";
  }, [creatorFeesEarned]);

  const claimFeesEarned = async () => {
    setIsClaiming(true);
    let toastId;

    if (!creatorFeesEarned) {
      toast.error("No fees earned");
      setIsClaiming(false);
      return;
    }

    try {
      toastId = toast.loading("Claiming", { id: toastId });

      // Claim Base fees
      if (creatorFeesEarned?.base.feesEarned > 0n || creatorFeesEarned?.base.clubFeesTotal > 0n) {
        const targetChainId = IS_PRODUCTION ? base.id : baseSepolia.id;
        if (chainId !== targetChainId) {
          try {
            switchChain({ chainId: targetChainId });
          } catch {
            toast.error("Please switch networks");
            setIsClaiming(false);
            return;
          }
        }
        await withdrawFeesEarned(
          walletClient,
          creatorFeesEarned.base.feesEarned,
          creatorFeesEarned.base.clubFees.map((club) => BigInt(club.id)),
          "base",
        );
      }

      // Claim Lens fees
      if (creatorFeesEarned?.lens.feesEarned > 0n || creatorFeesEarned?.lens.clubFeesTotal > 0n) {
        const targetChainId = IS_PRODUCTION ? lens.id : lensTestnet.id;
        if (chainId !== targetChainId) {
          try {
            switchChain({ chainId: targetChainId });
          } catch {
            toast.error("Please switch networks");
            setIsClaiming(false);
            return;
          }
        }
        await withdrawFeesEarned(
          walletClient,
          creatorFeesEarned.lens.feesEarned,
          creatorFeesEarned.lens.clubFees.map((club) => BigInt(club.id)),
          "lens",
        );
      }

      refetch();
      toast.success(`Claimed ${creatorFeesFormatted}`, { duration: 10000, id: toastId });
      setShowTooltip(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to claim. Your wallet may be switching networks.", { id: toastId });
    }

    setIsClaiming(false);
  };

  const disabled = !isConnected || isLoading || creatorFeesEarned?.grandTotal === 0n || isClaiming;

  if ((isLoading || disabled) && !isClaiming) return null;

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        variant="dark-grey"
        size="md"
        className="text-base font-medium md:px-2 rounded-xl"
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <div className="flex flex-row justify-center items-center">
          <GiftIcon className="h-5 w-5 mr-2 text-white" />
          <span>{creatorFeesFormatted}</span>
        </div>
      </Button>
      {showTooltip && (
        <EarningsTooltip
          creatorFeesFormatted={creatorFeesFormatted}
          creatorFeesEarned={creatorFeesEarned}
          claimFeesEarned={claimFeesEarned}
        />
      )}
    </div>
  );
};

const EarningsTooltip = ({
  creatorFeesFormatted,
  creatorFeesEarned,
  claimFeesEarned,
}: {
  creatorFeesFormatted: string;
  creatorFeesEarned: any;
  claimFeesEarned: () => Promise<void>;
}) => {
  const formatFee = (value: bigint) => localizeNumber(parseFloat(formatUnits(value, USDC_DECIMALS)), undefined, 2);

  return (
    <div className="fixed mt-2 right-4 bg-dark-grey text-white p-4 rounded-xl shadow-lg w-[300px] z-[140]">
      <Header2>{creatorFeesFormatted}</Header2>
      <Subtitle className="pt-2">Earned from creator & referral fees</Subtitle>

      <div className="pt-4 space-y-4">
        {/* Base Chain Fees */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-secondary">Base Chain</div>
          <div className="flex justify-between text-sm text-secondary/70">
            <span>Creator fees:</span>
            <span>{formatFee(creatorFeesEarned?.base.feesEarned || 0n)}</span>
          </div>
          <div className="flex justify-between text-sm text-secondary/70">
            <span>Club referrals:</span>
            <span>{formatFee(creatorFeesEarned?.base.clubFeesTotal || 0n)}</span>
          </div>
        </div>

        {/* Lens Chain Fees */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-secondary">Lens Chain</div>
          <div className="flex justify-between text-sm text-secondary/70">
            <span>Creator fees:</span>
            <span>{formatFee(creatorFeesEarned?.lens.feesEarned || 0n)}</span>
          </div>
          <div className="flex justify-between text-sm text-secondary/70">
            <span>Club referrals:</span>
            <span>{formatFee(creatorFeesEarned?.lens.clubFeesTotal || 0n)}</span>
          </div>
        </div>

        {/* Total */}
        <div className="pt-2 border-t border-secondary/20">
          <div className="flex justify-between text-sm font-semibold text-secondary">
            <span>Total:</span>
            <span>{creatorFeesFormatted}</span>
          </div>
        </div>
      </div>

      <div className="pt-4 w-full">
        <Button variant="accent" className="w-full" onClick={claimFeesEarned}>
          Claim All
        </Button>
      </div>
    </div>
  );
};
