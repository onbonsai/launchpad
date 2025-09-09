import { useQuery } from "@tanstack/react-query";
import { gql } from "@apollo/client";
import { useAccount, useWalletClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import toast from "react-hot-toast";
import { useCallback, useState } from "react";
import { subgraphClient } from "@src/services/madfi/moneyClubs";

// LP Custody Contract Address
export const LP_CUSTODY_CONTRACT = "0x2dFFcD1E66E67DA79210263288d971B2BF41BECC" as const;

// GraphQL query for fetching LP positions
const GET_LP_POSITIONS = gql`
  query GetLPPositions($owner: Bytes!) {
    lppositions(where: { owner: $owner, isLocked: true }) {
      id
      nftContract
      tokenId
      owner
      lockExpiry
      isV3
      positionManager
      lockedAt
      unlockedAt
      isLocked
      feeCollections(first: 100, orderBy: timestamp, orderDirection: desc) {
        id
        recipient
        timestamp
        blockNumber
        transactionHash
      }
    }
  }
`;

// LP Custody ABI - collectFees, lockPosition, and unlockPosition functions
const LP_CUSTODY_ABI = [
  {
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "recipient", type: "address" },
    ],
    name: "collectFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "lockPeriod", type: "uint256" },
      { name: "isV3", type: "bool" },
    ],
    name: "lockPosition",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "unlockPosition",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface FeeCollection {
  id: string;
  recipient: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
}

export interface LPPosition {
  id: string;
  nftContract: string;
  tokenId: string;
  owner: string;
  lockExpiry: string;
  isV3: boolean;
  positionManager: string;
  lockedAt: string;
  unlockedAt?: string;
  isLocked: boolean;
  feeCollections: FeeCollection[];
}

