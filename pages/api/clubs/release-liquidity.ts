import { NextApiRequest, NextApiResponse } from "next";
import { privateKeyToAccount } from "viem/accounts";
import { http, createWalletClient, TransactionReceipt, zeroAddress, parseEther, encodePacked } from "viem";
import { base, baseSepolia } from "viem/chains";

import {
  publicClient,
  BONSAI_TOKEN_BASE_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  MIN_LIQUIDITY_THRESHOLD,
  DEFAULT_HOOK_ADDRESS,
  WGHO_CONTRACT_ADDRESS,
  getRegisteredClubById,
} from "@src/services/madfi/moneyClubs";
import { getEventFromReceipt } from "@src/utils/viem";
import { IS_PRODUCTION, lensTestnet, lens, PROTOCOL_DEPLOYMENT, getChain } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import BonsaiLaunchpadV3Abi from "@src/services/madfi/abi/BonsaiLaunchpadV3.json";

const WETH = "0x4200000000000000000000000000000000000006";

const getPath = (chain: string) => {
  // TODO: this is only for base, lens will need to be updated when v4 is available
  const swapInfoV4 = IS_PRODUCTION
    ? {
        path: [
          {
            intermediateCurrency: zeroAddress,
            fee: 500,
            tickSpacing: 10,
            hooks: zeroAddress,
            hookData: "0x",
          },
          {
            intermediateCurrency: BONSAI_TOKEN_BASE_ADDRESS,
            fee: "10000", // "0x800000",
            tickSpacing: 200,
            hooks: zeroAddress, // DEFAULT_HOOK_ADDRESS,
            hookData: "0x",
          },
        ],
        router: "0x6ff5693b99212da76ad316178a184ab56d299b43",
        // TODO: add v4 addresses for lens when available
        ...(chain === "lens"
          ? {
              posm: "0x0000000000000000000000000000000000000000",
              poolManager: "0x0000000000000000000000000000000000000000",
              allowanceTransfer: "0x000000000022D473030F116dDEE9F6B43aC78BA3", // TODO: add v4 addresses for lens when available
              hookData: "0x",
            }
          : {}),
      }
    : {
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
            hooks: "0xCED5Aa78A6568597883336E575FbA83D8750c080", // old hook address, dont feel like migrating the bonsai pool
            hookData: "0x",
          },
        ],
        router: "0x492e6456d9528771018deb9e87ef7750ef184104",
      };

  // NOTE: only on Lens, only on mainnet
  const swapInfoV3 = {
    path: encodePacked(
      ["address", "uint24", "address"],
      [WGHO_CONTRACT_ADDRESS, 3000, PROTOCOL_DEPLOYMENT.lens.Bonsai as `0x${string}`],
    ),
    router: "0x6ddD32cd941041D8b61df213B9f515A7D288Dc13",
    positionManager: "0xC5d0CAaE8aa00032F6DA993A69Ffa6ff80b5F031",
  };

  return { swapInfoV4, swapInfoV3 };
};

const minLiquidityThreshold = {
  "588251339500000000000000000": 0.6,
  "3529508034062500000000000000000": 6000,
  "6471118034062500000000000000000": 11000,
  "12384118034062500000000000000000": Number(MIN_LIQUIDITY_THRESHOLD),
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let { clubId, tokenPrice, chain } = req.body;

    const account = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: getChain(chain || "base"), transport: http() });

    // approximate a reasonable minAmountOut based on current price
    const club = chain === "lens" ? await getRegisteredClubById(clubId, chain) : null;
    const minAmountOut = IS_PRODUCTION
      ? parseEther(
          (
            0.82 *
            (chain === "base" ? Number(MIN_LIQUIDITY_THRESHOLD) : minLiquidityThreshold[club.initialPrice]) *
            tokenPrice
          ).toString(),
        )
      : 0;

    const { swapInfoV3, swapInfoV4 } = getPath(chain);

    let args = [clubId, minAmountOut, swapInfoV4];
    if (chain === "lens") {
      // TODO: when v4 is available set last arg to false (new clubs)
      args = [clubId, minAmountOut, swapInfoV3, swapInfoV4, true];
    }
    const hash = await walletClient.writeContract({
      address: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
      abi: chain === "base" ? BonsaiLaunchpadAbi : BonsaiLaunchpadV3Abi,
      functionName: "releaseLiquidity",
      args,
      gas: 1000000n,
    });
    console.log("hash", hash);

    const transactionReceipt: TransactionReceipt = await publicClient().waitForTransactionReceipt({ hash });
    const releaseLiquidityEvent = getEventFromReceipt({
      contractAddress: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
      transactionReceipt,
      abi: chain === "base" ? BonsaiLaunchpadAbi : BonsaiLaunchpadV3Abi,
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
