import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import * as Sentry from "@sentry/nextjs";

interface FarcasterContext {
  user: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string; // doesn't exit in coinbase miniapp
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

type MiniAppType = 'farcaster' | 'coinbase' | null;

interface UseIsMiniAppResult {
  isMiniApp: boolean;
  isFarcasterMiniApp: boolean;
  isCoinbaseMiniApp: boolean;
  isLoading: boolean;
  context?: FarcasterContext;
}

export const useIsMiniApp = (): UseIsMiniAppResult => {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [miniAppType, setMiniAppType] = useState<MiniAppType>(null);
  const [context, setContext] = useState<FarcasterContext>();
  const [hasRunCheck, setHasRunCheck] = useState(false);
  // using the coinbase hook since the fc one is not consistently reliable
  const { isFrameReady, context: coinbaseContext } = useMiniKit();

  // Add debug logging
  console.log('🔍 [useIsMiniApp] Hook initialized with states:', {
    isMiniApp,
    isLoading,
    miniAppType,
    isFrameReady,
    coinbaseContextExists: !!coinbaseContext,
    coinbaseContextClientFid: coinbaseContext?.client?.clientFid
  });

  Sentry.addBreadcrumb({
    message: 'useIsMiniApp hook initialized',
    category: 'miniapp',
    level: 'info',
    data: {
      isMiniApp,
      isLoading,
      miniAppType,
      isFrameReady,
      coinbaseContextExists: !!coinbaseContext,
      coinbaseContextClientFid: coinbaseContext?.client?.clientFid
    }
  });

  // Memoize coinbase context values to prevent infinite re-renders
  const coinbaseContextClientFid = coinbaseContext?.client?.clientFid;
  const coinbaseContextExists = !!coinbaseContext;

  useEffect(() => {
    // Only run check once or when critical values actually change
    if (hasRunCheck && miniAppType !== null) {
      console.log('🔍 [useIsMiniApp] Skipping check - already determined mini app type:', miniAppType);
      return;
    }

    const checkMiniApp = async () => {
      console.log('🔍 [useIsMiniApp] Starting checkMiniApp with:', {
        hasRunCheck,
        isFrameReady,
        coinbaseContextExists,
        coinbaseContextClientFid
      });

      Sentry.addBreadcrumb({
        message: 'useIsMiniApp checkMiniApp started',
        category: 'miniapp',
        level: 'info',
        data: {
          hasRunCheck,
          isFrameReady,
          coinbaseContextExists,
          coinbaseContextClientFid,
          timestamp: Date.now()
        }
      });

      try {
        setIsLoading(true);
        console.log('🔍 [useIsMiniApp] Set isLoading to true');

        const isFarcasterMiniApp = await sdk.isInMiniApp();
        console.log('🔍 [useIsMiniApp] sdk.isInMiniApp() result:', isFarcasterMiniApp);

        const context = await sdk.context;
        console.log('🔍 [useIsMiniApp] sdk.context result:', {
          contextExists: !!context,
          clientFid: context?.client?.clientFid,
          username: context?.user?.username,
          displayName: context?.user?.displayName
        });

        const isCoinbaseMiniApp = context?.client.clientFid === 309857 || coinbaseContextClientFid === 309857;
        console.log('🔍 [useIsMiniApp] isCoinbaseMiniApp calculation:', {
          contextClientFid: context?.client.clientFid,
          coinbaseContextClientFid,
          isCoinbaseMiniApp
        });

        Sentry.addBreadcrumb({
          message: 'useIsMiniApp detection results',
          category: 'miniapp',
          level: 'info',
          data: {
            isFarcasterMiniApp,
            isCoinbaseMiniApp,
            contextClientFid: context?.client.clientFid,
            coinbaseContextClientFid,
            timestamp: Date.now()
          }
        });

        if (isCoinbaseMiniApp) {
          console.log('🔍 [useIsMiniApp] Detected Coinbase mini app, setting states');
          setMiniAppType("coinbase");
          setContext(context as FarcasterContext);
          setIsMiniApp(true);
          setHasRunCheck(true); // Mark as completed

          Sentry.addBreadcrumb({
            message: 'useIsMiniApp detected Coinbase mini app',
            category: 'miniapp',
            level: 'info',
            data: {
              contextClientFid: context?.client.clientFid,
              username: context?.user?.username,
              timestamp: Date.now()
            }
          });
        } else if (isFarcasterMiniApp) {
          console.log('🔍 [useIsMiniApp] Detected Farcaster mini app, setting states');
          setMiniAppType("farcaster");
          setContext(context as FarcasterContext);
          setIsMiniApp(true);
          setHasRunCheck(true); // Mark as completed

          Sentry.addBreadcrumb({
            message: 'useIsMiniApp detected Farcaster mini app',
            category: 'miniapp',
            level: 'info',
            data: {
              contextClientFid: context?.client.clientFid,
              username: context?.user?.username,
              timestamp: Date.now()
            }
          });
        } else {
          console.log('🔍 [useIsMiniApp] No mini app detected');
          setHasRunCheck(true); // Mark as completed even if no mini app

          Sentry.addBreadcrumb({
            message: 'useIsMiniApp no mini app detected',
            category: 'miniapp',
            level: 'info',
            data: {
              isFarcasterMiniApp,
              contextClientFid: context?.client.clientFid,
              coinbaseContextClientFid,
              timestamp: Date.now()
            }
          });
        }
      } catch (error) {
        console.error('🚨 [useIsMiniApp] Error checking mini app status:', error);
        setHasRunCheck(true); // Mark as completed even on error to prevent infinite retries

        Sentry.addBreadcrumb({
          message: 'useIsMiniApp error during detection',
          category: 'miniapp',
          level: 'error',
          data: {
            error: error?.toString(),
            timestamp: Date.now()
          }
        });
        Sentry.captureException(error, {
          tags: { component: 'useIsMiniApp' }
        });
      } finally {
        setIsLoading(false);
        console.log('🔍 [useIsMiniApp] Set isLoading to false, checkMiniApp complete');

        Sentry.addBreadcrumb({
          message: 'useIsMiniApp checkMiniApp completed',
          category: 'miniapp',
          level: 'info',
          data: {
            isLoading: false,
            timestamp: Date.now()
          }
        });
      }
    };

    checkMiniApp();
  }, [hasRunCheck, miniAppType, coinbaseContextClientFid, coinbaseContextExists]);

  const result = {
    isMiniApp,
    isFarcasterMiniApp: miniAppType === 'farcaster',
    isCoinbaseMiniApp: miniAppType === 'coinbase',
    isLoading,
    context
  };

  console.log('🔍 [useIsMiniApp] Returning result:', result);

  return result;
};
