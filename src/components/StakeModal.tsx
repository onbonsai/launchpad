import { useState } from "react";
import { Button } from "./Button";
import { Dialog } from "@headlessui/react";
import { Subtitle } from "@src/styles/text";
import clsx from "clsx";
import { StakingSummary } from "../../pages/studio/stakingCalculator";

interface StakeModalProps {
  onClose: () => void;
  onStake: (amount: string, lockupPeriod: number) => void;
  maxAmount: string;
  calculateCreditsPerDay: (amount: string, lockupPeriod: number) => number;
  twapPrice?: number;
  stakingSummary?: StakingSummary | null;
}

const LOCKUP_PERIODS = [
  { label: "No Lockup", value: 0, multiplier: 1 },
  { label: "1 Month", value: 30 * 24 * 60 * 60, multiplier: 1.25 },
  { label: "3 Months", value: 90 * 24 * 60 * 60, multiplier: 1.5 },
  { label: "6 Months", value: 180 * 24 * 60 * 60, multiplier: 2 },
  { label: "12 Months", value: 360 * 24 * 60 * 60, multiplier: 3 },
];

export const StakeModal = ({
  onClose,
  onStake,
  maxAmount,
  calculateCreditsPerDay,
  twapPrice,
  stakingSummary,
}: StakeModalProps) => {
  const [amount, setAmount] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(LOCKUP_PERIODS[0]);

  const handleMax = () => {
    setAmount(maxAmount);
  };

  const handleStake = () => {
    onStake(amount, selectedPeriod.value);
    onClose();
    setAmount("");
    setSelectedPeriod(LOCKUP_PERIODS[0]);
  };

  const sharedInputClasses =
    "bg-card-light rounded-xl text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm";

  // Calculate estimated daily credits
  const estimatedAdditionalCredits = calculateCreditsPerDay(amount, selectedPeriod.value);

  // Format the estimated credits
  const formattedCredits = estimatedAdditionalCredits.toFixed(1);

  // Calculate USD value
  const usdValue = Number(amount) * (twapPrice || 0);
  const effectiveUsdValue = usdValue * selectedPeriod.multiplier;

  return (
    <div className="space-y-6 min-w-[450px] text-secondary font-sans">
      <div className="flex items-center justify-between">
        <Dialog.Title as="h2" className="text-2xl leading-7 font-bold">
          Stake $BONSAI
        </Dialog.Title>
      </div>

      <div className="space-y-4 font-sf-pro-text">
        {/* Amount Input */}
        <div className="flex flex-col justify-between gap-2">
          <div className="flex items-center gap-1">
            <Subtitle className="text-white/70">Amount</Subtitle>
          </div>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={clsx("w-full pr-4", sharedInputClasses)}
              placeholder="0"
            />
            <button onClick={handleMax} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-bullish">
              MAX
            </button>
          </div>
        </div>

        {/* Lockup Period Selection */}
        <div className="flex flex-col justify-between gap-2">
          <div className="flex items-center gap-1">
            <Subtitle className="text-white/70">Lockup Period</Subtitle>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LOCKUP_PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedPeriod.value === period.value
                    ? "bg-bullish/20 text-bullish"
                    : "bg-card-light text-secondary hover:bg-bullish/10"
                }`}
              >
                <div className="text-sm font-medium">{period.label}</div>
                <div className="text-xs opacity-60">{period.multiplier}× Credits</div>
              </button>
            ))}
          </div>
        </div>

        {/* Credits Estimate */}
        {twapPrice && amount && Number(amount) > 0 && (
          <div className="mt-4 p-4 bg-card-light rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Estimated Additional Daily Credits:</span>
              <span className="text-lg font-bold text-primary">{formattedCredits}</span>
            </div>
            <div className="text-xs text-secondary/60 mt-1">
              Based on current $BONSAI price (${twapPrice?.toFixed(2)}) and {selectedPeriod.multiplier}× multiplier
            </div>

            {Number(estimatedAdditionalCredits) > 0 && (
              <div className="mt-3 pt-3 border-t border-card-light/20">
                <div className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span>Stake value:</span>
                    <span>${usdValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1 font-medium">
                    <span>Effective value with {selectedPeriod.multiplier}× multiplier:</span>
                    <span>${effectiveUsdValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-card-light/20 text-xs">
                    <p>Credit calculation tiers:</p>
                  </div>
                  <div className="text-xs mt-1 text-secondary/80">
                    <div className="grid grid-cols-3 gap-x-2">
                      <div>First $20 = 0.5× credits</div>
                      <div>$21-$100 = 0.25× credits</div>
                      <div>$101+ = 0.1× credits</div>
                    </div>
                    <div className="mt-2 text-secondary/60">Maximum staking credits: 100 (+ 10 free tier credits)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button
            size="md"
            variant="accentBrand"
            className="w-full hover:bg-bullish"
            onClick={handleStake}
            disabled={!amount || Number(amount) <= 0}
          >
            Stake
          </Button>
        </div>
      </div>
    </div>
  );
};
