import { http, createConfig } from "wagmi";
import { polygon, base, baseSepolia, mainnet, zkSync } from "viem/chains";
import { getDefaultConfig } from "connectkit";

import { ChainRpcs } from "@src/constants/chains";
import { frameConnector } from "./connector";
import { lens, lensTestnet } from "@src/services/madfi/utils";
import { IS_PRODUCTION } from "@src/services/madfi/utils";

export const config = getDefaultConfig({
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
  // TOOD: not working with new connectkit setup
  // connectors: [frameConnector()],
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string,
  appName: "Bonsai",
  appDescription: "Create autonomous, agentic content on Lens",
  appUrl: IS_PRODUCTION ? "https://app.onbons.ai" : "https://testnet.onbons.ai",
  appIcon: "/static/images/logo.png", // IS_PRODUCTION ? "https://app.onbons.ai/static/images/logo.png" : "https://testnet.onbons.ai/static/images/logo.png",
});


export const configureChainsConfig = createConfig(config);
