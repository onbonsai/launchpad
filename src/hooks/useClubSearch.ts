import { useQuery } from "@tanstack/react-query";

const fetchClubs = async (query?: string) => {
  if (!query) return [];

  const response = await fetch('/api/clubs/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch clubs');
  }

  const { results } = await response.json();
  return results;
};

export default (query?: string) => {
  return useQuery({
    queryKey: ["search-clubs", query],
    queryFn: () => fetchClubs(query),
    enabled: !!query,
    staleTime: 60000 * 2,
    gcTime: 60000 * 5,
  });
};
