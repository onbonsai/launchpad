import { useQuery } from '@tanstack/react-query';
import { groupBy } from 'lodash';
import { getProfileByHandle } from '@src/services/lens/getProfiles';
import { getBasenameAvatar } from '@src/services/base/basename';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { formatProfilePicture } from '@madfi/widgets-react';
import { ProfileFragment } from '@lens-protocol/client';

const fetchClubCreators = async (clubs) => {
  const profiles = await Promise.all(clubs.map(async ({ club: { strategy, handle, clubId } }) => {
    let profile;
    switch (strategy) {
      case 'lens':
        profile = await getProfileByHandle(`lens/${handle}`) as ProfileFragment;
        profile = { picture: formatProfilePicture(profile).metadata?.picture?.url };
        break;
      case 'basename':
        profile = { picture: await getBasenameAvatar(handle) };
        break;
      case 'ens':
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC)
        });
        profile = { picture: await publicClient.getEnsAvatar({ name: handle }) };
        break;
      default:
        profile = null;
    }
    return profile ? { clubId, profile } : null;
  }));

  const filteredProfiles = profiles.filter((p) => p !== null);
  return groupBy(filteredProfiles, 'clubId');
};

export const useGetClubCreators = (clubs, clubsCached) => {
  return useQuery({
    queryKey: ['club-creators', `${clubs?.length > 0 ? clubs[0]?.clubId : ''}_${clubs?.length > 0 ? clubs[clubs.length - 1]?.clubId : ''}`],
    queryFn: () => fetchClubCreators(clubs.filter((c) => !clubsCached[c.club.id])),
    enabled: !!clubs?.length,
  });
};

export default useGetClubCreators;