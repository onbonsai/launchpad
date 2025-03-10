import { NextPage } from "next";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import { Header2, Subtitle } from "@src/styles/text";
import { Button } from "@src/components/Button";

const TokenPage: NextPage = () => {
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

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Rewards Card */}
                <div className="bg-card rounded-xl p-6">
                  <div className="pb-2">
                    <h3 className="text-sm font-medium text-primary">Rewards</h3>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary">0.647715 $BONSAI</div>
                    <p className="text-xs text-secondary/60">$1.79</p>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="accent" size="sm">Claim</Button>
                      <Button variant="accent" size="sm">Claim & Restake</Button>
                    </div>
                  </div>
                </div>

                {/* Available Card */}
                <div className="bg-card rounded-xl p-6">
                  <div className="pb-2">
                    <h3 className="text-sm font-medium text-primary">Available</h3>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary">0 $BONSAI</div>
                    <p className="text-xs text-secondary/60">$0.01</p>
                    <div className="mt-4 flex justify-end">
                      <Button variant="accent" size="sm">Buy $BONSAI</Button>
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
                      <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-0.5 rounded">APR 83.86%</span>
                      <Button variant="secondary" size="sm">Unstake</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Capacity Card */}
              <div className="bg-card rounded-xl p-6 mt-8">
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
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TokenPage;