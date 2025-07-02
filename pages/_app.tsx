import "./../polyfills.js";
import { AppProps } from "next/app";
import "@decent.xyz/the-box/index.css";
import "@styles/globals.css";
import "@styles/calendar-override.css";
import { Analytics } from "@vercel/analytics/react";
import NextNProgress from "nextjs-progressbar";
import { ToastBar, Toaster } from "react-hot-toast";
import { BoxThemeProvider } from "@decent.xyz/the-box";
import { ThirdwebProvider } from "thirdweb/react";

import { Layout } from "@src/components/Layouts/Layout";
import HandleSEO from "@src/components/Layouts/HandleSEO";
import { ThemeProvider } from "@src/context/ThemeContext";
import { ClubsProvider } from "@src/context/ClubsContext";
import { brandFont } from "@src/fonts/fonts";
import { useState, useEffect } from "react";
import { sdk } from "@farcaster/frame-sdk";
import { useRouter } from "next/router.js";
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
  const { isMiniApp } = useIsMiniApp();

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
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // Service worker registration and debugging
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      console.log('[PWA] Starting service worker setup...');
      
      // Log current state
      console.log('[PWA] Current controller:', navigator.serviceWorker.controller);
      console.log('[PWA] Ready state:', navigator.serviceWorker.ready);
      
      // Check for existing registrations first
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log('[PWA] Existing registrations:', registrations.length);
        
        if (registrations.length === 0) {
          // No service worker registered - register manually since next-pwa isn't doing it
          console.log('[PWA] No service worker found, registering manually...');
          navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then((registration) => {
              console.log('[PWA] Service worker registered successfully:', registration);
              
              // Track state changes
              const trackWorker = (worker: ServiceWorker | null, type: string) => {
                if (worker) {
                  console.log(`[PWA] ${type} worker state:`, worker.state);
                  worker.addEventListener('statechange', () => {
                    console.log(`[PWA] ${type} worker state changed to:`, worker.state);
                  });
                }
              };
              
              trackWorker(registration.installing, 'Installing');
              trackWorker(registration.waiting, 'Waiting');  
              trackWorker(registration.active, 'Active');
            })
            .catch((error) => {
              console.error('[PWA] Service worker registration failed:', error);
            });
        } else {
          console.log('[PWA] Service worker already registered');
          registrations.forEach((reg, index) => {
            console.log(`[PWA] Registration ${index}:`, reg.scope, reg.active?.state);
          });
        }
      });
      
      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed:', navigator.serviceWorker.controller);
      });
      
      // Listen for messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Message from service worker:', event.data);
      });
      
      // Check when service worker becomes ready
      navigator.serviceWorker.ready
        .then((registration) => {
          console.log('[PWA] Service worker ready:', registration);
          console.log('[PWA] Ready controller:', navigator.serviceWorker.controller);
          console.log('[PWA] Registration scope:', registration.scope);
          console.log('[PWA] Active worker state:', registration.active?.state);
        })
        .catch((error) => {
          console.error('[PWA] Service worker ready failed:', error);
        });
    } else {
      console.log('[PWA] Service workers not supported');
    }
  }, []);

  return (
    (!isMiniApp || (isMiniApp && isSDKLoaded)) && (
      <>
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
      </>
    )
  );
}
