import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithUserAudio } from "@src/services/mongo/client";
// import corsMiddleware from "@src/services/middleware/corsMiddleware";
// import { run } from "@services/middleware/run";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   await run(req, res, corsMiddleware);

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { address } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ message: "Address is required" });
  }

  try {
    const { collection, database } = await getClientWithUserAudio();
    const userAudio = await collection.findOne({ address: address.toLowerCase() });

    if (!userAudio) {
      return res.status(200).json({ audios: [] });
    }

    res.status(200).json({ audios: userAudio.audios || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
} 