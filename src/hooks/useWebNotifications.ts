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
    if (permission !== "granted") {
      return;
    }

    try {
      // First try to use service worker if available
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        console.log("Service worker registration:", registration);

        if (registration.showNotification) {
          await registration.showNotification(title, {
            ...options,
            icon: options?.icon || "/logo.png",
            badge: "/favicon.png",
          });
          console.log("Notification sent via service worker");
          return;
        }
      }

      // Fallback to regular notification if service worker not available
      new Notification(title, options);
      console.log("Notification sent via Notification API");
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  return { permission, requestPermission, sendNotification };
};

export default useWebNotifications;
