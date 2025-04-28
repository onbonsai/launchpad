import { useQuery } from "@tanstack/react-query";

export type CreditBalance = {
  totalCredits: number;
  freeCredits: number;
  stakingCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  lastResetTime: string;
  creditsPurchased: number;
}

export const fetchCredits = async (address: string): Promise<CreditBalance> => {
  const response = await fetch(`/api/credits/balance?address=${address}`);
  if (!response.ok) throw new Error("Failed to fetch credits");
  return response.json();
};

export const useGetCredits = (address: string, isConnected: boolean) => {
  return useQuery({
    queryKey: ["credits", address],
    queryFn: () => fetchCredits(address as string),
    enabled: !!address && isConnected,
    refetchInterval: 60000, // Refetch every minute
  });
};
