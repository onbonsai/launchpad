import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithCreatorInfo } from "@src/services/mongo/client";
import { getProfilesOwned } from "@src/services/lens/getProfiles";
import { Account } from "@lens-protocol/client";
import { getPostsByAuthor } from "@src/services/lens/posts";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { address, account } = req.query;

  if (!(account || address)) {
    res.status(400).json({ error: "account or address are required" });
    return;
  }

  let authorId = account;
  if (!authorId) {
    const profiles = await getProfilesOwned(address as `0x${string}`);
    authorId = profiles?.find((profile: any) => profile.__typename === "AccountOwned")?.account?.address;
  }
  if (!authorId) {
    res.status(404).json({ error: "account not found" });
    return;
  }
  try {
    const posts = await getPostsByAuthor(authorId as string);

    res.status(200).json({ posts: (posts as any)?.value?.items });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default handler;
