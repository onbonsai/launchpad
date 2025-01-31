import Head from "next/head";
import "./../polyfills.js";
import { AppProps } from "next/app";
import "@decent.xyz/the-box/index.css";
import "@styles/globals.css";
import "@styles/calendar-override.css";
import { HotkeysProvider } from "react-hotkeys-hook";
import { Analytics } from "@vercel/analytics/react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { keepPreviousData, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base, baseSepolia, polygon } from "viem/chains";
import NextNProgress from "nextjs-progressbar";
import { ToastBar, Toaster } from "react-hot-toast";
import { BoxThemeProvider } from "@decent.xyz/the-box";

import { Layout } from "@src/components/Layouts/Layout";
import HandleSEO from "@src/components/Layouts/HandleSEO";
import { ThemeProvider } from "@src/context/ThemeContext";
import { configureChainsConfig } from "@utils/wagmi";
import { ClubsProvider } from "@src/context/ClubsContext";
import { inter } from "@src/fonts/fonts";
import { useState, useEffect } from "react";
import sdk from "@src/utils/farcaster.mjs"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      placeholderData: keepPreviousData,
    },
  },
});

const boxTheme = {
  mainBgColor: '#141414',
  mainTextColor: '#ffffff',
  tokenSwapCardBgColor: '#1B1B1B',
  buyBtnBgColor: '#e42101',
  buyBtnTextColor: '#ffffff',
  switchBtnBgColor: '#3A3842',
  tokenDialogHoverColor: '#444444',
  boxSubtleColor1: '#999999',
  borderColor: 'transparent',
  borderRadius: '0',
  loadShineColor1: "#121212",
  loadShineColor2: "#333333",
}

export default function MyApp(props: AppProps) {
  const { Component, pageProps } = props;

  if (typeof window !== "undefined") {
    window.addEventListener(
      "resize",
      function () {
        document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
      },
      false,
    );
  }

  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      // onSuccess={handleLogin}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#eb4d30",
          walletList: ["detected_wallets", "rainbow", "coinbase_wallet", "wallet_connect" /*'farcaster'*/],
        },
        defaultChain: base,
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          noPromptOnSignature: true,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={configureChainsConfig}>
          <HandleSEO pageProps={pageProps} />
          <ThemeProvider>
            <ClubsProvider>
              <Head>
                <meta name="viewport" content="initial-scale=1, width=device-width" />
              </Head>
              <HotkeysProvider>
                <Toaster
                  position="bottom-right"
                  toastOptions={{
                    style: {
                      backgroundColor: "#1A1B1F", // rainbowTheme.colors.modalBackground,
                      color: "white",
                      fontFamily: inter.style.fontFamily,
                      zIndex: 1001,
                    },
                  }}
                >
                  {(t) => (
                    <ToastBar toast={t}>
                      {({ icon, message }) => (
                        <>
                          {icon}
                          {message}
                        </>
                      )}
                    </ToastBar>
                  )}
                </Toaster>
                <NextNProgress color={"#7B0100"} height={2} />
                <Layout>
                  <BoxThemeProvider theme={boxTheme}>
                    <Component {...pageProps} />
                  </BoxThemeProvider>
                </Layout>
                <Analytics />
              </HotkeysProvider>
            </ClubsProvider>
          </ThemeProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
