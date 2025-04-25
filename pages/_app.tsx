import "./../polyfills.js";
import { AppProps } from "next/app";
import "@decent.xyz/the-box/index.css";
import "@styles/globals.css";
import "@styles/calendar-override.css";
import { HotkeysProvider } from "react-hotkeys-hook";
import { Analytics } from "@vercel/analytics/react";
import { keepPreviousData, QueryClient } from "@tanstack/react-query";
import NextNProgress from "nextjs-progressbar";
import { ToastBar, Toaster } from "react-hot-toast";
import { BoxThemeProvider } from "@decent.xyz/the-box";
import { ThirdwebProvider } from "thirdweb/react";

import { Layout } from "@src/components/Layouts/Layout";
import HandleSEO from "@src/components/Layouts/HandleSEO";
import { ThemeProvider } from "@src/context/ThemeContext";
import { ClubsProvider } from "@src/context/ClubsContext";
import { TopUpModalProvider } from "@src/contexts/TopUpModalContext";
import { brandFont } from "@src/fonts/fonts";
import { useState, useEffect } from "react";
import sdk from "@src/utils/farcaster.mjs";
import { useRouter } from "next/router.js";
import { Web3Provider } from "@src/components/Web3Provider/Web3Provider";

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
  mainBgColor: "#141414",
  mainTextColor: "#ffffff",
  tokenSwapCardBgColor: "#1B1B1B",
  buyBtnBgColor: "#e42101",
  buyBtnTextColor: "#ffffff",
  switchBtnBgColor: "#3A3842",
  tokenDialogHoverColor: "#444444",
  boxSubtleColor1: "#999999",
  borderColor: "transparent",
  borderRadius: "0",
  loadShineColor1: "#121212",
  loadShineColor2: "#333333",
};

export default function MyApp(props: AppProps) {
  const { Component, pageProps } = props;

  const router = useRouter();

  const isPostRoute = router.pathname.startsWith("/post");

  const AppLayout = isPostRoute ? Layout : Layout;

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
    <>
      <HandleSEO pageProps={pageProps} />
      <Web3Provider>
        <ThirdwebProvider>
          <ThemeProvider>
            <ClubsProvider>
              <TopUpModalProvider>
                <HotkeysProvider>
                  <Toaster
                    position="bottom-right"
                    toastOptions={{
                      style: {
                        backgroundColor: "#1A1B1F", // rainbowTheme.colors.modalBackground,
                        color: "white",
                        fontFamily: brandFont.style.fontFamily,
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
                  <NextNProgress color="#4D7F79" height={2} />
                  <AppLayout>
                    <BoxThemeProvider theme={boxTheme}>
                      <Component {...pageProps} />
                    </BoxThemeProvider>
                  </AppLayout>
                  <Analytics />
                </HotkeysProvider>
              </TopUpModalProvider>
            </ClubsProvider>
          </ThemeProvider>
        </ThirdwebProvider>
      </Web3Provider>
    </>
  );
}
