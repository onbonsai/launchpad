import { NextPage } from "next";
import { Header2, Subtitle } from "@src/styles/text";
import { Button } from "@src/components/Button";
import { switchChain } from "viem/actions";
import { useState, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import ConfettiExplosion from "react-confetti-explosion";
import { lens, LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";
import { erc20Abi, formatEther } from "viem";
import { useStakingData, formatStakingAmount, getLockupPeriodLabel } from "@src/hooks/useStakingData";
import { useStakingTransactions } from "@src/hooks/useStakingTransactions";
import { Modal } from "@src/components/Modal";
import WalletButton from "@src/components/Creators/WalletButton";
import { kFormatter } from "@src/utils/utils";
import BridgeModal from "@pagesComponents/Studio/BridgeModal";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import toast from "react-hot-toast";

import { useRouter } from "next/router";
import BuySellModal from "@pagesComponents/Club/BuySellModal";
import { SWAP_TO_BONSAI_POST_ID } from "@src/services/madfi/moneyClubs";
import Image from "next/image";

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

  const { data: stakingData, refetch: refetchStakingData } = useStakingData(address);

  const [bonsaiPrice, setBonsaiPrice] = useState(0);
  const [tokenHoldings, setTokenHoldings] = useState(0);
  const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
  const [bridgeInfo, setBridgeInfo] = useState<{ txHash: `0x${string}` }>();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const [showBuyModal, setShowBuyModal] = useState(false);

  const { stake, unstake } = useStakingTransactions();

  useEffect(() => {
    const { bridge } = router.query;
    if (!!bridge) {
      setIsBridgeModalOpen(true);
    }
  }, [router.query]);

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

  // Add safe checks for stakes array
  const activeStakes = stakingData?.stakes || [];
  const hasActiveStakes = activeStakes.length > 0;

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
                      <Image
                        src="/bonsai.png"
                        alt="bonsai"
                        className="object-cover rounded-lg"
                        height={24}
                        width={24}
                      />
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
                          <div className="text-2xl font-bold text-secondary">{formattedBalance} $IASNOB</div>
                          <p className="text-xs text-secondary/60">${tokenHoldings.toFixed(2)}</p>
                          <div className="mt-4 flex justify-end space-x-2">
                            {/* <Button
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
                            </Button> */}
                            {/* <Button variant="accent" size="sm" onClick={() => setShowBuyModal(true)}>
                              Buy $BONSAI
                            </Button> */}
                            <Button variant="accent" size="sm" onClick={() => window.open("https://oku.trade/?inputChain=lens&inToken=0x6bDc36E20D267Ff0dd6097799f82e78907105e2F&outToken=0x302AC2BF6D20572F125e21bEB83e5a4e5F1Fe4B5", "_blank")}>
                              Buy $IASNOB
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

                  {/* Staked Card */}
                  <div className="bg-card rounded-lg p-6">
                    <div className="pb-2">
                      <h3 className="text-sm font-medium text-brand-highlight">Staked</h3>
                    </div>
                    {isConnected ? (
                      <div>
                        <div className="text-2xl font-bold text-secondary">{totalStaked} $BONSAI</div>
                        <p className="text-xs text-secondary/60">${stakedUsdValue}</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-secondary/60 mb-4">Connect your wallet to view staking</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Stakes List */}
                {isConnected && hasActiveStakes && (
                  <div className="bg-card rounded-lg p-6">
                    <h3 className="text-sm font-medium text-brand-highlight mb-4">Active Stakes</h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {/* Existing stakes */}
                      {activeStakes.map((stake) => (
                        <div key={stake.id} className="flex items-center justify-between p-4 bg-card-light rounded-lg">
                          <div>
                            <div className="text-lg font-semibold">{formatStakingAmount(stake.amount)} $BONSAI</div>
                            <div className="text-xs text-secondary/60">
                              {getLockupPeriodLabel(stake.lockupPeriod)} Lock •{" "}
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
