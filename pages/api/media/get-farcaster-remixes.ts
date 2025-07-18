import { NextApiRequest, NextApiResponse } from "next";
import { getClientWithMedia } from "@src/services/mongo/client";
import { ELIZA_API_URL } from "@src/services/madfi/studio";
import { fetchFarcasterUser } from "@src/services/neynar/api";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { parentCast, page = "1" } = req.query;

    if (!parentCast) {
      return res.status(400).json({ error: "parentCast query parameter is required" });
    }

    const pageNum = parseInt(page as string, 10);
    const limit = 15;
    const skip = (pageNum - 1) * limit;

    const { collection } = await getClientWithMedia();

    // Fetch smart media records where parentCast matches, sorted by createdAt desc
    const records = await collection
      .find(
        { parentCast: parentCast as string },
        { projection: { agentMessageId: 1, createdAt: 1, _id: 0 } }
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    if (records.length === 0) {
      return res.status(200).json({
        remixes: [],
        hasMore: false,
        page: pageNum,
        total: 0
      });
    }

    // Extract agentMessageIds
    const agentMessageIds = records.map(record => record.agentMessageId).filter(Boolean);

    if (agentMessageIds.length === 0) {
      return res.status(200).json({
        remixes: [],
        hasMore: false,
        page: pageNum,
        total: 0
      });
    }

    // Call bulk memories API
    const memoriesResponse = await fetch(`${ELIZA_API_URL}/memories/bulk?ids=${agentMessageIds.join(',')}`);

    if (!memoriesResponse.ok) {
      throw new Error(`Failed to fetch memories: ${memoriesResponse.statusText}`);
    }

    const memories = await memoriesResponse.json();

    // Extract unique creatorFids from memories and fetch profiles
    const uniqueCreatorFids = [...new Set(memories.map((memory: any) => memory.creatorFid).filter(Boolean))];
    const creatorProfiles: Record<number, any> = {};

    if (uniqueCreatorFids.length > 0) {
      try {
        const profilePromises = uniqueCreatorFids.map(fid => fetchFarcasterUser(fid));
        const profiles = await Promise.all(profilePromises);

        profiles.forEach((profile, index) => {
          if (profile) {
            creatorProfiles[uniqueCreatorFids[index]] = profile;
          }
        });
      } catch (error) {
        console.error("Error fetching creator profiles:", error);
        // Continue without profiles if fetching fails
      }
    }

    // Get total count for pagination
    const totalCount = await collection.countDocuments({ parentCast: parentCast as string });
    const hasMore = skip + limit < totalCount;

    // Cache for 60 seconds
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=59");

    return res.status(200).json({
      remixes: memories || [],
      creatorProfiles,
      hasMore,
      page: pageNum,
      total: totalCount
    });

  } catch (e) {
    console.error("Error fetching remixes:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default handler;