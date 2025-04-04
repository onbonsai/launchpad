import { useState, useEffect } from 'react';
import { evmAddress } from "@lens-protocol/client";
import { fetchFollowersYouKnow } from "@lens-protocol/client/actions";
import { lensClient } from "@src/services/lens/client";

interface Follower {
  follower: {
    metadata?: {
      picture?: {
        optimized?: {
          uri: string;
        };
      };
    };
    username?: {
      localName: string;
    };
  };
  followedOn: string;
}

export const useFollowersYouKnow = (observerAddress: string, targetAddress: string) => {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await fetchFollowersYouKnow(lensClient, {
          observer: evmAddress(observerAddress),
          target: evmAddress(targetAddress),
        });

        if (result.isErr()) {
          throw new Error(result.error.message);
        }

        setFollowers(result.value.items);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch followers'));
      } finally {
        setIsLoading(false);
      }
    };

    if (observerAddress && targetAddress) {
      fetchData();
    }
  }, [observerAddress, targetAddress]);

  return { followers, isLoading, error };
}; 