import { NextApiRequest, NextApiResponse } from "next";
import { isAddress } from "viem";
import { fetchStakingData } from "@src/hooks/useStakingData";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { address } = req.query;

    if (!address || !isAddress(address as string))
      return res.status(400).json({ error: "address must be an evm address" });

    const data = await fetchStakingData(address as `0x${string}`);

    return res.status(200).json(data);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
