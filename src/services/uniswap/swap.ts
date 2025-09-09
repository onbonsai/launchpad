import {
  Account,
  Chain,
  PublicClient,
  WalletClient,
  erc20Abi,
  maxUint256,
  formatUnits,
  parseUnits,
  getContract,
} from "viem";
import SwapRouterV2ABI from "./SwapRouterV2.json";

// const UNISWAP_MULTICALL = "0x5900c97b683e69CD752aF7DC7003d69315E2a288";

export const SWAP_ROUTER_CONTRACT_ADDRESS = "0x6ddD32cd941041D8b61df213B9f515A7D288Dc13";

export interface SwapParams {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: string;
  amountOutMinimum?: bigint;
  fee?: number;
  recipient?: `0x${string}`;
  deadline?: number;
  sqrtPriceLimitX96?: bigint;
}

export async function swapTokens(walletClient: WalletClient, params: SwapParams): Promise<`0x${string}`> {
  const {
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMinimum = 0n,
    fee = 10000,
    recipient = walletClient.account?.address,
    deadline = Math.floor(Date.now() / 1000) + 60 * 10,
    sqrtPriceLimitX96 = 0n,
  } = params;

  if (!recipient) {
    throw new Error("No recipient address provided");
  }

  // Parse the amount input
  const amountInParsed = parseUnits(amountIn, 18);

  // Get the swap router contract
  const swapRouter = getContract({
    address: SWAP_ROUTER_CONTRACT_ADDRESS,
    abi: SwapRouterV2ABI,
    client: walletClient,
  });

  // Execute the swap
  const hash = await swapRouter.write.exactInputSingle([
    {
      tokenIn,
      tokenOut,
      fee,
      recipient,
      deadline,
      amountIn: amountInParsed,
      amountOutMinimum,
      sqrtPriceLimitX96,
    },
  ]);

  console.log("Swap transaction submitted:", hash);
  return hash;
}
