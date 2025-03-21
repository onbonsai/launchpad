import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { subgraphClient } from "@src/services/madfi/moneyClubs";
import { gql } from "@apollo/client";

interface Stake {
  id: string;
  amount: string;
  lockupPeriod: string;
  unlockTime: string;
  stakeIndex: string;
  isActive: boolean;
  createdAt: string;
  unstakeTime: string | null;
}

interface StakingSummary {
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

interface StakingData {
  stakes: Stake[];
  summary: StakingSummary | null;
}

const STAKING_QUERY = gql`
  query GetStakingData($address: Bytes!) {
    stakes(where: { user: $address, isActive: true }, orderBy: createdAt, orderDirection: asc) {
      id
      amount
      lockupPeriod
      unlockTime
      stakeIndex
      isActive
      createdAt
      unstakeTime
    }
    stakingSummary(id: $address) {
      id
      totalStaked
      activeStakes
      noLockupAmount
      oneMonthLockupAmount
      threeMonthLockupAmount
      sixMonthLockupAmount
      twelveMonthLockupAmount
      lastUpdated
    }
  }
`;

const fetchStakingData = async (address: string): Promise<StakingData> => {
  const client = subgraphClient("lens");
  const { data } = await client.query({
    query: STAKING_QUERY,
    variables: { address: address.toLowerCase() },
    fetchPolicy: "network-only", // Don't cache results
  });

  return {
    stakes: data.stakes || [],
    summary: data.stakingSummary || null
  };
};

export const useStakingData = (address: string | undefined) => {
  return useQuery({
    queryKey: ['staking', address],
    queryFn: () => fetchStakingData(address!),
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Helper functions for formatting and calculations
export const calculateAPR = (lockupPeriod: string): number => {
  const periodInMonths = Number(lockupPeriod) / (30 * 24 * 60 * 60); // Convert seconds to months
  switch (periodInMonths) {
    case 0: return 20; // No lockup
    case 1: return 40; // 1 month
    case 3: return 60; // 3 months
    case 6: return 80; // 6 months
    case 12: return 100; // 12 months
    default: return 20;
  }
};

export const formatStakingAmount = (amount: string): string => {
  return Number(formatEther(BigInt(amount))).toFixed(2);
};

export const getLockupPeriodLabel = (lockupPeriod: string): string => {
  const periodInMonths = Number(lockupPeriod) / (30 * 24 * 60 * 60);
  switch (periodInMonths) {
    case 0: return "No";
    case 1: return "1 Month";
    case 3: return "3 Months";
    case 6: return "6 Months";
    case 12: return "12 Months";
    default: return "Unknown";
  }
}; 