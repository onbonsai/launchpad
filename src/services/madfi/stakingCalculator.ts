import { formatEther, parseEther } from "viem";

export interface StakingSummary {
  id: string;
  totalStaked: string;
  activeStakes: string;
  noLockupAmount: string;
  oneMonthLockupAmount: string;
  threeMonthLockupAmount: string;
  sixMonthLockupAmount: string;
  twelveMonthLockupAmount: string;
  lastUpdated: string;
}

// Type for lockup periods
export type LockupPeriod = 0 | 1 | 3 | 6 | 12;

// Constants from the credit model
const FREE_TIER_CREDITS = 10;
const TIER1_RATE = 0.5; // Credits per dollar for first $20
const TIER1_MAX = 20; // First $20 staked
const TIER2_RATE = 0.25; // Credits per dollar for $21-$100
const TIER2_MAX = 100; // Up to $100 staked
const TIER3_RATE = 0.1; // Credits per dollar for $101+
const MAX_STAKING_CREDITS = 100; // Maximum staking credits (without multipliers)

/**
 * Calculate credits based on a staking summary and token price
 *
 * @param summary - The staking summary from subgraph
 * @param tokenPrice - Current token price in USD
 * @returns Total staking credits
 */
function calculateExistingCredits(summary: StakingSummary, tokenPrice: number): number {
  // Calculate USD values for each lockup period
  const noLockupValue = Number(formatEther(BigInt(summary.noLockupAmount))) * tokenPrice;
  const oneMonthValue = Number(formatEther(BigInt(summary.oneMonthLockupAmount))) * tokenPrice;
  const threeMonthValue = Number(formatEther(BigInt(summary.threeMonthLockupAmount))) * tokenPrice;
  const sixMonthValue = Number(formatEther(BigInt(summary.sixMonthLockupAmount))) * tokenPrice;
  const twelveMonthValue = Number(formatEther(BigInt(summary.twelveMonthLockupAmount))) * tokenPrice;

  // Calculate values with multipliers applied
  const noLockupWithMultiplier = noLockupValue * 1;
  const oneMonthWithMultiplier = oneMonthValue * 1.25;
  const threeMonthWithMultiplier = threeMonthValue * 1.5;
  const sixMonthWithMultiplier = sixMonthValue * 2;
  const twelveMonthWithMultiplier = twelveMonthValue * 3;

  // Sum all values with their multipliers
  const totalValueWithMultipliers =
    noLockupWithMultiplier +
    oneMonthWithMultiplier +
    threeMonthWithMultiplier +
    sixMonthWithMultiplier +
    twelveMonthWithMultiplier;

  return applyTieredCalculation(totalValueWithMultipliers);
}

/**
 * Apply the tiered credit calculation to a value with multipliers
 *
 * @param valueWithMultipliers - The staked value after multipliers
 * @returns Calculated credits
 */
function applyTieredCalculation(valueWithMultipliers: number): number {
  let stakingCredits = 0;

  // First tier: 0.5 credits per dollar for first $20
  if (valueWithMultipliers > 0) {
    stakingCredits += Math.min(TIER1_MAX, valueWithMultipliers) * TIER1_RATE;
  }

  // Second tier: 0.25 credits per dollar for $21-$100
  if (valueWithMultipliers > TIER1_MAX) {
    stakingCredits += Math.min(TIER2_MAX - TIER1_MAX, valueWithMultipliers - TIER1_MAX) * TIER2_RATE;
  }

  // Third tier: 0.1 credits per dollar for $101+
  if (valueWithMultipliers > TIER2_MAX) {
    stakingCredits += (valueWithMultipliers - TIER2_MAX) * TIER3_RATE;
  }

  // Apply maximum cap
  stakingCredits = Math.min(stakingCredits, MAX_STAKING_CREDITS);

  // Round to 2 decimal places
  return Math.round(stakingCredits * 100) / 100;
}

/**
 * Calculate estimated credits for a new stake, considering existing stakes
 *
 * @param newStakeAmountUSD - The new amount being staked in USD
 * @param newLockupPeriod - The lockup period for the new stake (0, 1, 3, 6, or 12 months)
 * @param tokenPrice - Current token price in USD
 * @param existingSummary - User's existing staking summary from subgraph (optional)
 * @param includeFreeTier - Whether to include free tier credits in the total
 * @returns Object containing credit calculations
 */
