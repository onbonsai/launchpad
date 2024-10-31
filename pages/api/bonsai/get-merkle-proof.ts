import { NextApiRequest, NextApiResponse } from "next";
import verifyIdToken from "@src/services/lens/verifyIdToken";
import { getClientWithBonsaiClaim } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ error: "Missing authorization header" });
    const token = authorization.split(" ")[1];

    const user = await verifyIdToken(token);
    let record;
    if (!!user) {
      const address = (user.sub as `0x${string}`).toLowerCase();
      const { collection } = await getClientWithBonsaiClaim();

      record = await collection.findOne({ address }, { projection: { _id: 0 } });
    }

    return res.status(!!record ? 200 : 404).json(record);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
