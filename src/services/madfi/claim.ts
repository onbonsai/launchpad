import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { resumeSession } from "@src/hooks/useLensLogin";
import { SessionClient } from "@lens-protocol/client";
import { WalletClient } from "viem";
import AccountTokenClaimAbi from "./abi/AccountTokenClaim.json";
import StakingRewardsAbi from "./abi/StakingRewards.json";
import { IS_PRODUCTION, PROTOCOL_DEPLOYMENT } from "./utils";
import { publicClient } from "./moneyClubs";
import { chains } from "@lens-chain/sdk/viem";

const fetchClaimableAmount = async (
  walletClient: WalletClient | any,
  proof: string[],
  claimScoreBps: string,
): Promise<bigint> => {
  const client = publicClient("lens");
  return (await client.readContract({
    account: walletClient.account,
    address: PROTOCOL_DEPLOYMENT.lens.AccountTokenClaim as `0x${string}`,
    abi: AccountTokenClaimAbi,
    functionName: "claimableAmount",
    args: [proof, claimScoreBps],
  })) as bigint;
};

const fetchHasClaimed = async (address: `0x${string}`): Promise<boolean> => {
  const client = publicClient("lens");
  return (await client.readContract({
    address: PROTOCOL_DEPLOYMENT.lens.StakingRewards as `0x${string}`,
    abi: StakingRewardsAbi,
    functionName: "claims",
    args: [address],
  })) as boolean;
};

export const useGetBonsaiClaim = (
  walletClient?: WalletClient,
  isAuthenticated?: boolean,
): UseQueryResult<any, Error> => {
  return useQuery({
    queryKey: ["bonsai-claim", isAuthenticated],
    queryFn: async () => {
      let idToken;

      const sessionClient = await resumeSession(true);
      if (!sessionClient) {
        return;
      } else {
        const creds = await (sessionClient as SessionClient).getCredentials();
        if (creds.isOk()) {
          idToken = creds.value?.idToken;
        } else {
          return;
        }
      }

      const proof = await fetch("/api/bonsai/get-merkle-proof", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }).then((res) => res.json());

      let amount;
      if (!!proof) {
        amount = await fetchClaimableAmount(walletClient, proof.proof.split("."), proof.claimScoreBps);
      }

      return { proof, amount };
    },
    enabled: !!walletClient && isAuthenticated,
  });
};

export const useGetStakingRewards = (
  walletClient?: WalletClient,
  address?: `0x${string}`,
): UseQueryResult<any, Error> => {
  return useQuery({
    queryKey: ["staking-rewards", address],
    queryFn: async () => {
      const { proof, amount } = await fetch(
        `/api/bonsai/get-staking-rewards?address=${address?.toLowerCase()}`,
        {},
      ).then((res) => res.json());
      let hasClaimed: boolean | undefined;
      if (!!proof) {
        hasClaimed = await fetchHasClaimed(address as `0x${string}`);
      }
      return { proof, amount, hasClaimed };
    },
    enabled: !!walletClient && !!address,
  });
};

export const claimTokensWithProof = async (
  walletClient,
  proof: string[],
  accountAddress: `0x${string}`,
  claimScoreBps: string,
): Promise<boolean> => {
  try {
    const client = publicClient("lens");
    const hash = await walletClient.writeContract({
      address: PROTOCOL_DEPLOYMENT.lens.AccountTokenClaim,
      abi: AccountTokenClaimAbi,
      functionName: "claimTokensWithProof",
      args: [proof, accountAddress, claimScoreBps],
      chain: IS_PRODUCTION ? chains.mainnet : chains.testnet,
    });
    console.log(`hash: ${hash}`);
    const receipt = await client.waitForTransactionReceipt({ hash });
    return receipt.status === "success";
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const claimStakingRewardsWithProof = async (walletClient, proof: string[], amount: string): Promise<boolean> => {
  try {
    const client = publicClient("lens");
    const hash = await walletClient.writeContract({
      address: PROTOCOL_DEPLOYMENT.lens.StakingRewards,
      abi: StakingRewardsAbi,
      functionName: "claimTokensWithProof",
      args: [proof, amount],
      chain: IS_PRODUCTION ? chains.mainnet : chains.testnet,
    });
    console.log(`hash: ${hash}`);
    const receipt = await client.waitForTransactionReceipt({ hash });
    return receipt.status === "success";
  } catch (error) {
    console.log(error);
    return false;
  }
};
