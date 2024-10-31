import { Abi } from "viem";
import { useQuery } from "@tanstack/react-query";

import { getPolygonClient } from "@src/utils/viem";
import PositionManagerABI from "@src/services/uniswap/positionManager/PositionManagerABI.json";
import { BONSAI, FEE_TIER, NFT_POSITION_MANAGER, WMATIC } from "@src/services/uniswap/positionManager/stake";

const fetchEligiblePositions = async (userAddress: `0x${string}`) => {
  const publicClient = getPolygonClient();
  const balance = await publicClient.readContract({
    address: NFT_POSITION_MANAGER,
    abi: PositionManagerABI as unknown as Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });

  const positions = await Promise.all(
    Array.from({ length: Number(balance) }, (_, i) => i).map(async (index) => {
      return publicClient.readContract({
        address: NFT_POSITION_MANAGER,
        abi: PositionManagerABI as unknown as Abi,
        functionName: "tokenOfOwnerByIndex",
        args: [userAddress, index],
      });
    }),
  );

  const bonsaiPositions = await Promise.all(
    positions.map(async (tokenId) => {
      const position = await publicClient.readContract({
        address: NFT_POSITION_MANAGER,
        abi: PositionManagerABI as unknown as Abi,
        functionName: "positions",
        args: [tokenId],
      });
      return { tokenId, position };
    }),
  );

  const filteredPositions = bonsaiPositions.filter(
    ({ position }: any) => position[2] === BONSAI && position[3] === WMATIC && position[4] === FEE_TIER,
  );

  return filteredPositions;
};

export default (userAddress?: `0x${string}`) => {
  return useQuery({
    queryKey: ["bonsai-positions", userAddress],
    queryFn: async () => {
      try {
        if (!userAddress) return [];
        return await fetchEligiblePositions(userAddress);
      } catch (error) {
        console.log(error);
        return [];
      }
    },
    enabled: !!userAddress,
  });
};
