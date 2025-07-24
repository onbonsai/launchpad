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

  useEffect(() => {
    const checkMiniApp = async () => {
      console.log('🔍 [useIsMiniApp] Starting checkMiniApp with:', {
        isFrameReady,
        coinbaseContextExists: !!coinbaseContext,
        coinbaseContextClientFid: coinbaseContext?.client?.clientFid
      });

      Sentry.addBreadcrumb({
        message: 'useIsMiniApp checkMiniApp started',
        category: 'miniapp',
        level: 'info',
        data: {
          isFrameReady,
          coinbaseContextExists: !!coinbaseContext,
          coinbaseContextClientFid: coinbaseContext?.client?.clientFid,
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

        const isCoinbaseMiniApp = context?.client.clientFid === 309857 || coinbaseContext?.client?.clientFid === 309857;
        console.log('🔍 [useIsMiniApp] isCoinbaseMiniApp calculation:', {
          contextClientFid: context?.client.clientFid,
          coinbaseContextClientFid: coinbaseContext?.client?.clientFid,
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
            coinbaseContextClientFid: coinbaseContext?.client?.clientFid,
            timestamp: Date.now()
          }
        });

        if (isCoinbaseMiniApp) {
          console.log('🔍 [useIsMiniApp] Detected Coinbase mini app, setting states');
          setMiniAppType("coinbase");
          setContext(context as FarcasterContext);
          setIsMiniApp(true);

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
          Sentry.addBreadcrumb({
            message: 'useIsMiniApp no mini app detected',
            category: 'miniapp',
            level: 'info',
            data: {
              isFarcasterMiniApp,
              contextClientFid: context?.client.clientFid,
              coinbaseContextClientFid: coinbaseContext?.client?.clientFid,
              timestamp: Date.now()
            }
          });
        }
      } catch (error) {
        console.error('🚨 [useIsMiniApp] Error checking mini app status:', error);
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
  }, [sdk, isFrameReady, coinbaseContext]);

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
