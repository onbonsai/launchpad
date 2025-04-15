import { createThirdwebClient, defineChain } from "thirdweb";

import { viemAdapter } from "thirdweb/adapters/viem";
import { IS_PRODUCTION, LENS_CHAIN_ID } from "../madfi/utils";

export const lensChain = defineChain({ id: 232 });

export const thirdwebWallet = async (walletClient) => {
  return await viemAdapter.wallet.fromViem({
    walletClient: walletClient,
  });
};

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID as string,
});