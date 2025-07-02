import { useState, useEffect } from "react";

const useWebNotifications = (userAddress?: string) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // Set initial permission state from browser
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // Get existing subscription if available
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(existingSubscription => {
          setSubscription(existingSubscription);
        });
      }).catch(console.error);
    }
  }, []);

  const requestPermissionAndSubscribe = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[useWebNotifications] Push notifications not supported");
      return false;
    }

    if (!userAddress) {
      console.log("[useWebNotifications] No user address provided");
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

      // Check if already subscribed
      if (subscription) {
        console.log("[useWebNotifications] Already subscribed");
        return true;
      }

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      });

      console.log("[useWebNotifications] New subscription created");
      setSubscription(newSubscription);

      // Send subscription to server
      await sendSubscriptionToServer(newSubscription);
      
      return true;
    } catch (error) {
      console.error("[useWebNotifications] Error subscribing to push notifications:", error);
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

  // Utility function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const sendNotification = async (title: string, options?: NotificationOptions) => {
    try {
      // For local development/fallback, still use the old approach
      // In production, notifications will come from the server via push
      if (permission === "granted") {
        // Check if we're in PWA mode
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true ||
                     document.referrer.includes('android-app://');

        if (isPWA || process.env.NODE_ENV === 'development') {
          // Fallback to regular notification for immediate feedback in dev
          const notification = new Notification(title, {
            ...options,
            icon: options?.icon || "/logo.png",
            tag: 'generation-complete'
          });
          
          // Auto-close after 5 seconds if not interacted with
          setTimeout(() => {
            notification.close();
          }, 5000);
        }
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  return { 
    permission,
    subscription,
    requestPermissionAndSubscribe, 
    sendNotification
  };
};

export default useWebNotifications;
