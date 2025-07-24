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
// @ts-expect-error moduleResolution: nodenext
import { MiniKitProvider, useMiniKit, useAddFrame } from '@coinbase/onchainkit/minikit';
import * as Sentry from "@sentry/nextjs";

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

// Wrapper component that handles Coinbase mini app flow exclusively
function CoinbaseMiniAppWrapper({ children }: { children: React.ReactNode }) {
  const { isCoinbaseMiniApp, context, isLoading: isMiniAppLoading } = useIsMiniApp();
  const { isFrameReady, setFrameReady } = useMiniKit();
  const addFrame = useAddFrame();
  const router = useRouter();

  // Auto-detection timers and state
  const [waitingStartTime, setWaitingStartTime] = useState<number | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [lastRenderState, setLastRenderState] = useState('');
  const [hasTriggeredDebug, setHasTriggeredDebug] = useState(false);
  const [forceRender, setForceRender] = useState(false);
  const [hasRenderedContent, setHasRenderedContent] = useState(false);
  const [lastIsCoinbaseMiniApp, setLastIsCoinbaseMiniApp] = useState<boolean | null>(null);

  // Simple timeout to prevent infinite waiting
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasRenderedContent) {
        console.log('🚨 [CoinbaseMiniAppWrapper] 2-second timeout - forcing render to prevent stuck state');
        setForceRender(true);
        setHasRenderedContent(true);

        if (!hasTriggeredDebug) {
          setHasTriggeredDebug(true);
          captureDebugException('timeout-forced-render-after-2s', {
            isCoinbaseMiniApp,
            isFrameReady,
            isMiniAppLoading,
            hasRenderedContent,
            waitingTime: 2000
          });
        }
      }
    }, 2000); // 2 second timeout

    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  // Track render state changes for flicker detection
  const currentRenderState = `${isCoinbaseMiniApp}-${isFrameReady}-${isMiniAppLoading}-${forceRender}-${hasRenderedContent}`;

  useEffect(() => {
    setRenderCount(prev => prev + 1);

    // Detect rapid state changes (potential flicker)
    if (lastRenderState !== currentRenderState) {
      setLastRenderState(currentRenderState);

      // If we've had many renders in a short time, capture debug info
      if (renderCount > 10 && !hasTriggeredDebug) {
        setHasTriggeredDebug(true);
        captureDebugException('rapid-render-state-changes', {
          renderCount,
          currentState: currentRenderState,
          lastState: lastRenderState,
          isCoinbaseMiniApp,
          isFrameReady,
          isMiniAppLoading,
          forceRender,
          hasRenderedContent,
          waitingTime: waitingStartTime ? Date.now() - waitingStartTime : null
        });
      }
    }
  }, [currentRenderState, lastRenderState, renderCount, hasTriggeredDebug, isCoinbaseMiniApp, isFrameReady, isMiniAppLoading, forceRender, hasRenderedContent]);

  // Detect transition from "not mini app" to "mini app detected" (critical race condition point)
  useEffect(() => {
    if (lastIsCoinbaseMiniApp !== null && lastIsCoinbaseMiniApp === false && isCoinbaseMiniApp === true) {
      console.log('🚨 [CoinbaseMiniAppWrapper] CRITICAL TRANSITION: Detected change from regular app to Coinbase mini app');

      Sentry.addBreadcrumb({
        message: 'CoinbaseMiniAppWrapper critical transition detected',
        category: 'miniapp',
        level: 'warning',
        data: {
          lastIsCoinbaseMiniApp,
          currentIsCoinbaseMiniApp: isCoinbaseMiniApp,
          isFrameReady,
          hasRenderedContent,
          willReturnNull: !isFrameReady && !forceRender && !hasRenderedContent,
          timestamp: Date.now()
        }
      });

      // If this transition would cause us to return null and create black screen, capture debug
      if (!isFrameReady && !forceRender && !hasRenderedContent && !hasTriggeredDebug) {
        setHasTriggeredDebug(true);
        captureDebugException('critical-transition-would-cause-black-screen', {
          lastIsCoinbaseMiniApp,
          currentIsCoinbaseMiniApp: isCoinbaseMiniApp,
          isFrameReady,
          forceRender,
          hasRenderedContent,
          contextExists: !!context,
          transition: 'regular-app-to-coinbase-miniapp'
        });
      }
    }

    setLastIsCoinbaseMiniApp(isCoinbaseMiniApp);
  }, [isCoinbaseMiniApp, lastIsCoinbaseMiniApp, isFrameReady, forceRender, hasRenderedContent, hasTriggeredDebug, context]);

  // Track how long we're waiting for frame to be ready
  useEffect(() => {
    if (isCoinbaseMiniApp && !isFrameReady) {
      if (!waitingStartTime) {
        setWaitingStartTime(Date.now());
        console.log('🔍 [CoinbaseMiniAppWrapper] Started waiting for frame ready at:', new Date().toISOString());
      }

      // Check if we've been waiting too long (more than 3 seconds)
      if (waitingStartTime && (Date.now() - waitingStartTime) > 3000) {
        if (!hasTriggeredDebug) {
          setHasTriggeredDebug(true);
          captureDebugException('coinbase-frame-ready-timeout-forcing-render', {
            waitingTime: Date.now() - waitingStartTime,
            isCoinbaseMiniApp,
            isFrameReady,
            isMiniAppLoading,
            forceRender,
            hasRenderedContent,
            contextExists: !!context,
            installQuery: !!router.query.install
          });
        }

        // Force render after timeout to prevent infinite black screen
        if (!forceRender) {
          console.log('🚨 [CoinbaseMiniAppWrapper] Timeout reached, forcing render to prevent black screen');
          setForceRender(true);
        }
      }
    } else if (isCoinbaseMiniApp && isFrameReady && waitingStartTime) {
      const waitTime = Date.now() - waitingStartTime;
      console.log(`🔍 [CoinbaseMiniAppWrapper] Frame became ready after ${waitTime}ms`);
      setWaitingStartTime(null);
      // Clear force render since frame is now ready
      if (forceRender) {
        console.log('🔍 [CoinbaseMiniAppWrapper] Clearing forceRender since frame is now ready');
        setForceRender(false);
      }
    }
  }, [isCoinbaseMiniApp, isFrameReady, waitingStartTime, hasTriggeredDebug, context, router.query.install, isMiniAppLoading, forceRender, hasRenderedContent]);

  console.log('🔍 [CoinbaseMiniAppWrapper] Render with state:', {
    isCoinbaseMiniApp,
    isFrameReady,
    isMiniAppLoading,
    forceRender,
    hasRenderedContent,
    contextExists: !!context,
    contextClientAdded: context?.client.added,
    installQuery: !!router.query.install,
    waitingTime: waitingStartTime ? Date.now() - waitingStartTime : null
  });

  Sentry.addBreadcrumb({
    message: 'CoinbaseMiniAppWrapper render',
    category: 'miniapp',
    level: 'info',
    data: {
      isCoinbaseMiniApp,
      isFrameReady,
      isMiniAppLoading,
      forceRender,
      hasRenderedContent,
      contextExists: !!context,
      contextClientAdded: context?.client.added,
      installQuery: !!router.query.install,
      waitingTime: waitingStartTime ? Date.now() - waitingStartTime : null,
      timestamp: Date.now()
    }
  });

      // Separate effect to call setFrameReady when we detect Coinbase mini app (with small delay for stability)
  useEffect(() => {
    if (isCoinbaseMiniApp && !isFrameReady) {
      console.log('🔍 [CoinbaseMiniAppWrapper] Detected Coinbase mini app, will call setFrameReady() after brief delay');

      // Small delay to ensure Coinbase SDK is fully initialized
      const timer = setTimeout(() => {
        console.log('🔍 [CoinbaseMiniAppWrapper] Calling setFrameReady() after delay');

        Sentry.addBreadcrumb({
          message: 'CoinbaseMiniAppWrapper calling setFrameReady after delay',
          category: 'miniapp',
          level: 'info',
          data: {
            isCoinbaseMiniApp,
            isFrameReady,
            timestamp: Date.now()
          }
        });

        try {
          setFrameReady();
          console.log('🔍 [CoinbaseMiniAppWrapper] setFrameReady() called successfully');

          Sentry.addBreadcrumb({
            message: 'CoinbaseMiniAppWrapper setFrameReady success',
            category: 'miniapp',
            level: 'info',
            data: { timestamp: Date.now() }
          });
        } catch (error) {
          console.error('🚨 [CoinbaseMiniAppWrapper] Error calling setFrameReady():', error);

          if (!hasTriggeredDebug) {
            setHasTriggeredDebug(true);
            captureDebugException('setFrameReady-call-failed', {
              error: error?.toString(),
              isCoinbaseMiniApp,
              isFrameReady,
              contextExists: !!context
            });
          }

          Sentry.captureException(error, {
            tags: { component: 'CoinbaseMiniAppWrapper', action: 'setFrameReady' }
          });
        }
      }, 50); // 50ms delay for SDK stability

      return () => clearTimeout(timer);
    }
  }, [isCoinbaseMiniApp, isFrameReady, setFrameReady, hasTriggeredDebug, context]);

  // Separate effect for handling installation flow
  useEffect(() => {
    const handleInstallFlow = async () => {
      if (isCoinbaseMiniApp && !!router.query.install && context && !context.client.added) {
        console.log('🔍 [CoinbaseMiniAppWrapper] Handling install flow');

        Sentry.addBreadcrumb({
          message: 'CoinbaseMiniAppWrapper handling install flow',
          category: 'miniapp',
          level: 'info',
          data: {
            contextClientAdded: context.client.added,
            timestamp: Date.now()
          }
        });

        try {
          console.log('🔍 [CoinbaseMiniAppWrapper] Calling addFrame() for install');

          Sentry.addBreadcrumb({
            message: 'CoinbaseMiniAppWrapper calling addFrame',
            category: 'miniapp',
            level: 'info',
            data: { timestamp: Date.now() }
          });

          await addFrame();

          console.log('🔍 [CoinbaseMiniAppWrapper] addFrame() completed successfully');

          Sentry.addBreadcrumb({
            message: 'CoinbaseMiniAppWrapper addFrame completed',
            category: 'miniapp',
            level: 'info',
            data: { timestamp: Date.now() }
          });
        } catch (error) {
          console.error('🚨 [CoinbaseMiniAppWrapper] Error calling addFrame():', error);

          Sentry.addBreadcrumb({
            message: 'CoinbaseMiniAppWrapper addFrame error',
            category: 'miniapp',
            level: 'error',
            data: {
              error: error?.toString(),
              timestamp: Date.now()
            }
          });

          Sentry.captureException(error, {
            tags: { component: 'CoinbaseMiniAppWrapper', action: 'addFrame' }
          });
        }
      }
    };

    handleInstallFlow();
  }, [isCoinbaseMiniApp, router.query.install, context?.client.added, addFrame]);

  // Simple render decision: Only return null if it's a Coinbase mini app, not ready, not forced, and we haven't rendered content yet
  const shouldReturnNull = isCoinbaseMiniApp && !isFrameReady && !forceRender && !hasRenderedContent;

  if (shouldReturnNull) {
    console.log('🔍 [CoinbaseMiniAppWrapper] Returning null - waiting for Coinbase mini app to be ready');

    Sentry.addBreadcrumb({
      message: 'CoinbaseMiniAppWrapper returning null - waiting for ready',
      category: 'miniapp',
      level: 'info',
      data: {
        isCoinbaseMiniApp,
        isFrameReady,
        forceRender,
        hasRenderedContent,
        shouldReturnNull,
        timestamp: Date.now()
      }
    });

    return null;
  }

  // Log why we're rendering (for debugging)
  if (isCoinbaseMiniApp && !isFrameReady) {
    const reason = forceRender ? 'force-render-timeout' : hasRenderedContent ? 'prevent-regression' : 'unknown';
    console.log(`🔍 [CoinbaseMiniAppWrapper] Rendering despite frame not ready (reason: ${reason})`);

    if (reason === 'prevent-regression' && !hasTriggeredDebug) {
      setHasTriggeredDebug(true);
      captureDebugException('prevented-regression-to-black-screen', {
        isCoinbaseMiniApp,
        isFrameReady,
        forceRender,
        hasRenderedContent,
        reason,
        waitingTime: waitingStartTime ? Date.now() - waitingStartTime : null
      });
    }

    Sentry.addBreadcrumb({
      message: `CoinbaseMiniAppWrapper rendering despite not ready: ${reason}`,
      category: 'miniapp',
      level: reason === 'prevent-regression' ? 'warning' : 'info',
      data: {
        isCoinbaseMiniApp,
        isFrameReady,
        forceRender,
        hasRenderedContent,
        reason,
        timestamp: Date.now()
      }
    });
  }

  // Log when we're force-rendering due to timeout
  if (isCoinbaseMiniApp && !isFrameReady && forceRender) {
    console.log('🚨 [CoinbaseMiniAppWrapper] Force-rendering due to timeout - frame not ready but proceeding');

    Sentry.addBreadcrumb({
      message: 'CoinbaseMiniAppWrapper force-rendering due to timeout',
      category: 'miniapp',
      level: 'warning',
      data: {
        isCoinbaseMiniApp,
        isFrameReady,
        forceRender,
        waitingTime: waitingStartTime ? Date.now() - waitingStartTime : 'unknown',
        timestamp: Date.now()
      }
    });
  }

  // Mark that we're about to render content (prevents regression to black screen)
  if (!hasRenderedContent) {
    console.log('🔍 [CoinbaseMiniAppWrapper] First time rendering content - setting hasRenderedContent');
    setHasRenderedContent(true);
  }

  console.log('🔍 [CoinbaseMiniAppWrapper] Rendering children');

  Sentry.addBreadcrumb({
    message: 'CoinbaseMiniAppWrapper rendering children',
    category: 'miniapp',
    level: 'info',
    data: {
      isCoinbaseMiniApp,
      isFrameReady,
      hasRenderedContent,
      timestamp: Date.now()
    }
  });

  return <>{children}</>;
}

