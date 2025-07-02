import { urlBase64ToUint8Array } from "@src/utils/utils";
import { useState, useEffect } from "react";

const useWebNotifications = (userAddress?: string) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Helper function to detect PWA mode
  const isPWAMode = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  };

  useEffect(() => {
    console.log("[useWebNotifications] isPWAMode:", isPWAMode());
    
    // Check if notifications and service workers are supported
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setIsSupported(true);
      registerServiceWorker();
    } else {
      console.log("[useWebNotifications] Push notifications not supported in this browser");
      setIsSupported(false);
    }

    // Set initial permission state from browser
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      console.log('🔍 [PWA DEBUG] Environment Analysis:');
      console.log('- Environment:', process.env.NODE_ENV);
      console.log('- URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
      console.log('- HTTPS:', typeof window !== 'undefined' ? window.location.protocol === 'https:' : 'SSR');
      console.log('- VAPID Key:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? '✅ SET' : '❌ MISSING');
      
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.error('❌ [PWA DEBUG] Service Worker not supported');
        return;
      }
      
      console.log('✅ [PWA DEBUG] Service Worker API supported');
      
      // Check if sw.js exists
      const swResponse = await fetch('/sw.js');
      console.log(`🔍 [PWA DEBUG] /sw.js status: ${swResponse.status}`);
      
      if (swResponse.status !== 200) {
        console.error('❌ [PWA DEBUG] Service worker file missing - next-pwa build failed');
        console.error('❌ [PWA DEBUG] This is why push notifications are not working on Vercel');
        return;
      }
      
      console.log('✅ [PWA DEBUG] Service worker file found');
      
      // Check existing registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`🔍 [PWA DEBUG] Existing registrations: ${registrations.length}`);
      
      let activeRegistration: ServiceWorkerRegistration;
      
      if (registrations.length === 0) {
        console.log('⚠️ [PWA DEBUG] No service worker registered - next-pwa auto-registration may have failed');
        console.log('🔧 [PWA DEBUG] Attempting manual registration...');
        
        // Manual registration as fallback (similar to Next.js example)
        activeRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        console.log('✅ [PWA DEBUG] Manual registration successful:', activeRegistration);
      } else {
        registrations.forEach((reg, i) => {
          console.log(`✅ [PWA DEBUG] Registration ${i}:`, reg.scope, reg.active?.state);
        });
        
        // Use the first registration
        activeRegistration = registrations[0];
      }
      
      // Cache the registration for later use
      setRegistration(activeRegistration);
      console.log('📦 [PWA DEBUG] Cached registration:', activeRegistration);
      
      // Get existing subscription from the registration
      const sub = await activeRegistration.pushManager.getSubscription();
      setSubscription(sub);
      console.log("[useWebNotifications] Subscription:", sub);
      
      // Monitor service worker events
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 [PWA DEBUG] Service worker controller changed');
      });
      
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 [PWA DEBUG] Message from service worker:', event.data);
      });
      
    } catch (error) {
      console.error('❌ [PWA DEBUG] Error in service worker registration:', error);
    }
  };

  const requestPermissionAndSubscribe = async () => {
    if (!isSupported) {
      console.log("[useWebNotifications] Push notifications not supported");
      return false;
    }

    if (!registration) {
      console.log("[useWebNotifications] No service worker registration available");
      return false;
    }

    try {
      // Request notification permission first
      let newPermission = permission;
      if (permission === "default") {
        newPermission = await Notification.requestPermission();
        setPermission(newPermission);
      }

      if (newPermission !== "granted") {
        console.log("[useWebNotifications] Permission denied");
        return false;
      }

      // Only subscribe to push notifications if we're in PWA mode
      if (isPWAMode()) {
        if (!userAddress) {
          console.log("[useWebNotifications] No user address provided for PWA subscription");
          return false;
        }

        console.log("[useWebNotifications] Registration:", registration);
        console.log("[useWebNotifications] Subscription:", subscription);

        // Check if already subscribed
        if (subscription) {
          console.log("[useWebNotifications] Already subscribed to push notifications");
          return true;
        }

        // Subscribe to push notifications for PWA using cached registration
        console.log("[useWebNotifications] Subscribing to push notifications for PWA");
        console.log("[useWebNotifications] Using cached registration:", registration);
        
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
        });
        console.log("[useWebNotifications] New subscription:", newSubscription);

        setSubscription(newSubscription);

        // Send subscription to server
        await sendSubscriptionToServer(newSubscription);
      } else {
        console.log("[useWebNotifications] Browser mode - using client-side notifications only");
      }
      
      return true;
    } catch (error) {
      console.error("[useWebNotifications] Error setting up notifications:", error);
      return false;
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    if (!userAddress) return;
    
    try {
      const sessionClient = await (await import('@src/hooks/useLensLogin')).resumeSession(true);
      if (!sessionClient) return;
      
      const creds = await sessionClient.getCredentials();
      if (creds.isErr() || !creds.value) return;
      
      const idToken = creds.value.idToken;

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          subscription,
          userAddress
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send subscription: ${response.status}`);
      }

      console.log("[useWebNotifications] Subscription sent to server successfully");
    } catch (error) {
      console.error("[useWebNotifications] Error sending subscription to server:", error);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      await subscription?.unsubscribe();
      setSubscription(null);
      
      // Optionally call server to remove subscription
      // await unsubscribeUser();
      
      console.log("[useWebNotifications] Unsubscribed from push notifications");
    } catch (error) {
      console.error("[useWebNotifications] Error unsubscribing:", error);
    }
  };

  const sendNotification = async (title: string, options?: NotificationOptions) => {
    try {
      // Check if we're in PWA mode
      if (isPWAMode()) {
        // In PWA mode, don't send client-side notifications
        // Rely on server-side push notifications instead
        console.log("[useWebNotifications] PWA mode - notifications handled by server push");
        return;
      }

      // In browser mode, send client-side notifications
      console.log("[useWebNotifications] Browser mode - sending client-side notification");
      const notification = new Notification(title, {
        ...options,
        icon: options?.icon || "/logo.png",
        tag: 'generation-complete'
      });
      
      // Auto-close after 5 seconds if not interacted with
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  return { 
    permission,
    subscription,
    registration,
    isSupported,
    requestPermissionAndSubscribe,
    unsubscribeFromPush,
    sendNotification,
    isPWAMode: isPWAMode()
  };
};

export default useWebNotifications;
