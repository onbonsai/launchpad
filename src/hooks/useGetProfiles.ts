import { useEffect, useState } from "react";

import { getProfilesOwned } from "@src/services/lens/getProfiles";

export default function useGetProfiles(address?: string) {
  const [profiles, setProfiles] = useState<any[] | null>(null);
  const [farcasterProfiles, setFarcasterProfiles] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const [lensProfiles, { info, farcasterProfiles }] = await Promise.all([
          getProfilesOwned(address!),
          (async () => {
            const url = `/api/creators/fetch-creator-info?address=${address!.toLowerCase()}`;
            const response = await fetch(url, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) return { info: {}, farcasterProfiles: [] };
            return await response.json();
          })(),
        ]);

        setProfiles(lensProfiles || []);
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
