import { createThirdwebClient, defineChain } from "thirdweb";
import { viemAdapter } from "thirdweb/adapters/viem";

export const lensChain = defineChain({ id: 232, rpc: process.env.NEXT_PUBLIC_LENS_RPC });

export const thirdwebWallet = async (walletClient) => {
  return await viemAdapter.wallet.fromViem({
    walletClient: walletClient,
  });
};

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID as string,
});