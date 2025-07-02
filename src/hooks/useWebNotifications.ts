import { useState, useEffect } from "react";

const useWebNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // Set initial permission state from browser and localStorage
    const storedPermission = localStorage.getItem("notification-permission");
    if (storedPermission === "granted" || storedPermission === "denied") {
      setPermission(storedPermission);
    } else if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // Get existing subscription if available
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(existingSubscription => {
          setSubscription(existingSubscription);
        });
      });
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      return;
    }

    if (permission === "default") {
      const newPermission = await Notification.requestPermission();
      localStorage.setItem("notification-permission", newPermission);
      setPermission(newPermission);

      // Subscribe to push notifications
      await subscribeToPush();
    } else if (permission === "granted" && !subscription) {
      // Permission already granted but no subscription yet
      await subscribeToPush();
    }
  };

  const subscribeToPush = async () => {
    console.log("[useWebNotifications] Starting subscribeToPush...");
    
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[useWebNotifications] Push messaging is not supported");
      return;
    }

    console.log("[useWebNotifications] VAPID public key:", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "SET" : "NOT SET");

    try {
      console.log("[useWebNotifications] Waiting for service worker ready...");
      const registration = await navigator.serviceWorker.ready;
      console.log("[useWebNotifications] Service worker ready");
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      console.log("[useWebNotifications] Existing subscription:", existingSubscription ? "EXISTS" : "NONE");
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        // Send to server in case it's not stored there
        await sendSubscriptionToServer(existingSubscription);
        return;
      }

      console.log("[useWebNotifications] Creating new subscription...");
      // Create new subscription
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      });

      console.log("[useWebNotifications] New subscription created:", newSubscription);
      setSubscription(newSubscription);
      await sendSubscriptionToServer(newSubscription);
    } catch (error) {
      console.error("[useWebNotifications] Error subscribing to push notifications:", error);
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      // Get auth token for the request
      const sessionClient = await (await import('@src/hooks/useLensLogin')).resumeSession(true);
      if (!sessionClient) return;
      
      const creds = await sessionClient.getCredentials();
      if (creds.isErr() || !creds.value) return;
      
      const idToken = creds.value.idToken;

      // Send subscription to your server
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error("Error sending subscription to server:", error);
    }
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

  // Utility function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return { 
    permission, 
    subscription,
    requestPermission, 
    sendNotification,
    subscribeToPush
  };
};

export default useWebNotifications;
