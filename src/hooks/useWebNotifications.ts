import { urlBase64ToUint8Array } from "@src/utils/utils";
import { useState, useEffect } from "react";

const useWebNotifications = (userAddress?: string) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Helper function to detect PWA mode
  const isPWAMode = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  };

  useEffect(() => {
    
    // Check if notifications and service workers are supported
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setIsSupported(true);
      registerServiceWorker();
    } else {
      setIsSupported(false);
    }

    // Set initial permission state from browser
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Following the Next.js guide pattern
  const registerServiceWorker = async () => {
    try {
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      
      
      // Get existing subscription
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
      
    } catch (error) {
      console.error('❌ [PWA] Service worker registration failed:', error);
    }
  };

  const subscribeToPush = async () => {
    if (!isSupported) {
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
        return false;
      }

      // Only subscribe to push notifications if we're in PWA mode
      if (isPWAMode()) {
        if (!userAddress) {
          return false;
        }

        // Check if already subscribed
        if (subscription) {
          return true;
        }

        // Following Next.js guide pattern
        const registration = await navigator.serviceWorker.ready;
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
        });
        
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

    } catch (error) {
      console.error("[useWebNotifications] Error sending subscription to server:", error);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      await subscription?.unsubscribe();
      setSubscription(null);
      
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
        return;
      }

      // In browser mode, send client-side notifications
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
    isSupported,
    subscribeToPush,
    unsubscribeFromPush,
    sendNotification,
    isPWAMode: isPWAMode()
  };
};

export default useWebNotifications;
