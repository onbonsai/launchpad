import { useMemo, useState, useEffect, useRef } from "react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { formatUnits } from "viem";
import toast from "react-hot-toast";
import { GiftIcon } from "@heroicons/react/solid";
import { Button } from "@src/components/Button";
import { USDC_DECIMALS, CONTRACT_CHAIN_ID, withdrawFeesEarned } from "@src/services/madfi/moneyClubs";
import { useGetFeesEarned } from "@src/hooks/useMoneyClubs";
import { Subtitle, Header2 } from '@src/styles/text';
import { localizeNumber } from "@src/constants/utils";

export const ClaimFeesEarned = () => {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const { data: creatorFeesEarned, isLoading, refetch } = useGetFeesEarned(address);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const containerRef = useRef(null);

  // Effect to add and remove the event listener
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowTooltip(false);
      }
    };

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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
      return localizeNumber(parseFloat(formatUnits(BigInt((creatorFeesEarned.feesEarned + creatorFeesEarned.clubFeesTotal).toString()), USDC_DECIMALS)), undefined, 2);
    }

    return '0.00';
  }, [creatorFeesEarned]);

  const claimFeesEarned = async () => {
    setIsClaiming(true);

    let toastId;

    if (chainId !== CONTRACT_CHAIN_ID) {
      try {
        switchChain({ chainId: CONTRACT_CHAIN_ID });
      } catch {
        toast.error("Please switch networks");
        setIsClaiming(false);
        return;
      }
    }

    try {
      toastId = toast.loading("Claiming", { id: toastId });
      await withdrawFeesEarned(walletClient, creatorFeesEarned?.feesEarned || 0n, creatorFeesEarned?.clubFees ? creatorFeesEarned?.clubFees.map(club => BigInt(club.id)) : []);

      refetch();

      toast.success(`Claimed ${creatorFeesFormatted}`, { duration: 10000, id: toastId });

      setShowTooltip(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to claim", { id: toastId });
    }

    setIsClaiming(false);
  }

  const disabled = !isConnected || isLoading || (creatorFeesEarned?.feesEarned === 0n && creatorFeesEarned?.clubFeesTotal === 0n ) || isClaiming;

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

const EarningsTooltip = ({ creatorFeesFormatted, creatorFeesEarned, claimFeesEarned }) => {
  const formatFee = (value: bigint) =>
    localizeNumber(parseFloat(formatUnits(value, USDC_DECIMALS)), undefined, 2);

  return (
    <div className="fixed mt-2 right-4 bg-dark-grey text-white p-4 rounded-xl shadow-lg w-[300px] z-[140]">
      <Header2>
        {creatorFeesFormatted}
      </Header2>
      <Subtitle className="pt-2">
        Earned from creator & referral fees
      </Subtitle>

      <div className="pt-4 space-y-2">
        <div className="flex justify-between text-sm text-secondary/70">
          <span>Creator fees:</span>
          <span>{formatFee(creatorFeesEarned?.feesEarned || 0n)}</span>
        </div>
        <div className="flex justify-between text-sm text-secondary/70">
          <span>Club referrals:</span>
          <span>{formatFee(creatorFeesEarned?.clubFeesTotal || 0n)}</span>
        </div>
      </div>

      <div className="pt-4 w-full">
        <Button variant="accent" className="w-full" onClick={claimFeesEarned}>
          Claim
        </Button>
      </div>
    </div>
  );
};
