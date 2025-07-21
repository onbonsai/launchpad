import { useState, useEffect, useCallback } from 'react';
import { Preview } from '@src/services/madfi/terminal';

interface RemixData {
  preview: Preview;
  creatorFid: number;
  agentMessageId: string;
  createdAt: number;
}

interface RemixesResponse {
  remixes: RemixData[];
  creatorProfiles: Record<number, any>;
  hasMore: boolean;
  page: number;
  total: number;
}

interface UseGetRemixesReturn {
  remixes: RemixData[];
  creatorProfiles: Record<number, any>;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  total: number;
}

// for fetching farcaster related remixes
export const useGetRemixes = (parentCast: string | null | undefined): UseGetRemixesReturn => {
  const [remixes, setRemixes] = useState<RemixData[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<number, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

    const fetchRemixes = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (!parentCast) {
      setRemixes([]);
      setCreatorProfiles({});
      setHasMore(false);
      setTotal(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/media/get-farcaster-remixes?parentCast=${encodeURIComponent(parentCast)}&page=${pageNum}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch remixes: ${response.statusText}`);
      }

      const data: RemixesResponse = await response.json();

      if (reset) {
        setRemixes(data.remixes);
        setCreatorProfiles(data.creatorProfiles);
      } else {
        setRemixes(prev => [...prev, ...data.remixes]);
        setCreatorProfiles(prev => ({ ...prev, ...data.creatorProfiles }));
      }

      setHasMore(data.hasMore);
      setTotal(data.total);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch remixes');
      console.error('Error fetching remixes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [parentCast]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRemixes(nextPage, false);
    }
  }, [isLoading, hasMore, page, fetchRemixes]);

  const refresh = useCallback(() => {
    setPage(1);
    setRemixes([]);
    setCreatorProfiles({});
    setHasMore(true);
    fetchRemixes(1, true);
  }, [fetchRemixes]);

  useEffect(() => {
    if (parentCast) {
      setPage(1);
      setRemixes([]);
      setCreatorProfiles({});
      setHasMore(true);
      fetchRemixes(1, true);
    } else {
      setRemixes([]);
      setCreatorProfiles({});
      setHasMore(false);
      setTotal(0);
    }
  }, [parentCast, fetchRemixes]);

  return {
    remixes,
    creatorProfiles,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    total
  };
};