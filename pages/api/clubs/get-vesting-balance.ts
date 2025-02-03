import { NextApiRequest, NextApiResponse } from "next";
import { getAvailableBalance } from "@src/services/madfi/moneyClubs";
import { formatEther, isAddress } from "viem";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { tokenAddress, account } = req.query;

    if (!(isAddress(tokenAddress as string) && isAddress(account as string)))
      return res.status(400).json("tokenAddress and account must be addresses");

    const {
      availableBalance,
      vestingBalance,
      totalBalance
    } = await getAvailableBalance(tokenAddress as `0x${string}`, account as `0x${string}`);

    // cache 60s
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate');

    return res.status(200).json({
      availableBalance: formatEther(availableBalance),
      vestingBalance: formatEther(vestingBalance),
      totalBalance: formatEther(totalBalance)
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
