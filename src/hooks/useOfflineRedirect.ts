import { useEffect } from 'react';
import { useRouter } from 'next/router';

interface UseOfflineRedirectOptions {
  redirectOnOffline?: boolean;
  redirectOnOnline?: boolean;
  offlineUrl?: string;
}

export const useOfflineRedirect = (options: UseOfflineRedirectOptions = {}) => {
  const {
    redirectOnOffline = false,
    redirectOnOnline = false,
    offlineUrl = '/offline'
  } = options;
  
  const router = useRouter();

  useEffect(() => {
    const handleOnline = () => {
      console.log('[PWA] Back online');
      
      // If we're on the offline page and user is back online, go back or go home
      if (redirectOnOnline && router.pathname === '/offline') {
        // Try to go back in history, otherwise go to home
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push('/');
        }
      }
    };

    const handleOffline = () => {
      console.log('[PWA] Gone offline');
      
      // Redirect to offline page if configured
      if (redirectOnOffline && router.pathname !== '/offline') {
        router.push(offlineUrl);
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router, redirectOnOffline, redirectOnOnline, offlineUrl]);

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}; 