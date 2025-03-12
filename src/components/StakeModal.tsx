import { useState } from "react";
import { Button } from "./Button";

interface StakeModalProps {
  onClose: () => void;
  onStake: (amount: string, lockupPeriod: number) => void;
  maxAmount: string;
  calculateCreditsPerDay: (amount: string, lockupPeriod: number) => number;
  twapPrice?: number;
}

const LOCKUP_PERIODS = [
  { label: "No Lock", value: 0, multiplier: 1 },
  { label: "1 Month", value: 30 * 24 * 60 * 60, multiplier: 1.25 },
  { label: "3 Months", value: 90 * 24 * 60 * 60, multiplier: 1.5 },
  { label: "6 Months", value: 180 * 24 * 60 * 60, multiplier: 2 },
  { label: "12 Months", value: 360 * 24 * 60 * 60, multiplier: 3 },
];

export const StakeModal = ({ onClose, onStake, maxAmount, calculateCreditsPerDay, twapPrice }: StakeModalProps) => {
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

  // Calculate estimated daily credits
  const estimatedDailyCredits = calculateCreditsPerDay(amount, selectedPeriod.value);

  return (
    <div className="space-y-6 min-w-[450px] text-secondary font-sans">
      <div>
        <h3 className="text-lg font-medium mb-4 font-sf-pro-text">Stake $BONSAI</h3>
      </div>

      <div className="space-y-4 font-sf-pro-text">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-card-light rounded-lg px-4 py-2 text-secondary font-sans"
              placeholder="0.00"
            />
            <button
              onClick={handleMax}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Lockup Period Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Lockup Period</label>
          <div className="grid grid-cols-2 gap-2">
            {LOCKUP_PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => setSelectedPeriod(period)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedPeriod.value === period.value
                    ? "bg-primary/20 text-primary"
                    : "bg-card-light text-secondary hover:bg-primary/10"
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
              <span className="text-sm font-medium">Estimated Daily Credits:</span>
              <span className="text-lg font-bold text-primary">{estimatedDailyCredits.toFixed(1)}</span>
            </div>
            <div className="text-xs text-secondary/60 mt-1">
              Based on current $BONSAI price and {selectedPeriod.multiplier}× multiplier
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
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