import { useState, useEffect, useCallback } from 'react';
import { resumeSession } from "@src/hooks/useLensLogin";
import { getProfileByHandle } from "@src/services/lens/getProfiles";

interface ProfileOperations {
  isFollowedByMe: boolean;
  isFollowingMe: boolean;
  canFollow: {
    __typename: string;
  };
  canUnfollow: {
    __typename: string;
    unsatisfiedRules: null;
    reason: string;
  };
}

interface ProfileWithSession {
  operations?: ProfileOperations;
  // ... other profile fields
}

export const useProfileWithSession = (handle: string, isAuthenticated?: boolean) => {
  const [profileData, setProfileData] = useState<ProfileWithSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const sessionClient = await resumeSession();
      if (!sessionClient) return;
      const profile = await getProfileByHandle(handle, sessionClient);
      // @ts-ignore
      setProfileData(profile);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
    } finally {
      setIsLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, isAuthenticated]);

  return { profileData, isLoading, error, refetch: fetchProfile };
};