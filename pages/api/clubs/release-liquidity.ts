import { NextApiRequest, NextApiResponse } from "next";
import { privateKeyToAccount } from "viem/accounts";
import {
  http,
  createWalletClient,
  PublicClient,
  TransactionReceipt,
  zeroAddress,
  encodePacked,
  parseEther,
} from "viem";
import { base, baseSepolia } from "viem/chains";

import {
  publicClient,
  IS_PRODUCTION,
  BONSAI_TOKEN_BASE_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  MIN_LIQUIDITY_THRESHOLD,
} from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { LAUNCHPAD_CONTRACT_ADDRESS } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";

const WETH = "0x4200000000000000000000000000000000000006";
const getPath = () => {
  const swapInfoV4 = IS_PRODUCTION ? {
    path: [
      {
        intermediateCurrency: zeroAddress,
        fee: 500,
        tickSpacing: 60,
        hooks: zeroAddress,
        hookData: "0x",
      },
      {
        intermediateCurrency: BONSAI_TOKEN_BASE_ADDRESS,
        fee: 10000,
        tickSpacing: 60,
        hooks: zeroAddress, // TODO: mainnet hook deployment
        hookData: "0x",
      },
    ],
    router: "0x6ff5693b99212da76ad316178a184ab56d299b43"
  } : {
    path: [
      {
        intermediateCurrency: "0x1d3C6386F05ed330c1a53A31Bb11d410AeD094dF",
        fee: 500,
        tickSpacing: 60,
        hooks: zeroAddress,
        hookData: "0x",
      },
      {
        intermediateCurrency: BONSAI_TOKEN_BASE_ADDRESS,
        fee: 10000,
        tickSpacing: 60,
        hooks: "0xCED5Aa78A6568597883336E575FbA83D8750c080",
        hookData: "0x",
      },
    ],
    router: "0x492e6456d9528771018deb9e87ef7750ef184104"
  };
  return swapInfoV4;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { clubId, tokenPrice } = req.body;

    const account = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`);
    const chain = IS_PRODUCTION ? base : baseSepolia;
    const walletClient = createWalletClient({ account, chain, transport: http() });

    // approximate a reasonable minAmountOut based on current price
    const minAmountOut = IS_PRODUCTION
      ? parseEther((0.82 * Number(MIN_LIQUIDITY_THRESHOLD) * tokenPrice).toString())
      : 0;

    const swapInfoV4 = getPath();

    const hash = await walletClient.writeContract({
      address: LAUNCHPAD_CONTRACT_ADDRESS,
      abi: BonsaiLaunchpadAbi,
      functionName: "releaseLiquidity",
      args: [clubId, minAmountOut, swapInfoV4],
      chain: IS_PRODUCTION ? base : baseSepolia,
    });

    const transactionReceipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash });
    const releaseLiquidityEvent = getEventFromReceipt({
      contractAddress: LAUNCHPAD_CONTRACT_ADDRESS,
      transactionReceipt,
      abi: BonsaiLaunchpadAbi,
      eventName: "LiquidityReleased",
    });

    // TODO: do we need token? doesn't seem to be getting used when returned
    const { token } = releaseLiquidityEvent.args;

    res.status(200).json({ token, hash });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
};

export default handler;
