import { http } from "wagmi";
import { polygon, base, baseSepolia, mainnet } from "viem/chains";
import { createConfig } from "@privy-io/wagmi";
import { providers } from "ethers";

import { ChainRpcs } from "@src/constants/chains";
import { frameConnector } from "./connector";
import { lens, lensTestnet } from "@src/services/madfi/utils";

export const configureChainsConfig = createConfig({
  chains: [lens, lensTestnet, polygon, base, baseSepolia, mainnet],
  transports: {
    [lens.id]: http(ChainRpcs[lens.id]),
    [lensTestnet.id]: http(ChainRpcs[lensTestnet.id]),
    [polygon.id]: http(ChainRpcs[polygon.id]),
    [base.id]: http(ChainRpcs[base.id]),
    [baseSepolia.id]: http(ChainRpcs[baseSepolia.id]),
    [mainnet.id]: http(),
  },
  connectors: [frameConnector()],
});

export function walletClientToSigner(walletClient: any) {
  const { account, chain, transport } = walletClient;
  if (!chain) return;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new providers.Web3Provider(transport, network);
  return provider.getSigner(account.address);
}
