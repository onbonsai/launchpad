import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
// @ts-expect-error moduleResolution: nodenext
import { useMiniKit } from '@coinbase/onchainkit/minikit';

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

  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        setIsLoading(true);
        const isFarcasterMiniApp = await sdk.isInMiniApp();
        const isCoinbaseMiniApp = coinbaseContext?.clientFid === 309857;

        if (isFarcasterMiniApp) {
          setIsMiniApp(true);
          setMiniAppType('farcaster');
          const farcasterContext = await sdk.context;
          setContext(farcasterContext as FarcasterContext);
        } else if (isCoinbaseMiniApp) {
          setIsMiniApp(true);
          setMiniAppType('coinbase');
          setContext(coinbaseContext as FarcasterContext);
        } else {
          // final option
          const context = await sdk.context;
          if (context?.client.clientFid === 309857) {
            setIsMiniApp(true);
            setMiniAppType('coinbase');
            setContext(coinbaseContext as FarcasterContext);
          }
        }
      } catch (error) {
        console.warn('Error checking mini app status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkMiniApp();
  }, [sdk, isFrameReady, coinbaseContext]);

  return {
    isMiniApp,
    isFarcasterMiniApp: miniAppType === 'farcaster',
    isCoinbaseMiniApp: miniAppType === 'coinbase',
    isLoading,
    context
  };
};