function AppContent(props: AppProps) {
  const { Component, pageProps } = props;
  const { isMiniApp, isFarcasterMiniApp, isCoinbaseMiniApp, context, isLoading: isMiniAppLoading } = useIsMiniApp();

  const router = useRouter();

  const isPostRoute = router.pathname.startsWith("/post");

  const AppLayout = isPostRoute ? Layout : Layout;

  console.log('🔍 [AppContent] Render with state:', {
    isMiniApp,
    isFarcasterMiniApp,
    isCoinbaseMiniApp,
    isMiniAppLoading,
    contextExists: !!context,
    pathname: router.pathname
  });

  Sentry.addBreadcrumb({
    message: 'AppContent render',
    category: 'miniapp',
    level: 'info',
    data: {
      isMiniApp,
      isFarcasterMiniApp,
      isCoinbaseMiniApp,
      isMiniAppLoading,
      contextExists: !!context,
      pathname: router.pathname,
      timestamp: Date.now()
    }
  });

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
  const [hasAppContentTriggeredDebug, setHasAppContentTriggeredDebug] = useState(false);

  // Track renders for this component
  useEffect(() => {
    setAppContentRenderCount(prev => prev + 1);
  }, [isMiniApp, isFarcasterMiniApp, isCoinbaseMiniApp, isSDKLoaded, isMiniAppLoading]);

  // Track SDK loading time for Farcaster
  useEffect(() => {
    if (isFarcasterMiniApp && !isSDKLoaded) {
      if (!sdkLoadStartTime) {
        setSdkLoadStartTime(Date.now());
        console.log('🔍 [AppContent] Started SDK loading at:', new Date().toISOString());
      }

      // Check if SDK loading has taken too long (more than 10 seconds)
      if (sdkLoadStartTime && (Date.now() - sdkLoadStartTime) > 10000 && !hasAppContentTriggeredDebug) {
        setHasAppContentTriggeredDebug(true);
        captureDebugException('farcaster-sdk-loading-timeout', {
          waitingTime: Date.now() - sdkLoadStartTime,
          isFarcasterMiniApp,
          isSDKLoaded,
          isMiniAppLoading,
          contextExists: !!context
        });
      }
    } else if (isFarcasterMiniApp && isSDKLoaded && sdkLoadStartTime) {
      const loadTime = Date.now() - sdkLoadStartTime;
      console.log(`🔍 [AppContent] SDK loaded after ${loadTime}ms`);
      setSdkLoadStartTime(null);
    }
  }, [isFarcasterMiniApp, isSDKLoaded, sdkLoadStartTime, hasAppContentTriggeredDebug, context, isMiniAppLoading]);

  // Detect if component is stuck in loading state
  useEffect(() => {
    if (isMiniAppLoading && appContentRenderCount > 20 && !hasAppContentTriggeredDebug) {
      setHasAppContentTriggeredDebug(true);
      captureDebugException('stuck-in-loading-state', {
        renderCount: appContentRenderCount,
        isMiniApp,
        isFarcasterMiniApp,
        isCoinbaseMiniApp,
        isSDKLoaded,
        isMiniAppLoading,
        contextExists: !!context
      });
    }
  }, [isMiniAppLoading, appContentRenderCount, hasAppContentTriggeredDebug, isMiniApp, isFarcasterMiniApp, isCoinbaseMiniApp, isSDKLoaded, context]);

  // Reset SDK loaded state when mini app type changes
  useEffect(() => {
    console.log('🔍 [AppContent] Resetting isSDKLoaded to false due to mini app type change:', {
      isFarcasterMiniApp,
      isMiniApp
    });

    Sentry.addBreadcrumb({
      message: 'AppContent SDK loaded state reset',
      category: 'miniapp',
      level: 'info',
      data: {
        isFarcasterMiniApp,
        isMiniApp,
        timestamp: Date.now()
      }
    });

    setIsSDKLoaded(false);
  }, [isFarcasterMiniApp, isMiniApp]);

  useEffect(() => {
    const load = async () => {
      // Only run Farcaster SDK logic if it's a Farcaster mini app
      if (isFarcasterMiniApp) {
        console.log('🚀 [AppContent] Calling sdk.actions.ready() for Farcaster mini app');

        Sentry.addBreadcrumb({
          message: 'AppContent calling Farcaster sdk.actions.ready',
          category: 'miniapp',
          level: 'info',
          data: { timestamp: Date.now() }
        });

        try {
          await sdk.actions.ready(); // hide splash

          console.log('✅ [AppContent] Farcaster sdk.actions.ready() completed');

          Sentry.addBreadcrumb({
            message: 'AppContent Farcaster sdk.actions.ready completed',
            category: 'miniapp',
            level: 'info',
            data: { timestamp: Date.now() }
          });

          // Prompt to add mini app when ?install
          if (!!router.query.install) {
            if (!context?.client.added) {
              try {
                console.log('🔍 [AppContent] Calling sdk.actions.addMiniApp() for install');

                Sentry.addBreadcrumb({
                  message: 'AppContent calling Farcaster addMiniApp',
                  category: 'miniapp',
                  level: 'info',
                  data: { timestamp: Date.now() }
                });

                await sdk.actions.addMiniApp();

                console.log('✅ [AppContent] sdk.actions.addMiniApp() completed');

                Sentry.addBreadcrumb({
                  message: 'AppContent Farcaster addMiniApp completed',
                  category: 'miniapp',
                  level: 'info',
                  data: { timestamp: Date.now() }
                });
              } catch (error) {
                console.error('🚨 [AppContent] Error calling addMiniApp():', error);

                Sentry.addBreadcrumb({
                  message: 'AppContent Farcaster addMiniApp error',
                  category: 'miniapp',
                  level: 'error',
                  data: {
                    error: error?.toString(),
                    timestamp: Date.now()
                  }
                });

                Sentry.captureException(error, {
                  tags: { component: 'AppContent' }
                });
              }
            }
          }

          // Only set loaded to true after sdk.actions.ready() completes
          console.log('✅ [AppContent] Farcaster SDK ready, setting isSDKLoaded to true');
          setIsSDKLoaded(true);

          Sentry.addBreadcrumb({
            message: 'AppContent Farcaster SDK fully loaded',
            category: 'miniapp',
            level: 'info',
            data: { timestamp: Date.now() }
          });
        } catch (error) {
          console.error('🚨 [AppContent] Error during Farcaster SDK loading:', error);

          // Auto-capture debug exception for SDK loading failures
          if (!hasAppContentTriggeredDebug) {
            setHasAppContentTriggeredDebug(true);
            captureDebugException('farcaster-sdk-loading-failed', {
              error: error?.toString(),
              isFarcasterMiniApp,
              isSDKLoaded,
              isMiniAppLoading,
              contextExists: !!context,
              loadTime: sdkLoadStartTime ? Date.now() - sdkLoadStartTime : 'unknown'
            });
          }

          Sentry.addBreadcrumb({
            message: 'AppContent Farcaster SDK loading error',
            category: 'miniapp',
            level: 'error',
            data: {
              error: error?.toString(),
              timestamp: Date.now()
            }
          });

          Sentry.captureException(error, {
            tags: { component: 'AppContent' }
          });
        }
      }
    };

    if (isFarcasterMiniApp && !isSDKLoaded) {
      console.log('🔄 [AppContent] Loading Farcaster SDK...');

      Sentry.addBreadcrumb({
        message: 'AppContent starting Farcaster SDK load',
        category: 'miniapp',
        level: 'info',
        data: {
          isFarcasterMiniApp,
          isSDKLoaded,
          timestamp: Date.now()
        }
      });

      load();
    } else if (!isMiniApp && !isSDKLoaded) {
      // Handle regular web app (not a mini app)
      console.log('🌐 [AppContent] Regular web app - no SDK needed, setting isSDKLoaded to true');

      Sentry.addBreadcrumb({
        message: 'AppContent regular web app - no SDK needed',
        category: 'miniapp',
        level: 'info',
        data: { timestamp: Date.now() }
      });

      setIsSDKLoaded(true);
    } else {
      console.log('🔍 [AppContent] SDK loading skipped:', {
        isFarcasterMiniApp,
        isMiniApp,
        isSDKLoaded
      });
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

  // Determine if we should render the app
  const shouldRender = !isMiniApp || (isFarcasterMiniApp && isSDKLoaded);

  // bfcache optimization - ensure page can be cached + auto-detect visibility issues
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let visibilityChangeCount = 0;
    let lastVisibilityState = document.visibilityState;

    const handleVisibilityChange = () => {
      const currentState = document.visibilityState;
      visibilityChangeCount++;

      console.log(`🔍 [AppContent] Visibility changed to ${currentState} (change #${visibilityChangeCount})`);

      // If there are rapid visibility changes in mini app context, capture debug
      if (visibilityChangeCount > 3 && (isCoinbaseMiniApp || isFarcasterMiniApp) && !hasAppContentTriggeredDebug) {
        setHasAppContentTriggeredDebug(true);
        captureDebugException('rapid-visibility-changes', {
          visibilityChanges: visibilityChangeCount,
          lastState: lastVisibilityState,
          currentState,
          isCoinbaseMiniApp,
          isFarcasterMiniApp,
          shouldRender,
          isSDKLoaded,
          isMiniAppLoading
        });
      }

      lastVisibilityState = currentState;
    };

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
  }, [isCoinbaseMiniApp, isFarcasterMiniApp, hasAppContentTriggeredDebug, shouldRender, isSDKLoaded, isMiniAppLoading]);

  // Track shouldRender state changes for flicker detection
  const [lastShouldRender, setLastShouldRender] = useState<boolean | null>(null);
  const [shouldRenderChanges, setShouldRenderChanges] = useState(0);

  useEffect(() => {
    if (lastShouldRender !== null && lastShouldRender !== shouldRender) {
      setShouldRenderChanges(prev => prev + 1);
      console.log(`🔍 [AppContent] shouldRender changed from ${lastShouldRender} to ${shouldRender} (change #${shouldRenderChanges + 1})`);

      // If shouldRender has changed many times rapidly, capture debug info
      if (shouldRenderChanges > 5 && !hasAppContentTriggeredDebug) {
        setHasAppContentTriggeredDebug(true);
        captureDebugException('rapid-shouldRender-changes', {
          changes: shouldRenderChanges + 1,
          lastShouldRender,
          currentShouldRender: shouldRender,
          isMiniApp,
          isFarcasterMiniApp,
          isCoinbaseMiniApp,
          isSDKLoaded,
          isMiniAppLoading,
          renderCount: appContentRenderCount
        });
      }
    }
    setLastShouldRender(shouldRender);
  }, [shouldRender, lastShouldRender, shouldRenderChanges, hasAppContentTriggeredDebug, isMiniApp, isFarcasterMiniApp, isCoinbaseMiniApp, isSDKLoaded, isMiniAppLoading, appContentRenderCount]);

  console.log('🔍 [AppContent] Render decision:', {
    shouldRender,
    isMiniApp,
    isFarcasterMiniApp,
    isCoinbaseMiniApp,
    isSDKLoaded,
    isMiniAppLoading,
    renderCondition: '!isMiniApp || (isFarcasterMiniApp && isSDKLoaded)'
  });

  Sentry.addBreadcrumb({
    message: 'AppContent render decision',
    category: 'miniapp',
    level: 'info',
    data: {
      shouldRender,
      isMiniApp,
      isFarcasterMiniApp,
      isCoinbaseMiniApp,
      isSDKLoaded,
      isMiniAppLoading,
      timestamp: Date.now()
    }
  });

  if (!shouldRender) {
    console.log('🔍 [AppContent] Not rendering - conditions not met');

    Sentry.addBreadcrumb({
      message: 'AppContent not rendering - conditions not met',
      category: 'miniapp',
      level: 'info',
      data: {
        isMiniApp,
        isFarcasterMiniApp,
        isCoinbaseMiniApp,
        isSDKLoaded,
        isMiniAppLoading,
        timestamp: Date.now()
      }
    });

    return null;
  }

  console.log('🔍 [AppContent] Rendering app content');

  Sentry.addBreadcrumb({
    message: 'AppContent rendering app content',
    category: 'miniapp',
    level: 'info',
    data: { timestamp: Date.now() }
  });

  return (
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

        {isMiniApp && <link rel="preconnect" href="https://auth.farcaster.xyz" />}

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

// Automatic debug exception capture
const captureDebugException = (reason: string, additionalData: any = {}) => {
  console.log(`🚨 [AUTO-DEBUG] Capturing exception: ${reason}`);

  Sentry.addBreadcrumb({
    message: `Automatic debug exception capture: ${reason}`,
    category: 'debug',
    level: 'error',
    data: {
      reason,
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 'unknown',
      online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
      ...additionalData
    }
  });

  Sentry.captureException(new Error(`Auto-detected issue: ${reason}`), {
    tags: {
      component: 'auto-debug',
      issue: 'coinbase-miniapp-race-condition',
      reason: reason.replace(/\s+/g, '-').toLowerCase()
    }
  });

  console.log('🚨 [AUTO-DEBUG] Exception captured! Check Sentry for breadcrumbs.');
};

// Manual debug helpers (still available for development)
if (typeof window !== 'undefined') {
  (window as any).captureDebugException = () => captureDebugException('manual-trigger');

  (window as any).showDebugState = () => {
    console.log('🔍 [DEBUG] Current mini app state:', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      online: navigator.onLine
    });
  };

  console.log('🔧 [DEBUG] Auto-debug system loaded!');
}

export default function MyApp(props: AppProps) {
  console.log('🔍 [MyApp] Root component render');

  Sentry.addBreadcrumb({
    message: 'MyApp root component render',
    category: 'app',
    level: 'info',
    data: { timestamp: Date.now() }
  });

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
