import { useState, useEffect } from "react";

const useWebNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Set initial permission state from browser and localStorage
    const storedPermission = localStorage.getItem("notification-permission");
    if (storedPermission === "granted" || storedPermission === "denied") {
      setPermission(storedPermission);
    } else if ("Notification" in window) {
      setPermission(Notification.permission);
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
    }
  };

  const sendNotification = async (title: string, options?: NotificationOptions) => {
    try {
      // Check if we're in PWA mode
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone === true ||
                   document.referrer.includes('android-app://');

      // if (isPWA && "serviceWorker" in navigator) {
      //   console.log("Sending notification to service worker and is pwa");
      //   // For PWA mode, use service worker messaging
      //   const registration = await navigator.serviceWorker.ready;
      //   console.log("registration", registration);
      //   // Send message to service worker to show notification
      //   if (registration.active) {
      //     registration.active.postMessage({
      //       type: 'SHOW_NOTIFICATION',
      //       title,
      //       options: {
      //         ...options,
      //         icon: options?.icon || "/logo.png",
      //         badge: "/favicon.png",
      //         tag: 'generation-complete',
      //         requireInteraction: true,
      //         data: {
      //           url: window.location.href,
      //           timestamp: Date.now()
      //         }
      //       }
      //     });
      //     console.log("Notification message sent to service worker");
      //     return;
      //   }
      // }

      // Try service worker for regular mode too
      // if ("serviceWorker" in navigator) {
      //   console.log("Sending notification to service worker regular mode");
      //   const registration = await navigator.serviceWorker.ready;
      //   console.log("registration", registration);
      //   if (registration.showNotification) {
      //     await registration.showNotification(title, {
      //       ...options,
      //       icon: options?.icon || "/logo.png",
      //       badge: "/favicon.png",
      //       tag: 'generation-complete',
      //       requireInteraction: true,
      //       data: {
      //         url: window.location.href,
      //         timestamp: Date.now()
      //       }
      //     });
      //     console.log("Notification sent via service worker");
      //     return;
      //   }
      // }

      // Fallback to regular notification if service worker not available
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

  return { permission, requestPermission, sendNotification };
};

export default useWebNotifications;
