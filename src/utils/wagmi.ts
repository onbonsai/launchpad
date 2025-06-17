import { http, createConfig } from "wagmi";
import { polygon, base, baseSepolia, mainnet, zkSync } from "viem/chains";
import { getDefaultConfig } from "connectkit";
import { farcasterFrame as miniAppConnector } from '@farcaster/frame-wagmi-connector'

import { ChainRpcs } from "@src/constants/chains";
import { lens, lensTestnet } from "@src/services/madfi/utils";
import { IS_PRODUCTION } from "@src/services/madfi/utils";
import { sdk } from "@farcaster/frame-sdk";

let configInstance: ReturnType<typeof createConfig> | null = null;
let configPromise: Promise<ReturnType<typeof createConfig>> | null = null;

export const config = () => {
  if (!configPromise) {
    configPromise = (async () => {
      const isMiniApp = await sdk.isInMiniApp();
      const options = {
        chains: [lens, lensTestnet, polygon, base, baseSepolia, mainnet, zkSync],
        transports: {
          [lens.id]: http(ChainRpcs[lens.id]),
          [lensTestnet.id]: http(ChainRpcs[lensTestnet.id]),
          [polygon.id]: http(ChainRpcs[polygon.id]),
          [base.id]: http(ChainRpcs[base.id]),
          [baseSepolia.id]: http(ChainRpcs[baseSepolia.id]),
          [mainnet.id]: http(),
          [zkSync.id]: http(ChainRpcs[zkSync.id]),
        },
        ...(isMiniApp ? { connectors: [miniAppConnector] } : {}),
        walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string,
        appName: "Bonsai",
        appDescription: "Create autonomous, agentic content on Lens",
        appUrl: IS_PRODUCTION ? "https://app.onbons.ai" : "https://testnet.onbons.ai",
        appIcon: "/static/images/logo.png",
      }
      // @ts-expect-error
      const defaultConfig = getDefaultConfig(options);
      defaultConfig.ssr = false; // https://bonsai-labs-ek.sentry.io/issues/6677952145/?project=4509125819039744&query=is:unresolved&stream_index=1
      // @ts-expect-error
      configInstance = createConfig(defaultConfig);
      return configInstance;
    })();
  }
  return configInstance;
};

// For backward compatibility
export const configureChainsConfig = config();