// Hook to fetch LP positions for a given address
export const useGetLPPositions = (address?: `0x${string}`) => {
  return useQuery({
    queryKey: ["lp-positions", address],
    queryFn: async () => {
      if (!address) return [];

      try {
        const { data } = await subgraphClient().query({
          query: GET_LP_POSITIONS,
          variables: { owner: address.toLowerCase() },
        });

        return (data?.lppositions || []) as LPPosition[];
      } catch (error) {
        console.error("Error fetching LP positions:", error);
        return [];
      }
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 30000,
  });
};

// Hook to collect fees from a locked position
export const useCollectFees = () => {
  const { address } = useAccount();
  const [isCollecting, setIsCollecting] = useState(false);
  const { data: walletClient } = useWalletClient();

  const { writeContract, data: hash, isPending: isWritePending, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const collectFees = useCallback(
    async (
      nftContract: `0x${string}`,
      tokenId: bigint,
      token0: `0x${string}`,
      token1: `0x${string}`,
      recipient?: `0x${string}`,
    ) => {
      if (!address || !walletClient) {
        toast.error("Please connect your wallet");
        return;
      }

      const recipientAddress = recipient || address;

      try {
        setIsCollecting(true);

        await writeContract({
          address: LP_CUSTODY_CONTRACT,
          abi: LP_CUSTODY_ABI,
          functionName: "collectFees",
          args: [nftContract, tokenId, token0, token1, recipientAddress],
        });

        // The success handling will be done via the isConfirmed state
      } catch (error) {
        console.error("Error collecting fees:", error);
        toast.error("Failed to collect fees");
      } finally {
        setIsCollecting(false);
      }
    },
    [address, walletClient, writeContract],
  );

  // Show success toast when transaction is confirmed
  if (isConfirmed) {
    toast.success("Fees collected successfully!");
    reset(); // Reset the state after success
  }

  // Show error toast if write fails
  if (writeError) {
    toast.error(`Failed to collect fees: ${writeError.message}`);
  }

  return {
    collectFees,
    isCollecting: isCollecting || isWritePending || isConfirming,
    isSuccess: isConfirmed,
    hash,
  };
};

// Utility function to format unlock time
export const formatUnlockTime = (lockExpiry: string): string => {
  const expiryTimestamp = parseInt(lockExpiry);
  const expiryDate = new Date(expiryTimestamp * 1000);
  const now = new Date();

  if (expiryDate <= now) {
    return "Unlocked";
  }

  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  }
};

// Utility function to check if position can be unlocked
export const canUnlock = (lockExpiry: string): boolean => {
  const expiryTimestamp = parseInt(lockExpiry);
  const now = Math.floor(Date.now() / 1000);
  return now >= expiryTimestamp;
};

// Hook to lock an LP position
export const useLockPosition = () => {
  const { address } = useAccount();
  const [isLocking, setIsLocking] = useState(false);
  const { data: walletClient } = useWalletClient();
  
  const { 
    writeContract, 
    data: hash,
    isPending: isWritePending,
    error: writeError,
    reset 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({
    hash,
  });

  const lockPosition = useCallback(
    async (
      nftContract: `0x${string}`,
      tokenId: bigint,
      lockPeriod: bigint,
      isV3: boolean
    ) => {
      if (!address || !walletClient) {
        toast.error("Please connect your wallet");
        return;
      }

      try {
        setIsLocking(true);
        
        await writeContract({
          address: LP_CUSTODY_CONTRACT,
          abi: LP_CUSTODY_ABI,
          functionName: "lockPosition",
          args: [nftContract, tokenId, lockPeriod, isV3],
        });

      } catch (error) {
        console.error("Error locking position:", error);
        toast.error("Failed to lock position");
      } finally {
        setIsLocking(false);
      }
    },
    [address, walletClient, writeContract],
  );

  // Show success toast when transaction is confirmed
  if (isConfirmed) {
    toast.success("Position locked successfully!");
    reset();
  }

  // Show error toast if write fails
  if (writeError) {
    toast.error(`Failed to lock position: ${writeError.message}`);
  }

  return {
    lockPosition,
    isLocking: isLocking || isWritePending || isConfirming,
    isSuccess: isConfirmed,
    hash,
  };
};

// Hook to unlock an LP position
export const useUnlockPosition = () => {
  const { address } = useAccount();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const { data: walletClient } = useWalletClient();
  
  const { 
    writeContract, 
    data: hash,
    isPending: isWritePending,
    error: writeError,
    reset 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({
    hash,
  });

  const unlockPosition = useCallback(
    async (
      nftContract: `0x${string}`,
      tokenId: bigint
    ) => {
      if (!address || !walletClient) {
        toast.error("Please connect your wallet");
        return;
      }

      try {
        setIsUnlocking(true);
        
        await writeContract({
          address: LP_CUSTODY_CONTRACT,
          abi: LP_CUSTODY_ABI,
          functionName: "unlockPosition",
          args: [nftContract, tokenId],
        });

      } catch (error) {
        console.error("Error unlocking position:", error);
        toast.error("Failed to unlock position");
      } finally {
        setIsUnlocking(false);
      }
    },
    [address, walletClient, writeContract],
  );

  // Show success toast when transaction is confirmed
  if (isConfirmed) {
    toast.success("Position unlocked successfully!");
    reset();
  }

  // Show error toast if write fails
  if (writeError) {
    toast.error(`Failed to unlock position: ${writeError.message}`);
  }

  return {
    unlockPosition,
    isUnlocking: isUnlocking || isWritePending || isConfirming,
    isSuccess: isConfirmed,
    hash,
  };
};

// Lock period options (in seconds)
export const LOCK_PERIODS = [
  { label: "1 Week", value: 7 * 24 * 60 * 60 },
  { label: "1 Month", value: 30 * 24 * 60 * 60 },
  { label: "3 Months", value: 90 * 24 * 60 * 60 },
  { label: "6 Months", value: 180 * 24 * 60 * 60 },
  { label: "1 Year", value: 365 * 24 * 60 * 60 },
];
