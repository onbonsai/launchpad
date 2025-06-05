import { useState, useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";

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
}

interface UseIsMiniAppResult {
  isMiniApp: boolean;
  context?: FarcasterContext;
}

export const useIsMiniApp = (): UseIsMiniAppResult => {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [context, setContext] = useState<FarcasterContext>();

  useEffect(() => {
    const checkMiniApp = async () => {
      const isMiniApp = await sdk.isInMiniApp();

      if (isMiniApp) {
        setIsMiniApp(true);
        const context = await sdk.context;
        setContext(context as FarcasterContext);
      } else {
        setIsMiniApp(false);
      }
    };

    checkMiniApp();
  }, []);

  return { isMiniApp, context };
};
