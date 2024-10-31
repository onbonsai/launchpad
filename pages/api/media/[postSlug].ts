import { NextApiRequest, NextApiResponse } from "next";
import { fetchSmartMedia } from "@src/services/madfi/studio";
import { getPost } from "@src/services/lens/posts";
import { Post } from "@lens-protocol/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { postSlug } = req.query;

    if (!postSlug || typeof postSlug !== 'string') {
      return res.status(400).json({ error: 'Invalid post slug' });
    }

    // Fetch the post from Lens
    const post = await getPost(postSlug);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Fetch smart media with full resolution
    const smartMedia = await fetchSmartMedia(post as Post, true);
    if (!smartMedia) {
      return res.status(404).json({ error: 'No smart media found for post' });
    }

    // Cache for 60s with stale-while-revalidate
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate");
    return res.status(200).json(smartMedia);
  } catch (e) {
    console.error('Error fetching smart media:', e);
    return res.status(500).json({ error: 'Failed to fetch smart media' });
  }
};

export default handler;
