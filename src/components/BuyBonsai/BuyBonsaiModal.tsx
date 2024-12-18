import { useAccount } from "wagmi";
import { ChainId, getNativeTokenInfo } from '@decent.xyz/box-common';
import { SwapModal } from '@decent.xyz/the-box';
import { inter } from "@src/fonts/fonts";

import { configureChainsConfig } from "@src/utils/wagmi";

import { bonsaiToken } from './crypto/Models';
import clsx from "clsx";

const BuyBonsaiModal = () => {
  const { address } = useAccount();

  return (
    <SwapModal
      className={clsx("rounded-3xl bg-transparent p-0 m-0", inter.className)}
      apiKey={process.env.NEXT_PUBLIC_DECENT_API_KEY ?? ''}
      wagmiConfig={configureChainsConfig}
      selectedDstToken={{
        chainId: ChainId.BASE_SEPOLIA,
        tokenInfo: bonsaiToken,
      }}
      selectedSrcToken={{ chainId: ChainId.BASE_SEPOLIA, tokenInfo: getNativeTokenInfo(ChainId.BASE_SEPOLIA)! }}
      onConnectWallet={() => { }}
      popularTokens={[bonsaiToken]}
      chainIds={[ChainId.POLYGON, ChainId.ETHEREUM, ChainId.BASE, ChainId.ZKSYNC]}
      receiverAddress={address}
    />
  );
}

export default BuyBonsaiModal;