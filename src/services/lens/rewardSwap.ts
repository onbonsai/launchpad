import { encodeAbiParameters, encodePacked, zeroAddress } from "viem";
import { ACTION_HUB_ADDRESS, LENS_GLOBAL_FEED, PROTOCOL_DEPLOYMENT } from "../madfi/utils";
import { publicClient, SWAP_TO_BONSAI_POST_ID, WGHO_CONTRACT_ADDRESS } from "../madfi/moneyClubs";
import ActionHubAbi from "@src/services/madfi/abi/ActionHub.json";
import { quoteExactOutput } from "../uniswap/useQuote";

// Lens reward swap parameter constants
export const PARAM__PATH = "0xc933ed7045acf6fe8798b8a8ab584b953eb4e2ea05683ebbe5eb3617c481b1f2" as const;
export const PARAM__AMOUNT_IN = "0x3c3141d3a84ef5289aa1d3f284850c506e508ad3b8801bfb223cb82291416743" as const;
export const PARAM__AMOUNT_OUT_MINIMUM = "0x2e31dac88fd210e9e7136637af05b767ae5502ddbfecbdb554b2c75d659b3880" as const;
export const PARAM__CLIENT_ADDRESS = "0xa2e2b831586f148ebb0c7311ada7371940ec21502df651de9a65455f55f8d580" as const;
export const PARAM__REFERRALS = "0x183a1b7fdb9626f5ae4e8cac88ee13cc03b29800d2690f61e2a2566f76d8773f" as const;

export const calculatePath = (tokenAddress: `0x${string}` | string, fromAddress?: `0x${string}` | string) => {
  if (tokenAddress === PROTOCOL_DEPLOYMENT.lens.Bonsai) {
    if (fromAddress) {
      return encodePacked(["address", "uint24", "address"], [fromAddress, 10000, PROTOCOL_DEPLOYMENT.lens.Bonsai]);
    }
    return encodePacked(
      ["address", "uint24", "address"],
      [WGHO_CONTRACT_ADDRESS, 3000, PROTOCOL_DEPLOYMENT.lens.Bonsai],
    );
  }
  if (fromAddress === PROTOCOL_DEPLOYMENT.lens.Bonsai) {
    return encodePacked(["address", "uint24", "address"], [PROTOCOL_DEPLOYMENT.lens.Bonsai, 10000, tokenAddress]);
  }
  return encodePacked(
    ["address", "uint24", "address", "uint24", "address"],
    [WGHO_CONTRACT_ADDRESS, 3000, PROTOCOL_DEPLOYMENT.lens.Bonsai, 10000, tokenAddress],
  );
};

/**
 * Swap GHO for BONSAI
 * @param walletClient
 * @param amountOut Amount of BONSAI desired
 */
export const swapGhoForBonsai = async (walletClient: any, amountOut: bigint, account: string, amountIn?: bigint) => {
  const quoteResult = amountIn
    ? { amount: amountIn }
    : // If no amountIn, get quote for amountOut, reverse path
      await quoteExactOutput(
        encodePacked(["address", "uint24", "address"], [PROTOCOL_DEPLOYMENT.lens.Bonsai, 3000, WGHO_CONTRACT_ADDRESS]),
        amountOut,
        account,
      );
  const hash = await walletClient.writeContract({
    address: ACTION_HUB_ADDRESS,
    abi: ActionHubAbi,
    functionName: "executePostAction",
    args: [
      PROTOCOL_DEPLOYMENT.lens.RewardSwap,
      LENS_GLOBAL_FEED,
      SWAP_TO_BONSAI_POST_ID,
      [
        {
          key: PARAM__PATH,
          value: encodeAbiParameters([{ type: "bytes" }], [calculatePath(PROTOCOL_DEPLOYMENT.lens.Bonsai)]),
        },
        { key: PARAM__AMOUNT_IN, value: encodeAbiParameters([{ type: "uint256" }], [quoteResult.amount]) },
        { key: PARAM__AMOUNT_OUT_MINIMUM, value: encodeAbiParameters([{ type: "uint256" }], [amountOut]) },
        { key: PARAM__CLIENT_ADDRESS, value: encodeAbiParameters([{ type: "address" }], [zeroAddress]) },
        { key: PARAM__REFERRALS, value: encodeAbiParameters([{ type: "address[]" }], [[]]) },
      ],
    ],
  });

  await publicClient("lens").waitForTransactionReceipt({ hash });
};
