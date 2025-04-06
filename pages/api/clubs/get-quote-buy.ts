import { NextApiRequest, NextApiResponse } from "next";
import { encodeFunctionData, parseUnits, zeroAddress } from "viem";

import { DECIMALS, getBuyAmount, publicClient, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { lens, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { base } from "viem/chains";

type QueryParams = {
  clubId: string;
  tokenAddress: `0x${string}`;
  senderAddress: `0x${string};`;
  amountIn: string; // usdc amount user is willing to pay
  clientAddress?: `0x${string}`;
  recipientAddress: `0x${string}`;
  referralAddress?: `0x${string}`;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  let { chain } = req.query;
  if (!chain) chain = "lens";
  if (chain !== "base" && chain !== "lens") return res.status(400).json("chain must be base or lens");

  try {
    const { clubId, tokenAddress, amountIn, senderAddress, clientAddress, recipientAddress, referralAddress } =
      req.query as Partial<QueryParams>;

    if (!(clubId && tokenAddress && amountIn && senderAddress)) {
      return res.status(400).json({ success: false, message: "Missing required query parameters" });
    }

    const { buyAmount: amountOut } = await getBuyAmount(senderAddress, tokenAddress, amountIn, false, chain);

    const buyPriceBigInt = parseUnits(amountIn, chain === "base" ? USDC_DECIMALS : DECIMALS);
    const maxAmountIn = (buyPriceBigInt * BigInt(105)) / BigInt(100); // 5% slippage allowed

    const data = encodeFunctionData({
      abi: BonsaiLaunchpadAbi,
      functionName: "buyChips",
      args: [
        clubId,
        amountOut,
        maxAmountIn,
        clientAddress || zeroAddress,
        recipientAddress || zeroAddress,
        referralAddress || zeroAddress,
      ],
    });

    let rawData: any | null = null;
    try {
      const _rawData = await publicClient().prepareTransactionRequest({
        to: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad as `0x${string}`,
        account: senderAddress,
        data,
        chain: chain === "base" ? base : lens,
      });
      rawData = {
        ..._rawData,
        chain: undefined,
        from: undefined,
        account: undefined,
        nonce: undefined,
        gas: undefined,
        maxPriorityFeePerGas: _rawData.maxPriorityFeePerGas.toString(),
        maxFeePerGas: _rawData.maxFeePerGas.toString(),
        gasLimit: _rawData.gas.toString(),
      };
    } catch (error) {
      // console.log(`simulation failed`, error);
    }

    return res.status(200).json({
      to: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
      amountOut: amountOut.toString(),
      maxAmountIn: maxAmountIn.toString(),
      rawData,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
