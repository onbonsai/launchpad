import { useAccount } from "wagmi";
import { ChainId, getNativeTokenInfo } from '@decent.xyz/box-common';
import { SwapModal } from '@decent.xyz/the-box';
import { inter } from "@src/fonts/fonts";

import { configureChainsConfig } from "@src/utils/wagmi";

import { bonsaiToken, usdc } from '../BuyBonsai/crypto/Models';
import clsx from "clsx";

interface BuyUSDCModalProps {
  buyAmount: number;
}

const BuyUSDCModal = (props: BuyUSDCModalProps) => {
  const { address, } = useAccount();

  return (
    <SwapModal
      className={clsx("rounded-3xl bg-transparent p-0 pt-4 m-0", inter.className)}
      apiKey={process.env.NEXT_PUBLIC_DECENT_API_KEY ?? ''}
      wagmiConfig={configureChainsConfig}
      selectedDstToken={{
        chainId: ChainId.BASE,
        tokenInfo: usdc,
      }}
      selectedSrcToken={{ chainId: ChainId.BASE, tokenInfo: getNativeTokenInfo(ChainId.BASE)! }}
      onConnectWallet={() => { }}
      popularTokens={[usdc]}
      defaultDstAmount={props.buyAmount}
      chainIds={[ChainId.POLYGON, ChainId.ETHEREUM, ChainId.BASE, ChainId.ZKSYNC]}
      receiverAddress={address}
    />
  );
}

export default BuyUSDCModal;