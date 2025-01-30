import { NextApiRequest, NextApiResponse } from "next";
import { groupBy } from "lodash/collection";
import { getClubs } from "@src/services/madfi/moneyClubs";
import { getClientWithClubs } from "@src/services/mongo/client";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { page } = req.query;

    const data = await getClubs(page ? parseInt(page as string) : 0);

    // enriched with featured, handle, etc
    const clubIds = data?.clubs.map(({ clubId }) => parseInt(clubId));
    const { collection } = await getClientWithClubs();
    const _clubs = await collection.find(
      { clubId: { $in: clubIds } },
      { projection: { _id: 0 } }
    ).toArray();
    const groupedClubs = groupBy(_clubs || [], "clubId");
    const clubs = data?.clubs.map((_club) => {
      const club = groupedClubs[_club.clubId.toString()] ? groupedClubs[_club.clubId.toString()][0] : undefined;
      if (!club) return _club;
      const res = {
        ..._club,
        creatorStrategy: club.strategy,
        creatorPubId: club.pubId,
        creatorHandle: club.handle,
        creatorProfileId: club.profileId
      };

      if (_club.v2) { // backwards-compatibility
        res.token = {
          name: _club.name,
          symbol: _club.symbol,
          image: _club.uri
        };
      }
    });

    // cache 60s
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate');

    return res.status(200).json({ clubs, hasMore: data.hasMore });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ success: false });
  }
};

export default handler;
