import sdk from "@farcaster/miniapp-sdk";
import { useQuery } from "@tanstack/react-query";
import { useIsMiniApp } from "./useIsMiniApp";

type PostUpdate = {
  postId: string;
  creditsUsed: number;
  timestamp: number;
};

export type CreditBalance = {
  totalCredits: number;
  freeCredits: number;
  stakingCredits: number;
  creditsUsed: number;
  creditsRemaining: number;
  lastResetTime: string;
  creditsPurchased: number;
  postUpdates: PostUpdate[];
};

export const fetchCredits = async (address: string, isMiniApp?: boolean, fid?: number): Promise<CreditBalance> => {
  const response = await fetch(`/api/credits/balance?address=${address}&isMiniApp=${isMiniApp}${!!fid ? `&fid=${fid}` : ''}`);
  if (!response.ok) throw new Error("Failed to fetch credits");
  const data = await response.json();
  return data;
};

export const useGetCredits = (address: string, isConnected: boolean) => {
  const { isLoading: isMiniAppLoading, isMiniApp, context } = useIsMiniApp();
  return useQuery({
    queryKey: ["credits", isMiniApp ? context?.user?.fid : address],
    queryFn: () => fetchCredits(address as string, isMiniApp, context?.user?.fid),
    enabled: !!address && isConnected && !isMiniAppLoading,
    refetchInterval: 60000, // Refetch every minute
  });
};