export function calculateStakingCredits(
  newStakeAmountUSD: number,
  newLockupPeriod: LockupPeriod,
  tokenPrice: number,
  existingSummary?: StakingSummary | null,
  includeFreeTier: boolean = true,
): {
  currentCredits: number;
  newTotalCredits: number;
  incrementalCredits: number;
  withFreeTier: number;
} {
  // Calculate current credits from existing stakes (if any)
  const currentCredits = existingSummary ? calculateExistingCredits(existingSummary, tokenPrice) : 0;

  // Create a modified summary including the new stake
  let modifiedSummary: StakingSummary;

  if (existingSummary) {
    // Clone the existing summary
    modifiedSummary = { ...existingSummary };

    // Convert USD to token amount
    const newStakeAmountTokens = newStakeAmountUSD / tokenPrice;
    const newStakeAmountWei = parseEther(newStakeAmountTokens.toString());

    // Add the new stake to the appropriate lockup period
    switch (newLockupPeriod) {
      case 0:
        modifiedSummary.noLockupAmount = (BigInt(modifiedSummary.noLockupAmount) + 
          newStakeAmountWei).toString();
        break;
      case 1:
        modifiedSummary.oneMonthLockupAmount = (BigInt(modifiedSummary.oneMonthLockupAmount) + 
          newStakeAmountWei).toString();
        break;
      case 3:
        modifiedSummary.threeMonthLockupAmount = (BigInt(modifiedSummary.threeMonthLockupAmount) + 
          newStakeAmountWei).toString();
        break;
      case 6:
        modifiedSummary.sixMonthLockupAmount = (BigInt(modifiedSummary.sixMonthLockupAmount) + 
          newStakeAmountWei).toString();
        break;
      case 12:
        modifiedSummary.twelveMonthLockupAmount = (BigInt(modifiedSummary.twelveMonthLockupAmount) + 
          newStakeAmountWei).toString();
        break;
    }

    // Update total staked amount
    modifiedSummary.totalStaked = (BigInt(modifiedSummary.totalStaked) + newStakeAmountWei).toString();
  } else {
    // Create a new summary with just the new stake
    const newStakeAmountTokens = newStakeAmountUSD / tokenPrice;
    const newStakeAmountWei = parseEther(newStakeAmountTokens.toString());

    modifiedSummary = {
      id: "new-user",
      totalStaked: newStakeAmountWei.toString(),
      activeStakes: "1",
      noLockupAmount: "0",
      oneMonthLockupAmount: "0",
      threeMonthLockupAmount: "0",
      sixMonthLockupAmount: "0",
      twelveMonthLockupAmount: "0",
      lastUpdated: new Date().toISOString(),
    };

    // Add the new stake to the appropriate lockup period
    switch (newLockupPeriod) {
      case 0:
        modifiedSummary.noLockupAmount = newStakeAmountWei.toString();
        break;
      case 1:
        modifiedSummary.oneMonthLockupAmount = newStakeAmountWei.toString();
        break;
      case 3:
        modifiedSummary.threeMonthLockupAmount = newStakeAmountWei.toString();
        break;
      case 6:
        modifiedSummary.sixMonthLockupAmount = newStakeAmountWei.toString();
        break;
      case 12:
        modifiedSummary.twelveMonthLockupAmount = newStakeAmountWei.toString();
        break;
    }
  }

  // Calculate new total credits with the new stake
  const newTotalCredits = calculateExistingCredits(modifiedSummary, tokenPrice);

  // Calculate incremental credits
  const incrementalCredits = newTotalCredits - currentCredits;

  // Include free tier if requested
  const withFreeTier = includeFreeTier ? FREE_TIER_CREDITS + newTotalCredits : newTotalCredits;

  return {
    currentCredits,
    newTotalCredits,
    incrementalCredits,
    withFreeTier,
  };
}

/**
 * Simplified version for calculating just the new total credits
 *
 * @param newStakeAmountUSD - Amount to stake in USD
 * @param newLockupPeriod - Lockup period in months
 * @param tokenPrice - Current token price
 * @param existingSummary - Existing staking summary
 * @returns Total credits including free tier
 */
export function calculateTotalCredits(
  newStakeAmountUSD: number,
  newLockupPeriod: LockupPeriod,
  tokenPrice: number,
  existingSummary?: StakingSummary | null,
): number {
  const result = calculateStakingCredits(newStakeAmountUSD, newLockupPeriod, tokenPrice, existingSummary);
  return result.withFreeTier;
}
