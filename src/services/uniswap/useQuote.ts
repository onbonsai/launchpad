import { useQuery } from "@tanstack/react-query";
import { publicClient } from "../madfi/moneyClubs";

const QUOTER_V2_ADDRESS = "0x1eEA2B790Dc527c5a4cd3d4f3ae8A2DDB65B2af1";

const IQuoterV2Abi = [
  {
    inputs: [
      { internalType: "bytes", name: "path", type: "bytes" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
    ],
    name: "quoteExactInput",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint160[]", name: "sqrtPriceX96AfterList", type: "uint160[]" },
      { internalType: "uint32[]", name: "initializedTicksCrossedList", type: "uint32[]" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const useQuoter = ({
  account,
  path,
  amountIn,
  enabled = true,
}: {
  account?: `0x${string}`;
  path: `0x${string}`[];
  amountIn: bigint;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ["uniswap-quote", path, amountIn.toString()],
    queryFn: async () => {
      try {
        const { result } = await publicClient("lens").simulateContract({
          address: QUOTER_V2_ADDRESS,
          abi: IQuoterV2Abi,
          functionName: "quoteExactInput",
          account,
          args: [path, amountIn],
        });
        return result as bigint;
      } catch (error) {
        console.error("Failed to get Uniswap quote:", error);
        return 0n;
      }
    },
    enabled: enabled && !!account && amountIn > 0n,
    refetchInterval: 10000,
    staleTime: 5000,
    gcTime: 10000,
  });
};

export default useQuoter;
