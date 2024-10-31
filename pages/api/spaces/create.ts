import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

import { SPACES_API_URL, MADFI_API_KEY, MADFI_SITE_URL } from "@src/constants/constants";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { data, status } = await axios.post(`${SPACES_API_URL}/space/create`, req.body, {
      headers: { Authorization: `Bearer ${MADFI_API_KEY}`}
    });

    // TODO: verify
    // create seo image
    try {
      axios.post(`${MADFI_SITE_URL}/api/seo/spaces`, {
        profileHandle: req.body.creatorLensHandle,
        profileAvatarURL: req.body.creatorAvatar,
        profileBannerURL: req.body.creatorBanner
      });
    } catch (error) {
      console.log(error);
    }

    return res.status(status).json(data);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: true });
  }
};

export default handler;
