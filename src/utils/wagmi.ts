import { http, createConfig } from "wagmi";
import { polygon, base, baseSepolia, mainnet, zkSync } from "viem/chains";
import { getDefaultConfig } from "connectkit";
import { farcasterFrame as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

import { ChainRpcs } from "@src/constants/chains";
import { lens, lensTestnet } from "@src/services/madfi/utils";
import { IS_PRODUCTION } from "@src/services/madfi/utils";

let configInstance: ReturnType<typeof createConfig> | null = null;

export const config = (isMiniApp?: boolean) => {
  if (!configInstance) {
    const options = {
      chains: [isMiniApp ? base : lens, isMiniApp ? lens : base, lensTestnet, polygon, baseSepolia, mainnet, zkSync],
      transports: {
        [lens.id]: http(ChainRpcs[lens.id]),
        [lensTestnet.id]: http(ChainRpcs[lensTestnet.id]),
        [polygon.id]: http(ChainRpcs[polygon.id]),
        [base.id]: http(ChainRpcs[base.id]),
        [baseSepolia.id]: http(ChainRpcs[baseSepolia.id]),
        [mainnet.id]: http(),
        [zkSync.id]: http(ChainRpcs[zkSync.id]),
      },
      connectors: isMiniApp ? [miniAppConnector] : undefined,
      walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string,
      appName: "Bonsai",
      appDescription: "Create & monetize AI media",
      appUrl: IS_PRODUCTION ? "https://app.onbons.ai" : "https://testnet.onbons.ai",
      appIcon: "/static/images/logo.png",
    }
    const defaultConfig = getDefaultConfig(options as any);
    defaultConfig.ssr = false; // https://bonsai-labs-ek.sentry.io/issues/6677952145/?project=4509125819039744&query=is:unresolved&stream_index=1
    configInstance = createConfig(defaultConfig);
  }
  return configInstance;
};

// For backward compatibility
export const configureChainsConfig = config();
