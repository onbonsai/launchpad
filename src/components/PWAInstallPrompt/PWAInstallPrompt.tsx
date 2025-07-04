import React, { useState, useEffect } from 'react';
import { usePWA } from '@src/hooks/usePWA';
import useIsMobile from '@src/hooks/useIsMobile';

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
        if (deferredPrompt) {
          setShowInstallPrompt(true);
        }
      }, 1000);
      
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isStandalone, deferredPrompt, isMobile]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      // Clear dismissal data since user installed
      localStorage.removeItem(PWA_DISMISSAL_KEY);
    } else {
      console.log('User dismissed the install prompt');
      // Track this as a dismissal
      trackDismissal();
    }

    // Clear the deferredPrompt so it can be garbage collected
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

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

  if (!showInstallPrompt || !isMobile || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <img src="/logo.png" alt="Bonsai" className="w-12 h-12 rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Install Bonsai
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Add Bonsai to your home screen for quick access and offline use.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
      <div className="mt-4 flex space-x-2">
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt; 