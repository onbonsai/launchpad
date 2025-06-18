import { useEffect, useState } from "react";

import { getProfilesOwned } from "@src/services/lens/getProfiles";

export default function useGetProfiles(address?: string) {
  const [profiles, setProfiles] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const lensProfiles = await getProfilesOwned(address!);
        setProfiles(lensProfiles || []);
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      fetchProfiles();
    } else {
      setIsLoading(false);
    }
  }, [address]);

  return { profiles, isLoading };
}
