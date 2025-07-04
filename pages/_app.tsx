import "./../polyfills.js";
import { AppProps } from "next/app";
import "@styles/globals.css";
import { Analytics } from "@vercel/analytics/react";
import NextNProgress from "nextjs-progressbar";
import { ToastBar, Toaster } from "react-hot-toast";
import { BoxThemeProvider } from "@decent.xyz/the-box";
import { ThirdwebProvider } from "thirdweb/react";
import Script from "next/script";
import { useState, useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useRouter } from "next/router.js";
// Removed ViewTransitions import

import { Layout } from "@src/components/Layouts/Layout";
import HandleSEO from "@src/components/Layouts/HandleSEO";
import { ThemeProvider } from "@src/context/ThemeContext";
import { ClubsProvider } from "@src/context/ClubsContext";
import { brandFont, openSans, sourceCodePro } from "@src/fonts/fonts";
import { Web3Provider } from "@src/components/Web3Provider/Web3Provider";
import { TopUpModalProvider } from "@src/context/TopUpContext";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";

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
  const { isMiniApp, context } = useIsMiniApp();

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
      await sdk.actions.ready(); // hide splash

      // Prompt to add mini app when ?install
      if (!!router.query.install) {
        if (!context?.client.added) {
          try {
            await sdk.actions.addMiniApp();
          } catch (error) {
            console.log(error);
          }
        }
      }
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // Load non-critical CSS after initial render
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Defer loading of non-critical CSS
    const loadNonCriticalCSS = () => {
      // Load calendar override CSS only when needed
      const calendarCSS = document.createElement('link');
      calendarCSS.rel = 'stylesheet';
      calendarCSS.href = '/styles/calendar-override.css';
      calendarCSS.media = 'print';
      calendarCSS.onload = function() {
        (this as HTMLLinkElement).media = 'all';
      };
      document.head.appendChild(calendarCSS);

      // Load The Box CSS asynchronously
      const boxCSS = document.createElement('link');
      boxCSS.rel = 'stylesheet';
      boxCSS.href = '/node_modules/@decent.xyz/the-box/dist/index.css';
      boxCSS.media = 'print';
      boxCSS.onload = function() {
        (this as HTMLLinkElement).media = 'all';
      };
      document.head.appendChild(boxCSS);
    };

    // Load after initial paint using requestIdleCallback or fallback
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadNonCriticalCSS, { timeout: 1000 });
    } else {
      setTimeout(loadNonCriticalCSS, 100);
    }
  }, []);

  // bfcache optimization - ensure page can be cached
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePageHide = (event: PageTransitionEvent) => {
      console.log('🗄️ [BFCACHE] Page hiding - preparing for bfcache');

      // Don't prevent bfcache if user is navigating away
      // The individual socket hooks will handle their own cleanup
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('🗄️ [BFCACHE] Page restored from bfcache');
        // Individual socket hooks will handle reconnection
      }
    };

    // Add freeze event for additional bfcache support
    const handleFreeze = () => {
      console.log('🧊 [BFCACHE] Page frozen');
    };

    const handleResume = () => {
      console.log('▶️ [BFCACHE] Page resumed');
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('freeze', handleFreeze);
    window.addEventListener('resume', handleResume);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('freeze', handleFreeze);
      window.removeEventListener('resume', handleResume);
    };
  }, []);

  return (
    (!isMiniApp || (isMiniApp && isSDKLoaded)) && (
      <>
        <style jsx global>{`
          :root {
            --font-brand: ${brandFont.style.fontFamily};
            --font-open-sans: ${openSans.style.fontFamily};
            --font-source-code-pro: ${sourceCodePro.style.fontFamily};
          }
        `}</style>

        {/* Non-blocking TypeKit loading */}
        <link
          rel="stylesheet"
          href="https://p.typekit.net/p.css?s=1&k=lwh2pue&ht=tk&f=48418.48432&a=15201506&app=typekit&e=css"
          media="print"
          onLoad={(e) => {
            const target = e.target as HTMLLinkElement;
            target.media = 'all';
          }}
        />

        {/* Non-blocking Material Icons loading */}
        <Script id="material-icons-loader" strategy="afterInteractive">
          {`
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
            link.media = 'print';
            link.onload = function() { this.media = 'all'; };
            document.head.appendChild(link);
          `}
        </Script>

        <HandleSEO pageProps={pageProps} query={router.query} />
        <Web3Provider>
            <ThirdwebProvider>
              <ThemeProvider>
                <ClubsProvider>
                  <TopUpModalProvider>
                    <Toaster
                      position="bottom-right"
                      toastOptions={{
                        style: {
                          backgroundColor: "#1A1B1F", // rainbowTheme.colors.modalBackground,
                          color: "white",
                          fontFamily: brandFont.style.fontFamily,
                          zIndex: 9999, // max z-index, everything should be below this
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
                  </TopUpModalProvider>
                </ClubsProvider>
              </ThemeProvider>
            </ThirdwebProvider>
          </Web3Provider>
                          {/* Removed ViewTransitions closing tag */}
      </>
    )
  );
}
