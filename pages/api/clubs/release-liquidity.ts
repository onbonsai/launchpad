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
  const swapInfoV4 = {
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
        hooks: zeroAddress,
        hookData: "0x",
      },
    ],
    // TODO: Update Universal Router address in v4?
    router: IS_PRODUCTION ? "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD" : "0x050E797f3625EC8785265e1d9BDd4799b97528A1",
  };
  const swapInfoV3 = {
    path: encodePacked(
      ["address", "uint24", "address", "uint24", "address"],
      [USDC_CONTRACT_ADDRESS, 500, WETH, 10000, BONSAI_TOKEN_BASE_ADDRESS],
    ),
    router: IS_PRODUCTION ? "0x2626664c2603336E57B271c5C0b26F421741e481" : "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
  };
  return { swapInfoV4, swapInfoV3 };
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { clubId, tokenPrice } = req.body;

    const account = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`);
    const chain = IS_PRODUCTION ? base : baseSepolia;
    const walletClient = createWalletClient({ account, chain, transport: http() });

    // approximate a reasonable minAmountOut based on current price
    const minAmountOut = parseEther((0.82 * Number(MIN_LIQUIDITY_THRESHOLD) * tokenPrice).toString());

    const { swapInfoV4, swapInfoV3 } = getPath();

    const hash = await walletClient.writeContract({
      address: LAUNCHPAD_CONTRACT_ADDRESS,
      abi: BonsaiLaunchpadAbi,
      functionName: "releaseLiquidity",
      args: [clubId, minAmountOut, swapInfoV4, swapInfoV3],
      chain: IS_PRODUCTION ? base : baseSepolia,
    });

    const transactionReceipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash });
    const releaseLiquidityEvent = getEventFromReceipt({
      contractAddress: LAUNCHPAD_CONTRACT_ADDRESS,
      transactionReceipt,
      abi: BonsaiLaunchpadAbi,
      eventName: "LiquidityReleased",
    });
    const { token } = releaseLiquidityEvent.args;

    res.status(200).json({ token, hash });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false });
  }
};

export default handler;
