import { useQuery } from "@tanstack/react-query";
import { Abi } from "viem";

import { apolloClient } from "@src/services/madfi/subgraph/client";
import { getPolygonClient } from "@src/utils/viem";
import { BONSAI, INCENTIVES_KEY, STAKING_REWARDS } from "@src/services/uniswap/positionManager/stake";
import RewardsStakerABI from "@src/services/uniswap/positionManager/RewardsStakerABI.json";

import { getStakedBonsaiLPs } from "../services/madfi/subgraph/operations/getStakedBonsaiLPs.graphql";

const fetchStakedPositions = async (userAddress: `0x${string}`) => {
  const { data } = await apolloClient.query({
    query: getStakedBonsaiLPs,
    variables: { address: userAddress.toLowerCase() },
  });

  const publicClient = getPolygonClient();

  const rewards = await Promise.all(
    data.stakedBonsaiLPs.map(async (position: any) => {
      const [rewardsInfo, currentRewards] = await Promise.all([
        publicClient.readContract({
          address: STAKING_REWARDS,
          abi: RewardsStakerABI as unknown as Abi,
          functionName: "getRewardInfo",
          args: [INCENTIVES_KEY, position.tokenId],
        }),
        publicClient.readContract({
          address: STAKING_REWARDS,
          abi: RewardsStakerABI as unknown as Abi,
          functionName: "rewards",
          args: [BONSAI, userAddress],
        }),
      ]);
      return { rewardsInfo, currentRewards };
    }),
  );

  return (
    data?.stakedBonsaiLPs.map((stakedBonsaiLPs: any, i: number) => ({
      ...stakedBonsaiLPs,
      rewards: {
        amount: rewards[i].currentRewards,
        total: rewards[i].rewardsInfo[0],
        secondsInside: rewards[i].rewardsInfo[1],
      },
    })) ?? []
  );
};

export default (userAddress?: `0x${string}`) => {
  return useQuery({
    queryKey: ["bonsai-staked-positions", userAddress],
    queryFn: async () => {
      try {
        if (!userAddress) return [];
        return await fetchStakedPositions(userAddress);
      } catch (error) {
        console.log(error);
        return [];
      }
    },
    enabled: !!userAddress,
  });
};
