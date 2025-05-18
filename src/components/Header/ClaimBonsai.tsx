import { useMemo, useState, useEffect, useRef } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { switchChain } from "viem/actions";
import { formatEther } from "viem";
import toast from "react-hot-toast";
import { Button } from "@src/components/Button";
import { Subtitle, Header2 } from "@src/styles/text";
import { LENS_CHAIN_ID } from "@src/services/madfi/utils";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { useGetBonsaiClaim, claimTokensWithProof } from "@src/services/madfi/claim";
import { useModal } from "connectkit";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import Image from "next/image";

export const ClaimBonsai = ({ openMobileMenu }: { openMobileMenu?: boolean }) => {
  const { chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated } = useLensSignIn(walletClient);
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { setOpen } = useModal();
  const {
    data: bonsaiClaim,
    isLoading,
    refetch
  } = useGetBonsaiClaim(walletClient, isAuthenticated, authenticatedProfile?.address);
  const { proof, amount } = bonsaiClaim || {};
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

  const amountFormatted = useMemo(() => {
    if (!!amount) return Number(formatEther(amount)).toLocaleString();
    return "0";
  }, [amount]);

  const claim = async () => {
    let toastId;

    try {
      if (chainId !== LENS_CHAIN_ID && walletClient) {
        try {
          await switchChain(walletClient, { id: LENS_CHAIN_ID });
          // toast("Please re-connect your wallet");
          // setOpen(true);
          return;
        } catch {
          toast.error("Please switch networks");
          setIsClaiming(false);
          return;
        }
      }

      setIsClaiming(true);
      toastId = toast.loading("Claiming", { id: toastId });

      const success = await claimTokensWithProof(
        walletClient,
        proof.proof.split("."),
        authenticatedProfile?.address,
        proof.claimScoreBps
      );

      if (!success) throw new Error("tx not successful")

      toast.success(`Claimed ${amountFormatted} $BONSAI`, { duration: 10000, id: toastId });
      setShowTooltip(false);
      refetch()
    } catch (error) {
      console.log(error);
      toast.error("Failed to claim", { id: toastId });
    }

    setIsClaiming(false);
  };

  const disabled = !isConnected || isLoading || (!amount || amount === 0n) || isClaiming;

  if ((isLoading || disabled) && !isClaiming) return null;

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        variant="dark-grey"
        size="md"
        className={`text-base font-medium md:px-2 rounded-lg shining-border hover:scale-105 transition-transform duration-300 ${!!openMobileMenu ? 'w-full' : ''}`}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <div className="flex flex-row justify-center items-center gap-x-2">
          <div className="relative items-center">
            <Image src="/bonsai.png" alt="bonsai" className="object-cover rounded-lg" width={24} height={24}/>
          </div>
          <span>Airdrop</span>
        </div>
      </Button>
      {showTooltip && (
        <EarningsTooltip
          chainId={chainId}
          isClaiming={isClaiming}
          amountFormatted={amountFormatted}
          claim={claim}
        />
      )}
    </div>
  );
};

const EarningsTooltip = ({
  chainId,
  isClaiming,
  amountFormatted,
  claim,
}: {
  chainId?: number;
  isClaiming: boolean;
  amountFormatted: string;
  claim: () => Promise<void>;
}) => {
  return (
    <div className="fixed mt-2 right-4 bg-dark-grey text-white p-4 rounded-lg shadow-lg w-[300px] z-[140]">
      <Header2>{amountFormatted} $BONSAI</Header2>
      <Subtitle className="pt-2">Claim to your Lens account</Subtitle>

      <div className="pt-4 space-y-4">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-x-2">
            <div className="relative">
              <Image src="/bonsai.png" alt="bonsai" className="object-cover rounded-lg" width={24} height={24}/>
            </div>
            <span className="text-sm text-white">BONSAI on Lens Chain</span>
          </div>
          <span className="text-sm text-white">
            {amountFormatted}
          </span>
        </div>
      </div>

      <div className="pt-4 w-full">
        <Button variant="accent" className="w-full" onClick={claim} disabled={isClaiming}>
          {chainId !== LENS_CHAIN_ID ? "Switch to Lens Chain" : "Claim"}
        </Button>
      </div>
    </div>
  );
};
