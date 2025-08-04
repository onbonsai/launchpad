import "./../polyfills.js";
import { AppProps } from "next/app";
import "@styles/globals.css";
import { Analytics } from "@vercel/analytics/react";
import NextNProgress from "nextjs-progressbar";
import { ToastBar, Toaster } from "react-hot-toast";
import { ThirdwebProvider } from "thirdweb/react";
import Script from "next/script";
import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useRouter } from "next/router.js";
import { MiniKitProvider, useMiniKit, useAddFrame } from '@coinbase/onchainkit/minikit';

import { Layout } from "@src/components/Layouts/Layout";
import HandleSEO from "@src/components/Layouts/HandleSEO";
import { ThemeProvider } from "@src/context/ThemeContext";
import { ClubsProvider } from "@src/context/ClubsContext";
import { brandFont, openSans, sourceCodePro } from "@src/fonts/fonts";
import { Web3Provider } from "@src/components/Web3Provider/Web3Provider";
import { TopUpModalProvider } from "@src/context/TopUpContext";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { base } from "viem/chains";
import { ErrorBoundary } from "@src/components/ErrorBoundary";
import { IS_PRODUCTION } from "@src/services/madfi/utils";

// Simplified wrapper that always renders and handles mini app as enhancement
function CoinbaseMiniAppWrapper({ children }: { children: React.ReactNode }) {
  const { isCoinbaseMiniApp, context } = useIsMiniApp();
  const { setFrameReady } = useMiniKit();
  const addFrame = useAddFrame();
  const router = useRouter();



  // Handle setFrameReady as a side effect, not a render blocker
  useEffect(() => {
    if (isCoinbaseMiniApp) {
      try {
        setFrameReady();
      } catch (error) {
        console.error('🚨 [CoinbaseMiniAppWrapper] Error calling setFrameReady():', error);
        // Don't crash the app, just log the error
      }
    }
  }, [isCoinbaseMiniApp, setFrameReady]);

  // Handle installation flow as a side effect
  useEffect(() => {
    const handleInstall = async () => {
      if (isCoinbaseMiniApp && !!router.query.install && context && !context.client.added) {
        try {
          await addFrame();
        } catch (error) {
          console.error('🚨 [CoinbaseMiniAppWrapper] Error calling addFrame():', error);
          // Don't crash the app, just log the error
        }
      }
    };

    handleInstall();
  }, [isCoinbaseMiniApp, router.query.install, context?.client.added, addFrame, context]);

  // Always render - no more black screens!
  return <>{children}</>;
}

function AppContent(props: AppProps) {
  const { Component, pageProps } = props;
  const { isMiniApp, isFarcasterMiniApp, isCoinbaseMiniApp, context, isLoading: isMiniAppLoading } = useIsMiniApp();

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

  // Auto-detection for AppContent issues
  const [sdkLoadStartTime, setSdkLoadStartTime] = useState<number | null>(null);
  const [appContentRenderCount, setAppContentRenderCount] = useState(0);

  // Track renders for this component
  useEffect(() => {
    setAppContentRenderCount(prev => prev + 1);
  }, [isMiniApp, isFarcasterMiniApp, isCoinbaseMiniApp, isSDKLoaded, isMiniAppLoading]);

  // Track SDK loading time for Farcaster
  useEffect(() => {
    if (isFarcasterMiniApp && !isSDKLoaded) {
      if (!sdkLoadStartTime) {
        setSdkLoadStartTime(Date.now());
      }
    } else if (isFarcasterMiniApp && isSDKLoaded && sdkLoadStartTime) {
      setSdkLoadStartTime(null);
    }
  }, [isFarcasterMiniApp, isSDKLoaded, sdkLoadStartTime, context, isMiniAppLoading]);

  // Reset SDK loaded state when mini app type changes
  useEffect(() => {
    setIsSDKLoaded(false);
  }, [isFarcasterMiniApp, isMiniApp]);

  useEffect(() => {
    const load = async () => {
      // Only run Farcaster SDK logic if it's a Farcaster mini app
      if (isFarcasterMiniApp) {
        try {
          await sdk.actions.ready(); // hide splash

          // Prompt to add mini app when ?install
          if (!!router.query.install) {
            if (!context?.client.added) {
              try {
                await sdk.actions.addMiniApp();
              } catch (error) {
                console.error('🚨 [AppContent] Error calling addMiniApp():', error);
              }
            }
          }

          // Only set loaded to true after sdk.actions.ready() completes
          setIsSDKLoaded(true);
        } catch (error) {
          console.error(error);
        }
      }
    };

    if (isFarcasterMiniApp && !isSDKLoaded) {
      load();
    } else if (!isMiniApp && !isSDKLoaded) {
      // Handle regular web app (not a mini app)
      setIsSDKLoaded(true);
    }
  }, [isFarcasterMiniApp, isMiniApp, isSDKLoaded, router.query.install, context?.client.added]);

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
    };

    // Load after initial paint using requestIdleCallback or fallback
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadNonCriticalCSS, { timeout: 1000 });
    } else {
      setTimeout(loadNonCriticalCSS, 100);
    }
  }, []);

  // Always render - no more complex shouldRender logic

  // Simple bfcache support
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let visibilityChangeCount = 0;
    let lastVisibilityState = document.visibilityState;

    const handleVisibilityChange = () => {
      const currentState = document.visibilityState;
      visibilityChangeCount++;
      lastVisibilityState = currentState;
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      // Don't prevent bfcache if user is navigating away
      // The individual socket hooks will handle their own cleanup
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Individual socket hooks will handle reconnection
      }
    };

    // Add freeze event for additional bfcache support
    const handleFreeze = () => {
      // Page frozen
    };

    const handleResume = () => {
      // Page resumed
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('freeze', handleFreeze);
    window.addEventListener('resume', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('freeze', handleFreeze);
      window.removeEventListener('resume', handleResume);
    };
    }, []);

  return (
      <>
        <HandleSEO pageProps={pageProps} query={router.query} />

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

        {isMiniApp && <link rel="preconnect" href="https://auth.farcaster.xyz" />}

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
                    <Component {...pageProps} />
                  </AppLayout>
                  <Analytics />
                </TopUpModalProvider>
              </ClubsProvider>
            </ThemeProvider>
          </ThirdwebProvider>
        </Web3Provider>
      </>
    );
}

export default function MyApp(props: AppProps) {
  return (
    <ErrorBoundary componentName="MyApp-Root">
      <MiniKitProvider
        apiKey={process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY}
        chain={base}
      >
        <ErrorBoundary componentName="CoinbaseMiniAppWrapper">
          <CoinbaseMiniAppWrapper>
            <ErrorBoundary componentName="AppContent">
              <AppContent {...props} />
            </ErrorBoundary>
          </CoinbaseMiniAppWrapper>
        </ErrorBoundary>
      </MiniKitProvider>
    </ErrorBoundary>
  );
}
