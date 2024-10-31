import { Account, Chain, PublicClient, WalletClient, erc20Abi, maxUint256, formatUnits } from 'viem';
import { BONSAI_TOKEN_BASE_ADDRESS, IS_PRODUCTION } from '@src/services/madfi/moneyClubs'
import { USDC_CONTRACT_ADDRESS } from '@src/services/madfi/moneyClubs'
import SwapRouterV2ABI from "./SwapRouterV2.json";

export const SWAP_ROUTER_CONTRACT_ADDRESS = IS_PRODUCTION
  ? "0x2626664c2603336E57B271c5C0b26F421741e481"
  : "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4";

const _handleApprove = async (client, walletClient) => {
  const [user] = await walletClient.getAddresses();
  const allowance = await client.readContract({
    address: USDC_CONTRACT_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [user, SWAP_ROUTER_CONTRACT_ADDRESS],
  });

  if (allowance === 0n) {
    console.log('approving...');
    const hash = await walletClient.writeContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [SWAP_ROUTER_CONTRACT_ADDRESS, maxUint256],
    });
    console.log(`tx: ${hash}`)
    await client.waitForTransactionReceipt({ hash });
  }
}

// swap usdc => bonsai
export const swapExactIn = async (
  publicClient: PublicClient,
  walletClient: WalletClient,
  amountIn: bigint,
  chain: Chain,
  account: Account,
) => {
  try {
    await _handleApprove(publicClient, walletClient);

    console.log(`sending swap tx: ${formatUnits(amountIn, 6)} USDC => ??? BONSAI`);
    const hash = await walletClient.writeContract({
      account,
      chain,
      address: SWAP_ROUTER_CONTRACT_ADDRESS,
      abi: SwapRouterV2ABI,
      functionName: "exactInputSingle",
      args: [{
          tokenIn: USDC_CONTRACT_ADDRESS,
          tokenOut: BONSAI_TOKEN_BASE_ADDRESS,
          fee: 500, // TODO: low
          recipient: account.address,
          amountIn: amountIn,
          amountOutMinimum: 0n, // Assuming no minimum for simplicity
          sqrtPriceLimitX96: 0n // Assuming no price limit for simplicity
      }]
    });
    console.log(`tx: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });

    return hash;
  } catch (error) {
    console.log(error);
  }
};