import { NextApiRequest, NextApiResponse } from "next";

import { getClientWithCreatorInfo } from "@src/services/mongo/client";
import { getProfilesOwned } from "@src/services/lens/getProfiles";
import { AnyPost } from "@lens-protocol/client";
import { getPostsByAuthor } from "@src/services/lens/posts";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { address, account } = req.query;

  if (!(account || address)) {
    res.status(400).json({ error: "account or address are required" });
    return;
  }

  let authorIds: string[] = [];

  if (account) {
    // If account is provided directly, use it
    authorIds = [account as string];
  } else {
    // Get all profiles owned by the address
    const profiles = await getProfilesOwned(address as `0x${string}`);

    if (!profiles || profiles.length === 0) {
      res.status(404).json({ error: "No profiles found for this address" });
      return;
    }

    // Extract account addresses from all profiles that are AccountOwned
    authorIds = profiles
      .filter(profile => profile.__typename === "AccountOwned")
      .map(profile => profile.account?.address)
      .filter(Boolean); // Remove any undefined values
  }

  if (authorIds.length === 0) {
    res.status(404).json({ error: "No valid accounts found" });
    return;
  }

  try {
    // Fetch posts for all profiles in parallel
    const postsPromises = authorIds.map(authorId => getPostsByAuthor(authorId));
    const postsResults = await Promise.all(postsPromises);

    // Process results and combine posts
    const allPosts: AnyPost[] = [];

    for (const result of postsResults) {
      if (result.isOk()) {
        const posts = result.value.items;
        allPosts.push(...posts);
      } else {
        console.error("Error fetching posts:", result.error);
      }
    }

    allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.status(200).json({ posts: allPosts });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export default handler;
