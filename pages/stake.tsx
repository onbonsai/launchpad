import { NextPage } from "next";
import { Header2, Subtitle } from "@src/styles/text";
import { Button } from "@src/components/Button";
import { switchChain } from "viem/actions";
import { useState, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import ConfettiExplosion from "react-confetti-explosion";
import { lens, LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";
import { erc20Abi, formatEther, parseUnits } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useStakingData, formatStakingAmount, getLockupPeriodLabel } from "@src/hooks/useStakingData";
import { useStakingTransactions } from "@src/hooks/useStakingTransactions";
import { StakeModal } from "@src/components/StakeModal";
import { Modal } from "@src/components/Modal";
import WalletButton from "@src/components/Creators/WalletButton";
import { kFormatter } from "@src/utils/utils";
import BridgeModal from "@pagesComponents/Studio/BridgeModal";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import toast from "react-hot-toast";
import { calculateStakingCredits, LockupPeriod } from "@src/services/madfi/stakingCalculator";
import { ReferralModal } from "@src/components/ReferralModal/ReferralModal";
import { GiftIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import axios from "axios";
import { useGetCredits } from "@src/hooks/useGetCredits";
import { useModal } from "connectkit";
import BuySellModal from "@pagesComponents/Club/BuySellModal";
import { SWAP_TO_BONSAI_POST_ID } from "@src/services/madfi/moneyClubs";
import { useTopUpModal } from "@src/context/TopUpContext";
import { useGetPosts } from "@src/services/lens/posts";
import Image from "next/image";
import { Tooltip } from "@src/components/Tooltip";
import { InfoOutlined } from "@mui/icons-material";
import { claimStakingRewardsWithProof, useGetStakingRewards } from "@src/services/madfi/claim";

const fetchTwapPrice = async (): Promise<number> => {
  try {
    const response = await fetch("/api/twap/price");
    if (!response.ok) throw new Error("Failed to fetch TWAP price");
    const data = await response.json();
    return data.price || 0;
  } catch (error) {
    console.error("Error fetching TWAP price:", error);
    return 0;
  }
};

const getCreditsMultiplier = (lockupPeriod: number) => {
  // Convert seconds to months roughly
  const months = Math.floor(lockupPeriod / (30 * 24 * 60 * 60));

  if (months >= 12) return 3; // 12-month lock: 3x (was 5x)
  if (months >= 6) return 2; // 6-month lock: 2x (was 3x)
  if (months >= 3) return 1.5; // 3-month lock: 1.5x (was 2x)
  if (months >= 1) return 1.25; // 1-month lock: 1.25x (was 1.5x)
  return 1; // no lock: 1x
};

const TokenPage: NextPage = () => {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [stakeAmount, setStakeAmount] = useState("");
  const router = useRouter();

  const { data: bonsaiBalance, refetch: refetchBonsaiBalance } = useReadContract({
    address: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: isConnected,
    },
  });

  const { data: creditBalance, isLoading: isLoadingCredits, refetch: refetchCredits } = useGetCredits(address as string, isConnected);

  const { data: stakingData, isLoading: isLoadingStaking, refetch: refetchStakingData } = useStakingData(address);

  // Fetch staking rewards data
  const { data: stakingRewards, isLoading: isLoadingRewards, refetch: refetchStakingRewards } = useGetStakingRewards(
    walletClient,
    address as `0x${string}`
  );

  // Fetch 30-day TWAP price
  const { data: twapPrice, isLoading: isLoadingTwap } = useQuery({
    queryKey: ["twap-price"],
    queryFn: fetchTwapPrice,
    refetchInterval: 3600000, // Refetch every hour
  });

  const [bonsaiPrice, setBonsaiPrice] = useState(0);
  const [tokenHoldings, setTokenHoldings] = useState(0);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [bridgeInfo, setBridgeInfo] = useState<{ txHash: `0x${string}` }>();
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [estimatedFutureCredits, setEstimatedFutureCredits] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const [showBuyModal, setShowBuyModal] = useState(false);

  const { stake, unstake } = useStakingTransactions();

  const referrer = useMemo(() => {
    const { ref } = router.query;
    return typeof ref === "string" ? ref : null;
  }, [router.query]);

  const referralLink = useMemo(() => {
    if (!address) return "";
    return `${window.location.origin}/stake?ref=${address}`;
  }, [address]);

  useEffect(() => {
    const { bridge } = router.query;
    if (!!bridge) {
      setIsBridgeModalOpen(true);
    }
  }, [router.query]);

  const { openTopUpModal } = useTopUpModal();

  useMemo(() => {
    if (!bonsaiBalance || bonsaiBalance === BigInt(0)) {
      setBonsaiPrice(0);
      return;
    }
    const fetchPrice = async () => {
      const tokenPrice = await queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C");
      setBonsaiPrice(tokenPrice);
      const bonsaiHoldings = Number.parseFloat(formatEther(bonsaiBalance));
      setTokenHoldings(tokenPrice * bonsaiHoldings);
    };
    fetchPrice();
  }, [bonsaiBalance]);

  const formattedBalance = kFormatter(parseFloat(formatEther(bonsaiBalance || 0n)), true);

  const totalStaked = useMemo(() => {
    if (!stakingData?.summary?.totalStaked) return "0";
    return formatStakingAmount(stakingData.summary.totalStaked);
  }, [stakingData?.summary]);

  const stakedUsdValue = useMemo(() => {
    return (Number(formatEther(BigInt(stakingData?.summary?.totalStaked || "0"))) * Number(bonsaiPrice)).toFixed(2);
  }, [stakingData, bonsaiPrice]);

  const averageMultiplier = useMemo(() => {
    if (!stakingData?.stakes.length) return 1;
    const totalMultiplier = stakingData.stakes.reduce((sum, stake) => {
      return sum + getCreditsMultiplier(Number(stake.lockupPeriod));
    }, 0);
    return (totalMultiplier / stakingData.stakes.length).toFixed(1);
  }, [stakingData?.stakes]);

  // Format the next reset time
  const formatNextReset = () => {
    const midnight = new Date();
    midnight.setUTCHours(0, 0, 0, 0);
    midnight.setUTCDate(midnight.getUTCDate() + 1); // Next day at midnight
    return midnight.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Add safe checks for stakes array
  const activeStakes = stakingData?.stakes || [];
  const hasActiveStakes = activeStakes.length > 0;

  const recordReferral = async (userAddress: string, referrerAddress: string) => {
    try {
      const response = await axios.post("/api/referrals/record", {
        user: userAddress,
        referrer: referrerAddress,
      });

      return response.data;
    } catch (error) {
      console.error("Error recording referral:", error);
      throw error;
    }
  };

  // Claim staking rewards
  const handleClaimRewards = async () => {
    let toastId;

    try {
      if (chain?.id !== LENS_CHAIN_ID && walletClient) {
        try {
          await switchChain(walletClient, { id: LENS_CHAIN_ID });
          return;
        } catch {
          toast.error("Please switch networks");
          return;
        }
      }

      if (!stakingRewards?.proof || !stakingRewards?.amount || stakingRewards?.hasClaimed) {
        toast.error("No rewards to claim");
        return;
      }

      setIsClaiming(true);
      toastId = toast.loading("Claiming rewards...", { id: toastId });

      const success = await claimStakingRewardsWithProof(
        walletClient,
        stakingRewards.proof.split("."),
        stakingRewards.amount
      );

      if (!success) throw new Error("Claim transaction failed");

      toast.success(`Claimed ${formatEther(stakingRewards.amount)} $BONSAI`, { duration: 10000, id: toastId });
      refetchStakingRewards();
      refetchBonsaiBalance();

      return true;
    } catch (error) {
      console.error("Claim error:", error);
      toast.error("Failed to claim rewards", { id: toastId });
      return false;
    } finally {
      setIsClaiming(false);
    }
  };

    // Claim and immediately restake
  const handleClaimAndRestake = async () => {
    // Store the claimed amount before calling handleClaimRewards
    const claimedAmount = stakingRewards?.amount ? formatEther(stakingRewards.amount) : "0";

    const claimSuccess = await handleClaimRewards();
    if (!claimSuccess) return;

    // Set the amount to stake as the claimed rewards amount
    setStakeAmount(claimedAmount);

    // Open the stake modal
    setIsStakeModalOpen(true);
  };

  // Calculate estimated future credits whenever staking data or price changes
  useEffect(() => {
    if (stakingData?.summary && (twapPrice || bonsaiPrice)) {
      const priceToUse = twapPrice || bonsaiPrice;
      const result = calculateStakingCredits(
        0, // No new stake, just calculate based on existing stakes
        0 as LockupPeriod,
        priceToUse,
        stakingData.summary,
      );
      result.withFreeTier += creditBalance?.creditsPurchased || 0;
      setEstimatedFutureCredits(result.withFreeTier);
    }
  }, [stakingData?.summary, twapPrice, bonsaiPrice, creditBalance?.creditsPurchased]);

  const handleStake = async (amount: string, lockupPeriod: number): Promise<boolean> => {
    try {
      if (chain?.id !== LENS_CHAIN_ID && walletClient) {
        try {
          await switchChain(walletClient, { id: LENS_CHAIN_ID });
          return false;
        } catch {
          toast.error("Please switch to Lens Chain");
          return false;
        }
      }

      const txHash = await stake(walletClient, amount, lockupPeriod, address as `0x${string}`);
      if (!txHash) throw new Error("No stake hash");

      // Recalculate credits after a short delay to allow subgraph to index
      fetch("/api/credits/recalculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      })
        .then(() => {
          // Refetch credits on the client to update UI
          refetchCredits();
          refetchStakingData(); // also refetch staking data
        })
        .catch((error) => {
          console.error("Failed to recalculate credits:", error);
        });

      refetchBonsaiBalance();

      setIsStakeModalOpen(false);
      setIsReferralModalOpen(true);

      // Record referral if there's a referrer and we have the user's address
      if (referrer && address && referrer !== address) {
        try {
          await recordReferral(address, referrer);
        } catch (error) {
          console.error("Failed to record referral:", error);
          // Don't throw here - we don't want to revert the stake if referral recording fails
        }
      }

      toast.success("Stake successful. Your credits will be updated in a few moments.");

      return true;
    } catch (error) {
      console.error("Staking error:", error);
      return false;
    }
  };

  const handleUnstake = async (stakeIndex: bigint) => {
    try {
      if (chain?.id !== LENS_CHAIN_ID && walletClient) {
        try {
          await switchChain(walletClient, { id: LENS_CHAIN_ID });
          // toast("Please re-connect your wallet");
          // setOpen(true);
          // return;
        } catch {
          toast.error("Please switch to Lens");
          return;
        }
      }
      await unstake(walletClient, stakeIndex);
      refetchBonsaiBalance();
      setTimeout(() => refetchStakingData(), 4000);
      setIsStakeModalOpen(false);
    } catch (error) {
      console.error("Unstaking error:", error);
    }
  };

  const onBridge = async (txHash: `0x${string}`) => {
    setBridgeInfo({ txHash });

    const MAX_ATTEMPTS = 20; // Maximum number of attempts (10 minutes with exponential backoff)
    const INITIAL_INTERVAL = 10000; // Start with 10 seconds
    let attempts = 0;
    let currentInterval = INITIAL_INTERVAL;

    const checkDeliveryStatus = async () => {
      try {
        const response = await fetch(`https://scan.layerzero-api.com/v1/messages/tx/${txHash}`);
        if (!response.ok) {
          if (response.status === 404) {
            // 404 is expected initially, just continue polling
            attempts++;
            if (attempts >= MAX_ATTEMPTS) {
              toast.error("Bridge taking longer than expected. Please check LayerZero Explorer.", { duration: 10000 });
              setBridgeInfo(undefined);
              return true; // Signal to stop polling
            }
            return false; // Continue polling
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.data[0].status.name === "DELIVERED") {
          refetchBonsaiBalance();
          setBridgeInfo(undefined);
          setShowConfetti(true);
          toast.success("Tokens bridged", { duration: 5000 });
          setTimeout(() => setShowConfetti(false), 5000);
          return true; // Signal successful completion
        }

        // If not delivered, increment attempts and check if we should continue
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          toast.error("Bridge taking longer than expected. Please check LayerZero Explorer.", { duration: 10000 });
          setBridgeInfo(undefined);
          return true; // Signal to stop polling
        }

        // Exponential backoff with max of 30 seconds
        currentInterval = Math.min(INITIAL_INTERVAL * Math.pow(1.5, attempts), 30000);
        return false; // Continue polling
      } catch (error) {
        console.error("Error checking bridge status:", error);
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          toast.error("Error checking bridge status. Please check LayerZero Explorer.", { duration: 10000 });
          setBridgeInfo(undefined);
          return true; // Signal to stop polling
        }
        return false; // Continue polling
      }
    };

    const poll = async () => {
      const shouldStop = await checkDeliveryStatus();
      if (!shouldStop) {
        setTimeout(poll, currentInterval);
      }
    };

    // Start polling
    poll();
  };

  // Calculate credits per day for a given amount and lockup period
  const calculateCreditsPerDay = (amount: string, lockupPeriod: number) => {
    if (!amount || Number(amount) <= 0) return 0;

    // Use TWAP price if available, otherwise fall back to spot price
    const priceToUse = twapPrice || bonsaiPrice;
    if (!priceToUse) return 0;

    // Map lockup period in seconds to months for the calculator
    const lockupMonths = mapLockupPeriodToMonths(lockupPeriod);

    // Use the staking calculator to get more accurate estimates
    const result = calculateStakingCredits(
      Number(amount) * priceToUse, // Convert token amount to USD
      lockupMonths as LockupPeriod,
      priceToUse,
      stakingData?.summary || null,
    );

    // Return the incremental credits
    return result.incrementalCredits;
  };

  // Helper function to map lockup period in seconds to months
  const mapLockupPeriodToMonths = (seconds: number): number => {
    const days = seconds / (24 * 60 * 60);
    if (days >= 360) return 12;
    if (days >= 180) return 6;
    if (days >= 90) return 3;
    if (days >= 30) return 1;
    return 0;
  };

  // Function to find the minimum of two BigInt values
  const getMinBigInt = (a: bigint, b: bigint): bigint => {
    return a < b ? a : b;
  };

  // Collect all post IDs from postUpdates
  const postUpdateIds = useMemo(() =>
    Array.from(new Set(creditBalance?.postUpdates?.map((u) => u.postId) || [])),
    [creditBalance?.postUpdates]
  );
  // Fetch post details
  const { data: postDetails } = useGetPosts(postUpdateIds);

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md-plus:max-w-[100rem] px-2 sm:px-6 pt-6">
        <section aria-labelledby="studio-heading" className="pt-0 pb-6 max-w-full">
          <div className="flex flex-col md-plus:flex-row gap-y-6 md-plus:gap-x-6 max-w-full">
            {/* Main Content */}
            <div className="flex-grow">
              <div className="bg-card rounded-lg p-6 relative">
                <div className="flex flex-col ">
                  <div className="flex flex-col">
                    <div className="flex space-x-2">
                      <Image src="/bonsai.png" alt="bonsai" className="object-cover rounded-lg" height={24} width={24}/>
                      <Header2>Bonsai Token</Header2>
                      <WalletButton wallet={PROTOCOL_DEPLOYMENT.lens.Bonsai} />
                    </div>
                    <Subtitle className="mt-2 md-plus:mt-4">
                      $BONSAI staking is currently deprecated and in withdrawal only mode.
                    </Subtitle>
                  </div>
                </div>
              </div>

              <div className="space-y-8 mt-6">
                {/* Top Row - Available, Rewards, and Staked Cards */}
                <div className="grid grid-cols-1 gap-6 md-plus:grid-cols-3">
                  {/* Available Card */}
                  <div className="bg-card rounded-lg p-6">
                    {showConfetti && <ConfettiExplosion zIndex={99999 + 1} className="ml-40" />}
                    <div className="pb-2">
                      <h3 className="text-sm font-medium text-brand-highlight">Balance</h3>
                    </div>
                    <div>
                      {isConnected ? (
                        <>
                          <div className="text-2xl font-bold text-secondary">{formattedBalance} $BONSAI</div>
                          <p className="text-xs text-secondary/60">${tokenHoldings.toFixed(2)}</p>
                          <div className="mt-4 flex justify-end space-x-2">
                            <Button
                              variant="dark-grey"
                              size="sm"
                              onClick={() => setIsBridgeModalOpen(true)}
                              disabled={!!bridgeInfo?.txHash}
                            >
                              {!bridgeInfo?.txHash && "Bridge"}
                              {bridgeInfo?.txHash && (
                                <div className="flex items-center gap-2 flex-row">
                                  <Spinner customClasses="h-4 w-4" color="#5be39d" />
                                  <span>Bridging</span>
                                </div>
                              )}
                            </Button>
                            <Button variant="accent" size="sm" onClick={() => setShowBuyModal(true)}>
                              Buy $BONSAI
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-secondary/60 mb-4">Connect your wallet to view your balance</p>
                        </div>
                      )}
                    </div>
                    {bridgeInfo?.txHash && (
                      <div className="flex justify-end mt-4">
                        <a
                          href={`https://layerzeroscan.com/tx/${bridgeInfo.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 !text-bullish hover:underline"
                        >
                          Check LayerZero
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Rewards Card */}
                  <div className="bg-card rounded-lg p-6">
                    <div className="pb-2">
                      <div className="flex items-center gap-1">
                        <h3 className="text-sm font-medium text-brand-highlight">Staking Rewards</h3>
                        <Tooltip
                          message="Rewards are calculated as: (Your Staking Power / Total Staking Power) × 500k $BONSAI. Rewards are distributed every 2 weeks. Staking power increases with longer lockup periods. Mid-epoch stakes are counted proportionally."
                          direction="top"
                        >
                          <InfoOutlined className="max-w-4 max-h-4 text-brand-highlight/60 hover:text-brand-highlight cursor-help transition-colors" />
                        </Tooltip>
                      </div>
                    </div>
                    <div>
                      {isConnected ? (
                        <>
                          {stakingRewards?.amount && !stakingRewards?.hasClaimed ? (
                            <>
                              <div className="text-2xl font-bold text-secondary">
                                {kFormatter(parseFloat(formatEther(stakingRewards.amount).split(".")[0]), true)} $BONSAI
                              </div>
                              <p className="text-xs text-secondary/60">
                                Available to claim
                              </p>
                              <p className="text-xs text-secondary/40 mt-1">
                                Every 2 weeks
                              </p>
                            </>
                          ) : stakingData?.summary && stakingData?.totalStakingSummary ? (
                            <>
                              {(() => {
                                const userStakingPower = parseFloat(formatEther(BigInt(stakingData.summary.totalStakingPower || "0")));
                                const totalStakingPower = parseFloat(formatEther(BigInt(stakingData.totalStakingSummary.totalStakingPower || "1"))); // Avoid division by zero
                                const userStakedAmount = parseFloat(formatEther(BigInt(stakingData.summary.totalStaked || "0")));

                                // Calculate estimated rewards: (user power / total power) * 500k $BONSAI
                                const estimatedRewards = totalStakingPower > 0 ? (userStakingPower / totalStakingPower) * 500000 : 0;
                                // Subtract 10% to underpromise, overdeliver
                                const finalEstimatedRewards = estimatedRewards * 0.9;

                                // Calculate APR: rewards every 2 weeks, so 26 periods per year
                                const annualRewards = estimatedRewards * 26;
                                const estimatedAPR = userStakedAmount > 0 ? (annualRewards / userStakedAmount) * 100 : 0;

                                return (
                                  <>
                                    <div className="text-2xl font-bold text-secondary">
                                      ~{kFormatter(finalEstimatedRewards.toFixed(0), true)} $BONSAI
                                    </div>
                                    <p className="text-xs text-secondary/60">
                                      {estimatedAPR.toFixed(1)}% APR
                                    </p>
                                    <p className="text-xs text-secondary/40 mt-1">
                                      Every 2 weeks
                                    </p>
                                  </>
                                );
                              })()}
                            </>
                          ) : (
                            <>
                              <div className="text-2xl font-bold text-secondary">
                                0 $BONSAI
                              </div>
                              <p className="text-xs text-secondary/60">
                                0% APR
                              </p>
                              <p className="text-xs text-secondary/40 mt-1">
                                Every 2 weeks
                              </p>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-secondary">
                            Connect Wallet
                          </div>
                          <p className="text-xs text-secondary/60">
                            --% APR
                          </p>
                          <p className="text-xs text-secondary/40 mt-1">
                            Every 2 weeks
                          </p>
                        </>
                      )}
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={handleClaimRewards}
                          disabled={!isConnected || isClaiming || !stakingRewards?.amount || stakingRewards?.hasClaimed}
                        >
                          {isClaiming ? (
                            <div className="flex items-center gap-2">
                              <Spinner customClasses="h-4 w-4" color="#ffffff" />
                              <span>Claiming...</span>
                            </div>
                          ) : (
                            "Claim"
                          )}
                        </Button>
                        <Button
                          variant="accentBrand"
                          size="sm"
                          onClick={handleClaimAndRestake}
                          disabled={!isConnected || isClaiming || !stakingRewards?.amount || stakingRewards?.hasClaimed}
                        >
                          {isClaiming ? (
                            <div className="flex items-center gap-2">
                              <Spinner customClasses="h-4 w-4" color="#ffffff" />
                              <span>Claiming...</span>
                            </div>
                          ) : (
                            "Claim & Restake"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Staked Card */}
                  <div className="bg-card rounded-lg p-6">
                    <div className="pb-2">
                      <h3 className="text-sm font-medium text-brand-highlight">Staked</h3>
                    </div>
                    {isConnected ? (
                      <div>
                        <div className="text-2xl font-bold text-secondary">{totalStaked} $BONSAI</div>
                        <p className="text-xs text-secondary/60">${stakedUsdValue}</p>
                        <div className="mt-4 flex justify-between items-center">
                          <span className="text-xs font-medium bg-brand-highlight/20 text-brand-highlight px-2 py-0.5 rounded">
                            {averageMultiplier}× Credits
                          </span>
                          <Button variant="accent" size="sm" onClick={() => setIsStakeModalOpen(true)} disabled>
                            Stake
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-secondary/60 mb-4">Connect your wallet to view staking</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Stakes List */}
                {isConnected && (hasActiveStakes) && (
                  <div className="bg-card rounded-lg p-6">
                    <h3 className="text-sm font-medium text-brand-highlight mb-4">Active Stakes</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {/* Existing stakes */}
                      {activeStakes.map(stake => (
                        <div key={stake.id} className="flex items-center justify-between p-4 bg-card-light rounded-lg">
                          <div>
                            <div className="text-lg font-semibold">{formatStakingAmount(stake.amount)} $BONSAI</div>
                            <div className="text-xs text-secondary/60">
                              {getLockupPeriodLabel(stake.lockupPeriod)} Lock •{" "}
                              {getCreditsMultiplier(Number(stake.lockupPeriod))}× Credits
                            </div>
                          </div>
                          <div className="flex items-center gap-x-6">
                            {!(Date.now() >= Number(stake.unlockTime) * 1000) && (
                              <div className="text-right">
                                <div className="text-sm">Unlocks</div>
                                <div className="text-xs text-secondary/60">
                                  {new Date(Number(stake.unlockTime) * 1000).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                            <Button
                              variant="dark-grey"
                              size="sm"
                              className="hover:bg-bullish"
                              onClick={() => handleUnstake(BigInt(stake.stakeIndex))}
                              disabled={Date.now() < Number(stake.unlockTime) * 1000}
                            >
                              Unstake
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stake Modal */}
                <Modal
                  onClose={() => setIsStakeModalOpen(false)}
                  open={isStakeModalOpen}
                  setOpen={setIsStakeModalOpen}
                  panelClassnames="w-screen max-h-[100dvh] md-plus:h-full md-plus:w-[40vw] p-4 text-secondary"
                  static
                >
                  <StakeModal
                    maxAmount={formatEther(bonsaiBalance || 0n)}
                    onStake={handleStake}
                    calculateCreditsPerDay={calculateCreditsPerDay}
                    twapPrice={twapPrice || bonsaiPrice}
                    switchNetwork={chain?.id !== lens.id}
                    amount={stakeAmount}
                    setAmount={setStakeAmount}
                  />
                </Modal>

                {/* Bridge Modal */}
                <Modal
                  onClose={() => setIsBridgeModalOpen(false)}
                  open={isBridgeModalOpen}
                  setOpen={setIsBridgeModalOpen}
                  panelClassnames="w-screen max-h-[100dvh] md-plus:h-full md-plus:w-[30vw] p-4 text-secondary"
                  static
                >
                  <BridgeModal bonsaiBalance={bonsaiBalance} onBridge={onBridge} bridgeInfo={bridgeInfo} />
                </Modal>

                {/* Referral Modal */}
                <Modal
                  onClose={() => setIsReferralModalOpen(false)}
                  open={isReferralModalOpen}
                  setOpen={setIsReferralModalOpen}
                  panelClassnames="w-screen max-h-[100dvh] md-plus:h-fit md-plus:w-[500px] text-secondary"
                >
                  <ReferralModal onClose={() => setIsReferralModalOpen(false)} referralLink={referralLink} />
                </Modal>

                {/* Buy Modal for BONSAI */}
                <BuySellModal
                  club={{
                    tokenAddress: PROTOCOL_DEPLOYMENT.lens.Bonsai,
                    chain: "lens",
                    clubId: 0,
                    complete: true,
                    createdAt: 1743715358,
                    supply: 1_000_000_000,
                    initialPrice: 1,
                    currentPrice: 1,
                    token: {
                      symbol: "BONSAI",
                      image: "/bonsai.png",
                    },
                  }}
                  address={address as string}
                  open={showBuyModal}
                  onClose={() => {
                    setShowBuyModal(false);
                  }}
                  // specific post with reward swap bonsai attached to it
                  postId={SWAP_TO_BONSAI_POST_ID}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TokenPage;