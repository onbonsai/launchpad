import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@src/utils/wagmi";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

export default function Provider({ children }: { children: React.ReactNode }) {
  const [wagmiConfig, setWagmiConfig] = useState<ReturnType<typeof config> | null>(null);

  useEffect(() => {
    const initConfig = async () => {
      const configInstance = await config();
      setWagmiConfig(configInstance);
    };
    initConfig();
  }, []);

  if (!wagmiConfig) {
    return null; // or a loading spinner
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}