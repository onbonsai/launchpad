import { NextPage } from "next";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import { Header2, Subtitle } from "@src/styles/text";
import { Button } from "@src/components/Button";
import { switchChain } from "@wagmi/core";
import { useState, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { lens, LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";
import { erc20Abi, formatEther } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useStakingData, formatStakingAmount, getLockupPeriodLabel } from "@src/hooks/useStakingData";
import { useStakingTransactions } from "@src/hooks/useStakingTransactions";
import { StakeModal } from "@src/components/StakeModal";
import { Modal } from "@src/components/Modal";
import WalletButton from "@src/components/Creators/WalletButton";
import { kFormatter } from "@src/utils/utils";
import BridgeModal from "@pagesComponents/Studio/BridgeModal";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { configureChainsConfig } from "@src/utils/wagmi";
import toast from "react-hot-toast";

interface CreditBalance {
  totalCredits: number;
  freeCredits: number;
  stakingCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  nextResetTime: string;
  usagePercentage: number;
}

interface TwapData {
  period: string;
  price: number;
  lastUpdated: Date;
  dataPoints: number;
}

const fetchCredits = async (address: string): Promise<CreditBalance> => {
  const response = await fetch(`/api/credits/balance?address=${address}`);
  if (!response.ok) throw new Error("Failed to fetch credits");
  return response.json();
};

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

// Calculate daily credits from staking
const calculateDailyStakingCredits = (stakedAmount: string, tokenPrice: number, multiplier: number) => {
  // 10% of USD value per year, divided by 365 days
  const baseAmount = (Number(stakedAmount) * tokenPrice * 0.1) / 365;
  return baseAmount * multiplier;
};

const TokenPage: NextPage = () => {
  const { address, isConnected, chain } = useAccount();

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

  const { data: creditBalance, isLoading: isLoadingCredits } = useQuery({
    queryKey: ["credits", address],
    queryFn: () => fetchCredits(address as string),
    enabled: !!address && isConnected,
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: stakingData, isLoading: isLoadingStaking } = useStakingData(address);

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

  const { stake, unstake } = useStakingTransactions();

  useMemo(() => {
    if (!bonsaiBalance || bonsaiBalance === BigInt(0)) {
      setBonsaiPrice(0);
      return;
    }
    const tokenPrice = queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C");
    setBonsaiPrice(tokenPrice);
    const bonsaiHoldings = Number.parseFloat(formatEther(bonsaiBalance));
    setTokenHoldings(tokenPrice * bonsaiHoldings);
  }, [bonsaiBalance]);

  const formattedBalance = kFormatter(parseFloat(formatEther(bonsaiBalance || 0n)), true);

  const totalStaked = useMemo(() => {
    if (!stakingData?.summary?.totalStaked) return "0";
    return formatStakingAmount(stakingData.summary.totalStaked);
  }, [stakingData?.summary]);

  const stakedUsdValue = useMemo(() => {
    return (Number(totalStaked) * Number(bonsaiPrice)).toFixed(2);
  }, [totalStaked, bonsaiPrice]);

  const averageMultiplier = useMemo(() => {
    if (!stakingData?.stakes.length) return 1;
    const totalMultiplier = stakingData.stakes.reduce((sum, stake) => {
      return sum + getCreditsMultiplier(Number(stake.lockupPeriod));
    }, 0);
    return (totalMultiplier / stakingData.stakes.length).toFixed(1);
  }, [stakingData?.stakes]);

  // Format the next reset time
  const formatNextReset = (nextResetTime: string) => {
    const reset = new Date(nextResetTime);
    return reset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Add safe checks for stakes array
  const activeStakes = stakingData?.stakes || [];
  const hasActiveStakes = activeStakes.length > 0;

  const handleStake = async (amount: string, lockupPeriod: number) => {
    try {
      if (chain?.id !== lens.id) {
        try {
          await switchChain(configureChainsConfig, { chainId: lens.id });
        } catch {
          toast.error("Please switch to Lens");
          return;
        }
      }
      await stake(amount, lockupPeriod);
      setIsStakeModalOpen(false);
    } catch (error) {
      console.error("Staking error:", error);
    }
  };

  const handleUnstake = async (stakeIndex: number) => {
    try {
      if (chain?.id !== lens.id) {
        try {
          await switchChain(configureChainsConfig, { chainId: lens.id });
        } catch {
          toast.error("Please switch to Lens");
          return;
        }
      }
      await unstake(stakeIndex);
    } catch (error) {
      console.error("Unstaking error:", error);
    }
  };

  const onBridge = async (txHash: `0x${string}`) => {
    setBridgeInfo({ txHash });

    const checkDeliveryStatus = async () => {
      try {
        const response = await fetch(`https://scan.layerzero-api.com/v1/messages/tx/${txHash}`);
        const data = await response.json();

        if (data.data[0].status.name === "DELIVERED") {
          // Refetch bonsai balance
          refetchBonsaiBalance();
          clearInterval(statusInterval);
          setBridgeInfo(undefined);
        }
      } catch (error) {
        console.error("Error checking bridge status:", error);
      }
    };

    const statusInterval = setInterval(checkDeliveryStatus, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(statusInterval);
  };

  // Calculate credits per day for a given amount and lockup period
  const calculateCreditsPerDay = (amount: string, lockupPeriod: number) => {
    if (!amount || Number(amount) <= 0) return 0;

    // Use TWAP price if available, otherwise fall back to spot price
    const priceToUse = twapPrice || bonsaiPrice;
    if (!priceToUse) return 0;

    const multiplier = getCreditsMultiplier(lockupPeriod);
    return calculateDailyStakingCredits(amount, priceToUse, multiplier);
  };

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 pt-6">
        <section aria-labelledby="studio-heading" className="pt-0 pb-24 max-w-full">
          <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-10 max-w-full">
            <div className="lg:col-span-2">
              <Sidebar />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8">
              <div className="bg-card rounded-xl p-6">
                <div className="flex space-x-2">
                  <Header2>Bonsai Token</Header2>
                  <WalletButton wallet={PROTOCOL_DEPLOYMENT.lens.Bonsai} chain="lens" />
                </div>
                {/* <Subtitle className="mt-1">Own a share of unrestricted intelligence.</Subtitle> */}
                <Subtitle className="mt-2">
                  Stake $BONSAI on Lens Chain to earn API credits. The longer the lockup, the more credits you earn.
                  Credits reset daily at midnight UTC.
                </Subtitle>
              </div>

              <div className="space-y-8 mt-6">
                {/* Top Row - Available, Rewards, and Staked Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Available Card */}
                  <div className="bg-card rounded-xl p-6">
                    <div className="pb-2">
                      <h3 className="text-sm font-medium text-primary">Balance</h3>
                    </div>
                    <div>
                      {isConnected ? (
                        <>
                          <div className="text-2xl font-bold text-secondary">{formattedBalance} $BONSAI</div>
                          <p className="text-xs text-secondary/60">${tokenHoldings.toFixed(2)}</p>
                          <div className="mt-4 flex justify-end space-x-2">
                            <Button variant="dark-grey" size="sm" onClick={() => setIsBridgeModalOpen(true)}>
                              {!bridgeInfo?.txHash && "Bridge"}
                              {bridgeInfo?.txHash && (
                                <div className="flex items-center gap-2 flex-row">
                                  <Spinner customClasses="h-4 w-4" color="#E42101" />
                                  <span>Bridging</span>
                                </div>
                              )}
                            </Button>
                            <Button variant="accent" size="sm">
                              Buy $BONSAI
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-secondary/60 mb-4">Connect your wallet to view your balance</p>
                          <Button variant="accent" size="sm">
                            Connect Wallet
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rewards Card */}
                  <div className="bg-card rounded-xl p-6">
                    <div className="pb-2">
                      <h3 className="text-sm font-medium text-primary">Staking Rewards</h3>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-secondary">Coming Soon</div>
                      <p className="text-xs text-secondary/60">80% APY</p>
                      <div className="mt-4 flex justify-end gap-2">
                        <Button variant="accent" size="sm" disabled>
                          Claim
                        </Button>
                        <Button variant="accent" size="sm" disabled>
                          Claim & Restake
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Staked Card */}
                  <div className="bg-card rounded-xl p-6">
                    <div className="pb-2">
                      <h3 className="text-sm font-medium text-primary">Staked</h3>
                    </div>
                    {isConnected ? (
                      <div>
                        <div className="text-2xl font-bold text-secondary">{totalStaked} $BONSAI</div>
                        <p className="text-xs text-secondary/60">${stakedUsdValue}</p>
                        <div className="mt-4 flex justify-between items-center">
                          <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-0.5 rounded">
                            {averageMultiplier}× Credits
                          </span>
                          <Button variant="accent" size="sm" onClick={() => setIsStakeModalOpen(true)}>
                            Stake
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-secondary/60 mb-4">Connect your wallet to view staking</p>
                        <Button variant="accent" size="sm">
                          Connect Wallet
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* API Capacity Card */}
                <div className="bg-card rounded-xl p-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-4">
                    {isConnected ? (
                      <>
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-primary">My Capacity Today</h3>
                          {/* TODO: credits to post generations */}
                          <div className="text-2xl font-bold text-secondary">
                            ~{Number(creditBalance?.creditsRemaining) / 2} post generations
                          </div>
                          <p className="text-xs text-secondary/60">
                            {creditBalance?.creditsUsed || 0} credits used of {creditBalance?.totalCredits || 0} total
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-primary">Next Reset</h3>
                          <div className="text-2xl font-bold text-secondary">
                            {creditBalance ? formatNextReset(creditBalance.nextResetTime) : "--:--"}
                          </div>
                          <p className="text-xs text-secondary/60">
                            Credits will reset to {creditBalance?.totalCredits || 0}
                          </p>
                        </div>

                        <div className="flex items-center justify-center">
                          <div className="relative h-24 w-24">
                            <svg className="w-full h-full transform -rotate-90">
                              {/* Background circle */}
                              <circle cx="48" cy="48" r="44" className="stroke-card-light fill-none" strokeWidth="4" />
                              {/* Progress circle */}
                              <circle
                                cx="48"
                                cy="48"
                                r="44"
                                className="fill-none transition-all duration-300 ease-in-out"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 44}`}
                                strokeDashoffset={`${
                                  2 *
                                  Math.PI *
                                  44 *
                                  (1 - (creditBalance?.creditsRemaining || 0) / (creditBalance?.totalCredits || 1))
                                }`}
                                stroke={
                                  creditBalance?.creditsRemaining && creditBalance?.totalCredits
                                    ? creditBalance.creditsRemaining / creditBalance.totalCredits > 0.66
                                      ? "#22c55e" // Green for > 66% remaining
                                      : creditBalance.creditsRemaining / creditBalance.totalCredits > 0.33
                                      ? "#eab308" // Yellow for 33-66% remaining
                                      : "#ef4444" // Red for < 33% remaining
                                    : "#22c55e"
                                }
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-2xl font-bold text-secondary">
                                {creditBalance
                                  ? Math.round((creditBalance.creditsRemaining / creditBalance.totalCredits) * 100)
                                  : 100}
                                %
                              </div>
                              <div className="text-xs text-secondary/60">Remaining</div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-3 text-center py-8">
                        <p className="text-sm text-secondary/60 mb-4">Connect your wallet to view your API credits</p>
                        <Button variant="accent" size="sm">
                          Connect Wallet
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Stakes List */}
                {isConnected && hasActiveStakes && (
                  <div className="bg-card rounded-xl p-6">
                    <h3 className="text-sm font-medium text-primary mb-4">Active Stakes</h3>
                    <div className="space-y-4">
                      {activeStakes.map((stake, index) => (
                        <div key={stake.id} className="flex items-center justify-between p-4 bg-card-light rounded-lg">
                          <div>
                            <div className="text-lg font-semibold">{formatStakingAmount(stake.amount)} $BONSAI</div>
                            <div className="text-xs text-secondary/60">
                              {getLockupPeriodLabel(stake.lockupPeriod)} Lock •{" "}
                              {getCreditsMultiplier(Number(stake.lockupPeriod))}× Credits
                            </div>
                            <div className="text-xs text-secondary/60 mt-1">
                              ~
                              {calculateDailyStakingCredits(
                                formatStakingAmount(stake.amount),
                                twapPrice || bonsaiPrice,
                                getCreditsMultiplier(Number(stake.lockupPeriod)),
                              ).toFixed(2)}{" "}
                              credits/day
                            </div>
                          </div>
                          <div className="flex items-center gap-x-6">
                            <div className="text-right">
                              <div className="text-sm">Unlocks</div>
                              <div className="text-xs text-secondary/60">
                                {Date.now() >= Number(stake.unlockTime) * 1000
                                  ? "Unlocked"
                                  : new Date(Number(stake.unlockTime) * 1000).toLocaleDateString()}
                              </div>
                            </div>
                            <Button
                              variant="dark-grey"
                              size="sm"
                              className="hover:bg-bullish"
                              onClick={() => handleUnstake(index)}
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
                  panelClassnames="w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
                >
                  <StakeModal
                    maxAmount={formatEther(bonsaiBalance || 0n)}
                    onStake={handleStake}
                    onClose={() => setIsStakeModalOpen(false)}
                    calculateCreditsPerDay={calculateCreditsPerDay}
                    twapPrice={twapPrice || bonsaiPrice}
                  />
                </Modal>

                {/* Bridge Modal */}
                <Modal
                  onClose={() => setIsBridgeModalOpen(false)}
                  open={isBridgeModalOpen}
                  setOpen={setIsBridgeModalOpen}
                  panelClassnames="w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
                >
                  <BridgeModal bonsaiBalance={bonsaiBalance} onBridge={onBridge} bridgeInfo={bridgeInfo} />
                </Modal>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TokenPage;
