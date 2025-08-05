import { ConnectKitProvider } from "connectkit";
import WagmiProvider from "@src/components/Web3Provider/WagmiProvider";

export const Web3Provider = ({ children }) => {
  return (
    <WagmiProvider>
      <ConnectKitProvider>{children}</ConnectKitProvider>
    </WagmiProvider>
  );
};