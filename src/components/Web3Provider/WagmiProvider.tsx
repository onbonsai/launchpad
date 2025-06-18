import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@src/utils/wagmi";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";

const queryClient = new QueryClient();

export default function Provider({ children }: { children: React.ReactNode }) {
  const { isMiniApp } = useIsMiniApp();

  return (
    <WagmiProvider config={config(isMiniApp)}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}