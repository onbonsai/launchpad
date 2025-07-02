import { urlBase64ToUint8Array } from "@src/utils/utils";
import { useState, useEffect } from "react";

const useWebNotifications = (userAddress?: string) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Helper function to detect PWA mode
  const isPWAMode = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  };

  useEffect(() => {
    console.log("[useWebNotifications] isPWAMode:", isPWAMode());
    // Set initial permission state from browser
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // Only get existing subscription if we're in PWA mode (where we need server push)
    if (isPWAMode() && "serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(existingSubscription => {
          setSubscription(existingSubscription);
        });
      }).catch(console.error);
    }
  }, []);

  const requestPermissionAndSubscribe = async () => {
    if (!("Notification" in window)) {
      console.log("[useWebNotifications] Notifications not supported");
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
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          console.log("[useWebNotifications] Push notifications not supported in PWA mode");
          return false;
        }

        if (!userAddress) {
          console.log("[useWebNotifications] No user address provided for PWA subscription");
          return false;
        }

        // Check if already subscribed
        if (subscription) {
          console.log("[useWebNotifications] Already subscribed to push notifications");
          return true;
        }

        // Subscribe to push notifications for PWA
        console.log("[useWebNotifications] Subscribing to push notifications for PWA");
        const registration = await navigator.serviceWorker.ready;
        console.log("[useWebNotifications] Registration:", registration);
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
    requestPermissionAndSubscribe, 
    sendNotification,
    isPWAMode: isPWAMode()
  };
};

export default useWebNotifications;
