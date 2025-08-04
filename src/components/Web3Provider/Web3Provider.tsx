import dynamic from "next/dynamic";
import { ConnectKitProvider } from "connectkit";

const WagmiProvider = dynamic(
  () => import("@src/components/Web3Provider/WagmiProvider"),
  {
    ssr: false,
  }
);

export const Web3Provider = ({ children }) => {
  return (
    <WagmiProvider>
      <ConnectKitProvider>{children}</ConnectKitProvider>
    </WagmiProvider>
  );
};