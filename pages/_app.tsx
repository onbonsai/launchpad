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
import Script from "next/script";

import { Layout } from "@src/components/Layouts/Layout";
import HandleSEO from "@src/components/Layouts/HandleSEO";
import { ThemeProvider } from "@src/context/ThemeContext";
import { ClubsProvider } from "@src/context/ClubsContext";
import { brandFont, openSans, sourceCodePro } from "@src/fonts/fonts";
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

  // PWA Service Worker Debugging for Vercel Issues
  useEffect(() => {
    console.log('🔍 [PWA DEBUG] Environment Analysis:');
    console.log('- Environment:', process.env.NODE_ENV);
    console.log('- URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
    console.log('- HTTPS:', typeof window !== 'undefined' ? window.location.protocol === 'https:' : 'SSR');
    console.log('- VAPID Key:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? '✅ SET' : '❌ MISSING');
    
    if (typeof window === 'undefined') return; // Skip SSR
    
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.error('❌ [PWA DEBUG] Service Worker not supported');
      return;
    }
    
    console.log('✅ [PWA DEBUG] Service Worker API supported');
    
    // Check if sw.js exists
    fetch('/sw.js', { method: 'HEAD' })
      .then(response => {
        console.log(`🔍 [PWA DEBUG] /sw.js status: ${response.status}`);
        if (response.status === 200) {
          console.log('✅ [PWA DEBUG] Service worker file found');
          
          // Check existing registrations
          navigator.serviceWorker.getRegistrations()
            .then(registrations => {
              console.log(`🔍 [PWA DEBUG] Existing registrations: ${registrations.length}`);
              
              if (registrations.length === 0) {
                console.log('⚠️ [PWA DEBUG] No service worker registered - next-pwa auto-registration may have failed');
                console.log('🔧 [PWA DEBUG] Attempting manual registration...');
                
                // Manual registration as fallback
                navigator.serviceWorker.register('/sw.js')
                  .then(registration => {
                    console.log('✅ [PWA DEBUG] Manual registration successful:', registration);
                  })
                  .catch(error => {
                    console.error('❌ [PWA DEBUG] Manual registration failed:', error);
                  });
              } else {
                registrations.forEach((reg, i) => {
                  console.log(`✅ [PWA DEBUG] Registration ${i}:`, reg.scope, reg.active?.state);
                });
              }
            })
            .catch(error => {
              console.error('❌ [PWA DEBUG] Error checking registrations:', error);
            });
        } else {
          console.error('❌ [PWA DEBUG] Service worker file missing - next-pwa build failed');
          console.error('❌ [PWA DEBUG] This is why push notifications are not working on Vercel');
        }
      })
      .catch(error => {
        console.error('❌ [PWA DEBUG] Error checking /sw.js:', error);
      });
      
    // Monitor service worker events
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 [PWA DEBUG] Service worker controller changed');
    });
    
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('📨 [PWA DEBUG] Message from service worker:', event.data);
    });
    
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
      </>
    )
  );
}
