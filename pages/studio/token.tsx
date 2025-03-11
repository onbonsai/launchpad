import { NextPage } from "next";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import { Header2, Subtitle } from "@src/styles/text";
import { Button } from "@src/components/Button";
import { useEffect, useState, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import queryFiatViaLIFI from "@src/utils/tokenPriceHelper";
import { formatEther } from "viem";

const TokenPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { data: bonsaiBalance } = useBalance({
    address,
    token: PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`,
  });

  const [bonsaiPrice, setBonsaiPrice] = useState(0);

  useMemo(() => {
    if (!bonsaiBalance?.value || bonsaiBalance.value === BigInt(0)) {
      setBonsaiPrice(0);
      return;
    }
    const tokenPrice = queryFiatViaLIFI(8453, "0x474f4cb764df9da079D94052fED39625c147C12C");
    const bonsaiHoldings = Number.parseFloat(formatEther(bonsaiBalance.value));
    const tokenHoldings = tokenPrice * bonsaiHoldings;
    setBonsaiPrice(tokenHoldings);
  }, [bonsaiBalance?.value]);

  const formattedBalance = bonsaiBalance ? Number(bonsaiBalance.formatted).toFixed(2) : "0";
  const usdValue = bonsaiPrice.toFixed(2);

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
                <Subtitle className="mt-1">Own a share of unrestricted intelligence</Subtitle>
              </div>

              <div className="space-y-8">
                {/* Available Card - With Real Balance */}
                <div className="bg-card rounded-xl p-6 max-w-md mt-6">
                  <div className="pb-2">
                    <h3 className="text-sm font-medium text-primary">Available</h3>
                  </div>
                  <div>
                    {isConnected ? (
                      <>
                        <div className="text-2xl font-bold text-secondary">{formattedBalance} $BONSAI</div>
                        <p className="text-xs text-secondary/60">${usdValue}</p>
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

                {/* API Capacity Card */}
                <div className="bg-card rounded-xl p-6">
                  <div className="pb-2">
                    <h3 className="text-sm font-medium text-primary">Total API Capacity: 181,480 Credits</h3>
                    <p className="text-xs text-secondary/60">1 $BONSAI = 0.163 Credits per day</p>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-primary">My Capacity Today</h3>
                      <div className="text-2xl font-bold text-secondary">16.0228 Credits</div>
                      <p className="text-xs text-secondary/60">0 used of 16.023 balance</p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-primary">My Capacity Tomorrow</h3>
                      <div className="text-2xl font-bold text-secondary">16.0228 Credits</div>
                      <p className="text-xs text-secondary/60">Estimated balance at next epoch</p>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="relative h-24 w-24 flex items-center justify-center rounded-full border-4 border-card-light">
                        <div className="text-2xl font-bold text-secondary">0%</div>
                        <div className="text-xs text-secondary/60 absolute bottom-1">Used</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rewards and Staking Section */}
                <div className="relative">
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="bg-background/80 backdrop-blur-sm px-6 py-3 rounded-lg">
                      <span className="text-lg font-semibold text-primary">Rewards and Staking Coming Soon!</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 filter blur-[6px]">
                    {/* Rewards Card */}
                    <div className="bg-card rounded-xl p-6">
                      <div className="pb-2">
                        <h3 className="text-sm font-medium text-primary">Rewards</h3>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-secondary">0.647715 $BONSAI</div>
                        <p className="text-xs text-secondary/60">$1.79</p>
                        <div className="mt-4 flex justify-end gap-2">
                          <Button variant="accent" size="sm">
                            Claim
                          </Button>
                          <Button variant="accent" size="sm">
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
                      <div>
                        <div className="text-2xl font-bold text-secondary">98 $BONSAI</div>
                        <p className="text-xs text-secondary/60">$271</p>
                        <div className="mt-4 flex justify-between items-center">
                          <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-0.5 rounded">
                            APR 83.86%
                          </span>
                          <Button variant="secondary" size="sm">
                            Unstake
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TokenPage;
