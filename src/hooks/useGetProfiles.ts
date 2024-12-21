import { useEffect, useState } from "react";

import { getProfilesOwned, getProfilesManaged } from "@src/services/lens/getProfiles";

export default function useGetProfiles(address?: string) {
  const [profiles, setProfiles] = useState<any[] | null>(null);
  const [farcasterProfiles, setFarcasterProfiles] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const [lensProfiles, managedLensProfiles, { info, farcasterProfiles }] = await Promise.all([
          getProfilesOwned(address!),
          getProfilesManaged(address!),
          (async () => {
            const url = `/api/creators/fetch-creator-info?address=${address!.toLowerCase()}`;
            const response = await fetch(url, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) return { info: {}, farcasterProfiles: [] };
            return await response.json();
          })()
        ]);

        const resMap = new Map(lensProfiles?.map(item => [item.id, item]));
        const uniqueManaged = managedLensProfiles?.filter(item => !resMap.has(item.id)) || [];
        setProfiles([...lensProfiles || [], ...uniqueManaged]);
        setFarcasterProfiles(info?.farcaster ? [info!.farcaster] : farcasterProfiles);
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      fetchProfiles();
    }
  }, [address]);

  return { profiles, farcasterProfiles, isLoading };
}
