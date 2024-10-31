import { useAccount, useWalletClient } from "wagmi";
import { PayEmbed } from "thirdweb/react";
import { defineChain, NATIVE_TOKEN_ADDRESS } from "thirdweb";
import { client, thirdwebWallet, thirdwebLens, thirdwebBase } from "@src/services/thirdweb/client";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { Wallet } from "thirdweb/dist/types/exports/wallets.native";
import Spinner from "../LoadingSpinner/LoadingSpinner";
import { USDC_CONTRACT_ADDRESS } from "@src/services/madfi/moneyClubs";

interface BuyUSDCModalProps {
  chain: string; // base | lens
  buyAmount: string;
  closeModal: () => void;
}

const BuyUSDCModal = ({ chain, buyAmount, closeModal }: BuyUSDCModalProps) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [activeWallet, setActiveWallet] = useState<Wallet | undefined>();

  const amount = buyAmount || "100";

  useEffect(() => {
    const connectThirdweb = async () => {
      const _client = await thirdwebWallet(walletClient);
      await _client.connect({ client });
      setActiveWallet(_client);
    }

    // to avoid 429s
    defineChain({ id: 1, rpc: process.env.NEXT_PUBLIC_MAINNET_RPC });
    defineChain({ id: 8453, rpc: process.env.NEXT_PUBLIC_BASE_RPC });
    defineChain({ id: 130, rpc: process.env.NEXT_PUBLIC_UNICHAIN_RPC })

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
        mode: "direct_payment",
        metadata: { name: chain === "lens" ? "Get GHO on Lens Chain" : "Get USDC on Base" },
        buyWithFiat: {
          preferredProvider: "COINBASE",
          testMode: false,
        },
        buyWithCrypto: {
          testMode: false,
        },
        paymentInfo: {
          chain: chain === "lens" ? thirdwebLens : thirdwebBase,
          amount,
          sellerAddress: address as `0x${string}`, // using the EOA until lens account is easier
          token: chain === "lens" ? {
            address: NATIVE_TOKEN_ADDRESS,
            name: "GHO",
            symbol: "GHO",
            icon: "https://explorer.lens.xyz/images/gho.png",
          } : {
            address: USDC_CONTRACT_ADDRESS,
            name: "USDC",
            symbol: "USDC",
            icon: "/usdc.png",
          },
        },
        onPurchaseSuccess: (purchase) => {
          toast.success(`Received ${amount} ${chain === "lens" ? "GHO" : "USDC"}`, { duration: 10000 });
          closeModal();
        },
      }}
      supportedTokens={{
        232: [],
        10: [],
        100: [],
        1: [
          {
            address: NATIVE_TOKEN_ADDRESS,
            name: "ETH",
            symbol: "ETH",
          }
        ],
        8453: [
          {
            address: NATIVE_TOKEN_ADDRESS,
            name: "Base ETH",
            symbol: "ETH",
          }
        ],
        130: [
          {
            address: NATIVE_TOKEN_ADDRESS,
            name: "Unichain ETH",
            symbol: "ETH",
          }
        ]
      }}
    />
  );
}

export default BuyUSDCModal;