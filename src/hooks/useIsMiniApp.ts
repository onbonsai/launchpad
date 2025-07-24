import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import * as Sentry from "@sentry/nextjs";

interface FarcasterContext {
  user: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    location: {
      placeId: string;
      description: string;
    };
  };
  client: {
    clientFid: number;
    added: boolean;
  };
  location?: {
    type: "cast_share";
    cast: {
      author: {
        fid: number;
        username: string;
        displayName: string;
        pfpUrl: string;
      };
      hash: string;
      timestamp: number;
      mentions: any[];
      text: string;
      embeds: string[];
      channelKey: string;
    };
  };
}

interface UseIsMiniAppResult {
  isMiniApp: boolean;
  isFarcasterMiniApp: boolean;
  isCoinbaseMiniApp: boolean;
  isLoading: boolean;
  context?: FarcasterContext;
}

// Global cache to prevent re-detection
let detectionCache: {
  hasDetected: boolean;
  result: UseIsMiniAppResult;
} | null = null;

export const useIsMiniApp = (): UseIsMiniAppResult => {
  const { context: coinbaseContext } = useMiniKit();

  // If we've already detected, return cached result immediately
  if (detectionCache?.hasDetected) {
    console.log('🔍 [useIsMiniApp] Returning cached result:', detectionCache.result);
    return detectionCache.result;
  }

  const [result, setResult] = useState<UseIsMiniAppResult>({
    isMiniApp: false,
    isFarcasterMiniApp: false,
    isCoinbaseMiniApp: false,
    isLoading: true,
    context: undefined
  });

  useEffect(() => {
    // If already detected globally, don't run again
    if (detectionCache?.hasDetected) {
      setResult(detectionCache.result);
      return;
    }

    let isMounted = true;

    const detectOnce = async () => {
      console.log('🔍 [useIsMiniApp] Running ONE-TIME detection');

      try {
        // Simple detection logic
        const isFarcasterMiniApp = await sdk.isInMiniApp();
        const context = await sdk.context;
        const isCoinbaseMiniApp = context?.client.clientFid === 309857 || coinbaseContext?.client?.clientFid === 309857;

        const finalResult: UseIsMiniAppResult = {
          isMiniApp: isFarcasterMiniApp || isCoinbaseMiniApp,
          isFarcasterMiniApp,
          isCoinbaseMiniApp,
          isLoading: false,
          context: context as FarcasterContext
        };

        console.log('🔍 [useIsMiniApp] ONE-TIME detection complete:', finalResult);

        // Cache globally to prevent any re-detection
        detectionCache = {
          hasDetected: true,
          result: finalResult
        };

        // Only update state if component is still mounted
        if (isMounted) {
          setResult(finalResult);
        }

        Sentry.addBreadcrumb({
          message: 'useIsMiniApp ONE-TIME detection completed',
          category: 'miniapp',
          level: 'info',
          data: {
            isFarcasterMiniApp,
            isCoinbaseMiniApp,
            cached: true,
            timestamp: Date.now()
          }
        });

      } catch (error) {
        console.error('🚨 [useIsMiniApp] Detection error:', error);

        const errorResult: UseIsMiniAppResult = {
          isMiniApp: false,
          isFarcasterMiniApp: false,
          isCoinbaseMiniApp: false,
          isLoading: false,
          context: undefined
        };

        // Cache error result too to prevent retries
        detectionCache = {
          hasDetected: true,
          result: errorResult
        };

        if (isMounted) {
          setResult(errorResult);
        }

        Sentry.captureException(error, {
          tags: { component: 'useIsMiniApp' }
        });
      }
    };

    detectOnce();

    return () => {
      isMounted = false;
    };
  }, []); // No dependencies = runs only once

  return result;
};
