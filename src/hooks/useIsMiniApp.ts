import { useState, useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";
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
}

type MiniAppType = 'farcaster' | 'coinbase' | null;

interface UseIsMiniAppResult {
  isMiniApp: boolean;
  isFarcasterMiniApp: boolean;
  isCoinbaseMiniApp: boolean;
  context?: FarcasterContext;
}

export const useIsMiniApp = (): UseIsMiniAppResult => {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [miniAppType, setMiniAppType] = useState<MiniAppType>(null);
  const [context, setContext] = useState<FarcasterContext>();
  // using the coinbase hook since the fc one is not consistently reliable
  const { isFrameReady, context: coinbaseContext } = useMiniKit();

  useEffect(() => {
    const checkMiniApp = async () => {
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
      }
    };

    checkMiniApp();
  }, [isFrameReady, coinbaseContext]);

  return {
    isMiniApp,
    isFarcasterMiniApp: miniAppType === 'farcaster',
    isCoinbaseMiniApp: miniAppType === 'coinbase',
    context
  };
};
