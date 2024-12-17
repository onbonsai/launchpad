import { http } from 'wagmi';
import { polygon, base, baseSepolia } from 'viem/chains';
import { createConfig } from '@privy-io/wagmi';
import { providers } from 'ethers';

import { ChainRpcs } from "@src/constants/chains";

export const configureChainsConfig = createConfig({
  chains: [baseSepolia, polygon, base],
  transports: {
    [polygon.id]: http(ChainRpcs[polygon.id]),
    [base.id]: http(ChainRpcs[base.id]),
    [baseSepolia.id]: http(ChainRpcs[baseSepolia.id])
  }
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
