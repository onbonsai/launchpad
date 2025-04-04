import { NextApiRequest, NextApiResponse } from "next";
import { encodeFunctionData, parseUnits, zeroAddress } from "viem";

import { getBuyAmount, publicClient, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import BonsaiLaunchpadAbi from "@src/services/madfi/abi/BonsaiLaunchpad.json";
import { base } from "viem/chains";

type QueryParams = {
  clubId: string,
  tokenAddress: `0x${string}`;
  senderAddress: `0x${string};`
  amountIn: string; // usdc amount user is willing to pay
  clientAddress?: `0x${string}`;
  recipientAddress: `0x${string}`;
  referralAddress?: `0x${string}`;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {

    let {
      clubId, tokenAddress, amountIn, senderAddress, clientAddress, recipientAddress, referralAddress, chain
    } = req.query as Partial<QueryParams>;

    chain = chain || "base";

    if (!(clubId && tokenAddress && amountIn && senderAddress)) {
      return res.status(400).json({ success: false, message: "Missing required query parameters" });
    }

    const { buyAmount: amountOut } = await getBuyAmount(senderAddress, tokenAddress, amountIn);

    const buyPriceBigInt = parseUnits(amountIn, USDC_DECIMALS)
    const maxAmountIn = buyPriceBigInt * BigInt(105) / BigInt(100) // 5% slippage allowed

    const data = encodeFunctionData({
      abi: BonsaiLaunchpadAbi,
      functionName: 'buyChips',
      args: [
        clubId,
        amountOut,
        maxAmountIn,
        clientAddress || zeroAddress,
        recipientAddress || zeroAddress,
        referralAddress || zeroAddress
      ],
    });

    let rawData: any | null = null;
    try {
      const _rawData = await publicClient().prepareTransactionRequest({
        to: PROTOCOL_DEPLOYMENT[chain].BonsaiLaunchpad,
        account: senderAddress,
        data,
        chain: base
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
      rawData
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
