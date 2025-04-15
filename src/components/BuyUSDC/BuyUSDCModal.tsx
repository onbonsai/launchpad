import { useAccount, useWalletClient } from "wagmi";
import { PayEmbed } from "thirdweb/react";
import { client, thirdwebWallet, lensChain } from "@src/services/thirdweb/client";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { Wallet } from "thirdweb/dist/types/exports/wallets.native";
import Spinner from "../LoadingSpinner/LoadingSpinner";
// import { ChainId, getNativeTokenInfo } from '@decent.xyz/box-common';
// import { SwapModal } from '@decent.xyz/the-box';
// import { brandFont } from "@src/fonts/fonts";
// import { configureChainsConfig } from "@src/utils/wagmi";
// import { usdc } from '../BuyBonsai/crypto/Models';
// import clsx from "clsx";

interface BuyUSDCModalProps {
  chain: string; // base | lens
  buyAmount: number;
  closeModal: () => void;
}

// TODO: handle the USDC buy
const BuyUSDCModal = ({ chain, buyAmount, closeModal }: BuyUSDCModalProps) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [activeWallet, setActiveWallet] = useState<Wallet | undefined>();

  useEffect(() => {
    const connectThirdweb = async () => {
      const _client = await thirdwebWallet(walletClient);
      await _client.connect({ client });
      setActiveWallet(_client);
    }

    connectThirdweb();
  }, []);

  if (!activeWallet) {
    return (
      <div className="flex justify-center">
        <Spinner customClasses="h-6 w-6" color="#5be39d" />
      </div>
    )
  }

  return (
    <PayEmbed
      activeWallet={activeWallet}
      client={client}
      payOptions={{
        mode: "fund_wallet",
        metadata: {
          name: "Get GHO on Lens Chain",
        },
        prefillBuy: {
          chain: lensChain,
          amount: "100"
        },
        // buyWithFiat: {
        //   preferredProvider: "COINBASE",

        //   // enable/disable test mode
        //   testMode: false,
        // },
        // paymentInfo: {
        //   // amount of token to buy
        //   amount: buyAmount ? buyAmount.toString() : "100",

        //   chain: lensChain,

        //   // using the EOA until lens account is easier
        //   sellerAddress: address as `0x${string}`,
        //   // token: {
        //   //   address: "0x6bDc36E20D267Ff0dd6097799f82e78907105e2F",

        //   //   // Making it look like GHO token
        //   //   name: "GHO",
        //   //   symbol: "GHO",
        //   //   icon: "https://explorer.lens.xyz/images/gho.png",
        //   // },
        // },
        onPurchaseSuccess: (purchase) => {
          console.log("Purchase success", purchase);
          toast.success("Bought GHO")
        },
      }}
    />
  );

  // DECENT THE BOX
  // return (
  //   <SwapModal
  //     className={clsx("rounded-3xl bg-transparent p-0 pt-4 m-0", brandFont.className)}
  //     apiKey={process.env.NEXT_PUBLIC_DECENT_API_KEY ?? ''}
  //     wagmiConfig={configureChainsConfig}
  //     selectedDstToken={{
  //       chainId: ChainId.BASE,
  //       tokenInfo: usdc,
  //     }}
  //     selectedSrcToken={{ chainId: ChainId.BASE, tokenInfo: getNativeTokenInfo(ChainId.BASE)! }}
  //     onConnectWallet={() => { }}
  //     popularTokens={[usdc]}
  //     defaultDstAmount={props.buyAmount}
  //     chainIds={[ChainId.POLYGON, ChainId.ETHEREUM, ChainId.BASE, ChainId.ZKSYNC]}
  //     receiverAddress={address}
  //   />
  // );
}

export default BuyUSDCModal;