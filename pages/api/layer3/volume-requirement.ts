import { NextApiRequest, NextApiResponse } from "next";
import { getTrader, USDC_DECIMALS } from "@src/services/madfi/moneyClubs";
import { isAddress, parseUnits } from "viem";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { address } = req.query;

    if (!address || !isAddress(address as string))
      return res.status(400).json({ error: "address must be an evm address"});

    // fetch trader and his trades where only buys, created less than 24 hours ago
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const trader = await getTrader({
      id: address as `0x${string}`,
      isBuy: true,
      createdAt_gt: twentyFourHoursAgo
    });

    const totalVolume = trader?.trades.reduce((acc: bigint, trade: any) => {
      return acc + BigInt(trade.txPrice as string);
    }, 0n) || 0n;

    // console.log(`totalVolume: ${formatUnits(totalVolume, USDC_DECIMALS)}`);

    // at least $10 in volume in the last 24 hours
    const VOLUME_REQUIREMENT = parseUnits("10", USDC_DECIMALS);
    if (totalVolume < VOLUME_REQUIREMENT) {
      return res.status(200).json({ status: "failed" });
    }

    return res.status(200).json({ status: "success" });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
