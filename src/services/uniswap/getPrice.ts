import { Abi } from "viem";
import { publicClient, IS_PRODUCTION, USDC_CONTRACT_ADDRESS } from "../madfi/moneyClubs";
import IQuoterV2Abi from "./IQuoterV2.json";

// TODO: not being used yet
export const fetchQuoteSellToUSDC = async (account: `0x${string}`, addressFrom: string, amountIn: bigint): Promise<string> => {
  try {
    const QUOTER_V2_ADDRESS = IS_PRODUCTION
      ? "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"
      : "0xC5290058841028F1614F3A6F0F5816cAd0df5E27";

    console.log(QUOTER_V2_ADDRESS, {
      tokenIn: addressFrom,
      tokenOut: USDC_CONTRACT_ADDRESS,
      amountIn: amountIn,
      fee: 10000,
      sqrtPriceLimitX96: 0
    });
    const { result } = await publicClient().simulateContract({
      address: QUOTER_V2_ADDRESS,
      abi: IQuoterV2Abi as unknown as Abi,
      functionName: "quoteExactInputSingle",
      account,
      args: [{
        tokenIn: addressFrom,
        tokenOut: USDC_CONTRACT_ADDRESS,
        amountIn: amountIn,
        fee: 10000,
        sqrtPriceLimitX96: 0
      }],
    });

    console.log(result);

    return '0';

    // return formatUnits(quotedAmountOut as bigint, USDC_DECIMALS);
  } catch (error) {
    console.log(error);
    return '';
  }
};