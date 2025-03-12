import { NextPage } from "next";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import { Header2, Subtitle } from "@src/styles/text";
import { Button } from "@src/components/Button";
import { useEffect, useState, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";
import { formatEther } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useStakingData, formatStakingAmount, getLockupPeriodLabel } from "@src/hooks/useStakingData";
import { useStakingTransactions } from "@src/hooks/useStakingTransactions";
import { StakeModal } from "@src/components/StakeModal";
import { Modal } from "@src/components/Modal";

interface CreditBalance {
  totalCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  nextResetTime: string;
  usagePercentage: number;
}

const fetchCredits = async (address: string): Promise<CreditBalance> => {
  const response = await fetch(`/api/credits/balance?address=${address}`);
  if (!response.ok) throw new Error("Failed to fetch credits");
  return response.json();
};

const getCreditsMultiplier = (lockupPeriod: number) => {
  // Convert seconds to months roughly
  const months = Math.floor(lockupPeriod / (30 * 24 * 60 * 60));
  
  if (months >= 12) return 5; // 12-month lock: 5x
  if (months >= 6) return 3;  // 6-month lock: 3x
  if (months >= 3) return 2;  // 3-month lock: 2x
  if (months >= 1) return 1.5; // 1-month lock: 1.5x
  return 1; // no lock: 1x
};

const TokenPage: NextPage = () => {
  const { address, isConnected } = useAccount();

  const { data: bonsaiBalance } = useBalance({
    address,
    token: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
  });

  const { data: creditBalance, isLoading: isLoadingCredits } = useQuery({
    queryKey: ["credits", address],
    queryFn: () => fetchCredits(address as string),
    enabled: !!address && isConnected,
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: stakingData, isLoading: isLoadingStaking } = useStakingData(address);

  const [bonsaiPrice, setBonsaiPrice] = useState(0);
  const [tokenHoldings, setTokenHoldings] = useState(0);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);

  const { stake, unstake } = useStakingTransactions();

  useMemo(() => {
    if (!bonsaiBalance?.value || bonsaiBalance.value === BigInt(0)) {
      setBonsaiPrice(0);
      return;
    }
    const tokenPrice = queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C");
    setBonsaiPrice(tokenPrice);
    const bonsaiHoldings = Number.parseFloat(formatEther(bonsaiBalance.value));
    setTokenHoldings(tokenPrice * bonsaiHoldings);
  }, [bonsaiBalance?.value]);

  const formattedBalance = bonsaiBalance ? Number(bonsaiBalance.formatted).toFixed(2) : "0";

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
      await stake(amount, lockupPeriod);
      setIsStakeModalOpen(false);
    } catch (error) {
      console.error("Staking error:", error);
    }
  };

  const handleUnstake = async (stakeIndex: number) => {
    try {
      await unstake(stakeIndex);
    } catch (error) {
      console.error("Unstaking error:", error);
    }
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
                <Header2>Bonsai Token</Header2>
                {/* <Subtitle className="mt-1">Own a share of unrestricted intelligence.</Subtitle> */}
                <Subtitle className="mt-1">Stake $BONSAI on Lens Chain to earn API credits. The longer the lockup, the more credits you earn. Credits reset daily at midnight UTC.</Subtitle>
              </div>

              <div className="space-y-8 mt-6">
                {/* Top Row - Available, Rewards, and Staked Cards */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Available Card */}
                  <div className="bg-card rounded-xl p-6">
                    <div className="pb-2">
                      <h3 className="text-sm font-medium text-primary">Available</h3>
                    </div>
                    <div>
                      {isConnected ? (
                        <>
                          <div className="text-2xl font-bold text-secondary">{formattedBalance} $BONSAI</div>
                          <p className="text-xs text-secondary/60">${tokenHoldings.toFixed(2)}</p>
                          <div className="mt-4 flex justify-end">
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
                      <h3 className="text-sm font-medium text-primary">Rewards</h3>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-secondary">Coming Soon</div>
                      <p className="text-xs text-secondary/60">Coming Soon</p>
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
                  <div className="pb-2">
                    <h3 className="text-sm font-medium text-primary">
                      Total API Capacity: {isConnected ? creditBalance?.totalCredits || 0 : "---"} Credits
                    </h3>
                    <p className="text-xs text-secondary/60">Credits reset daily at midnight UTC</p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-4">
                    {isConnected ? (
                      <>
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-primary">My Capacity Today</h3>
                          <div className="text-2xl font-bold text-secondary">
                            {creditBalance?.creditsRemaining.toFixed(2) || "0"} Credits
                          </div>
                          <p className="text-xs text-secondary/60">
                            {creditBalance?.creditsUsed || 0} used of {creditBalance?.totalCredits || 0} total
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
                                strokeDashoffset={`${2 * Math.PI * 44 * ((creditBalance?.usagePercentage || 0) / 100)}`}
                                stroke={
                                  creditBalance?.creditsRemaining
                                    ? creditBalance.creditsRemaining > 66
                                      ? "#22c55e" // Green for > 66% remaining
                                      : creditBalance.creditsRemaining > 33
                                      ? "#eab308" // Yellow for 33-66% remaining
                                      : "#ef4444" // Red for < 33% remaining
                                    : "#22c55e"
                                }
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <div className="text-2xl font-bold text-secondary">
                                {creditBalance ? 100 - Math.round(creditBalance.usagePercentage) : 100}%
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
                        <div
                          key={stake.id}
                          className="flex items-center justify-between p-4 bg-card-light rounded-lg"
                        >
                          <div>
                            <div className="text-lg font-semibold">{formatStakingAmount(stake.amount)} $BONSAI</div>
                            <div className="text-xs text-secondary/60">
                              {getLockupPeriodLabel(stake.lockupPeriod)} Lock • {getCreditsMultiplier(Number(stake.lockupPeriod))}×
                              Credits
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm">Unlocks</div>
                              <div className="text-xs text-secondary/60">
                                {Date.now() >= Number(stake.unlockTime) * 1000 
                                  ? "Unlocked"
                                  : new Date(Number(stake.unlockTime) * 1000).toLocaleDateString()
                                }
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
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
                    maxAmount={formattedBalance}
                    onStake={handleStake}
                    onClose={() => setIsStakeModalOpen(false)}
                  />
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
