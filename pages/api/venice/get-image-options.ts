import { NextApiRequest, NextApiResponse } from "next";

const BASE_URL = "https://api.venice.ai/api/v1";

const fetchData = async (url: string): Promise<any[] | undefined> => {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.VENICE_API_KEY}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch image options');
    const data = await response.json();
    return data.data as string[];
  } catch (error) {
    console.error('Error fetching image options:', error);
    return undefined;
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const [models, stylePresets] = await Promise.all([
      fetchData(`${BASE_URL}/models?type=image`),
      fetchData(`${BASE_URL}/image/styles`)
    ]);

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate');

    return res.status(200).json({ models: models?.map(({ id }) => id), stylePresets });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
