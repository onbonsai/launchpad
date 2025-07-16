import React, { useState, useEffect } from 'react';
import { usePWA } from '@src/hooks/usePWA';
import useIsMobile from '@src/hooks/useIsMobile';
import { Button } from '@src/components/Button';
import { useIsMiniApp } from '@src/hooks/useIsMiniApp';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWADismissalData {
  count: number;
  lastDismissed: number;
}

const PWA_DISMISSAL_KEY = 'pwa-install-dismissals';
const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;
const MAX_DISMISSALS = 2;

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const { isStandalone } = usePWA();
  const isMobile = useIsMobile();
  const { isMiniApp } = useIsMiniApp();

  // Check if prompt should be shown based on dismissal history
  const shouldShowPrompt = (): boolean => {
    try {
      const stored = localStorage.getItem(PWA_DISMISSAL_KEY);
      if (!stored) return true;

      const data: PWADismissalData = JSON.parse(stored);

      // If dismissed 2 or more times, hide permanently
      if (data.count >= MAX_DISMISSALS) return false;

      // If dismissed once, check if 24 hours have passed
      if (data.count === 1) {
        const timeSinceLastDismissal = Date.now() - data.lastDismissed;
        return timeSinceLastDismissal >= HOURS_24_IN_MS;
      }

      return true;
    } catch (error) {
      console.error('Error checking PWA dismissal data:', error);
      return true;
    }
  };

  // Detect iOS for specific instructions
  const isIOS = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show prompt on mobile devices, if not already installed, and if allowed by dismissal logic
      if (isMobile && !isStandalone && shouldShowPrompt()) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also check on component mount if we should show the prompt
    if (isMobile && !isStandalone && shouldShowPrompt()) {
      // Small delay to ensure any deferred prompt is available
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 1000);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isStandalone, isMobile]);

  const trackDismissal = () => {
    try {
      const stored = localStorage.getItem(PWA_DISMISSAL_KEY);
      let data: PWADismissalData = { count: 0, lastDismissed: 0 };

      if (stored) {
        data = JSON.parse(stored);
      }

      data.count += 1;
      data.lastDismissed = Date.now();

      localStorage.setItem(PWA_DISMISSAL_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing PWA dismissal data:', error);
    }
  };

  const handleDismiss = () => {
    trackDismissal();
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showInstallPrompt || !isMobile || isStandalone || isMiniApp) return null;

  // Handler for Install button (Android/Chrome)
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.removeItem(PWA_DISMISSAL_KEY);
    } else {
      trackDismissal();
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  return (
    <div className="fixed bottom-0 md:left-auto md:right-4 md:w-80 bg-[#1C1D1C] text-white rounded-lg shadow-lg p-6 z-[1000]">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <img src="/logo.png" alt="Bonsai" className="w-12 h-12 rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white">
            Install Bonsai
          </h3>
          <p className="text-sm text-gray-300 mt-1">
            Add Bonsai to your home screen for quick access and offline use.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {/* Installation Instructions */}
      <div className="mt-4 p-4 bg-gray-700 rounded-md border border-gray-600 flex items-start space-x-3">
        <div className="flex-shrink-0 pt-0.5">
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white mb-1">
            {isIOS() ? 'To install on iOS:' : 'To install on Android:'}
          </div>
          <ol className="list-decimal list-inside text-sm text-gray-200 space-y-0.5">
            {isIOS() ? (
              <>
                <li>Tap the Share button</li>
                <li>Select "Add to Home Screen"</li>
                <li>Tap "Add"</li>
              </>
            ) : (
              <>
                <li>Tap the menu (⋮) button</li>
                <li>Select "Add to Home screen"</li>
                <li>Tap "Add"</li>
              </>
            )}
          </ol>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {deferredPrompt ? (
          <>
            <Button
              onClick={handleInstallClick}
              className="w-1/2"
              variant="primary"
            >
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              className="w-1/2"
              variant="secondary"
            >
              Not now
            </Button>
          </>
        ) : (
          <Button
            onClick={handleDismiss}
            className="w-full"
            variant="secondary"
          >
            Got it
          </Button>
        )}
      </div>
    </div>
  );
};

export default PWAInstallPrompt;