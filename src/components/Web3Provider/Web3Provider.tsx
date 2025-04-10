import dynamic from "next/dynamic";
import { ConnectKitProvider, SIWESession } from "connectkit";
import { siweClient } from "@src/utils/siwe";

const WagmiProvider = dynamic(
  () => import("@src/components/Web3Provider/WagmiProvider"),
  {
    ssr: false,
  }
);

export const Web3Provider = ({ children }) => {
  return (
    <WagmiProvider>
      <siweClient.Provider
        enabled={false}
        nonceRefetchInterval={300000} // in milliseconds, defaults to 5 minutes
        sessionRefetchInterval={300000}// in milliseconds, defaults to 5 minutes
        signOutOnDisconnect
        signOutOnAccountChange
        signOutOnNetworkChange={false}
      >
        <ConnectKitProvider options={{ disableSiweRedirect: true }}>{children}</ConnectKitProvider>
      </siweClient.Provider>
    </WagmiProvider>
  );
};