import { useState, useEffect } from 'react';

const useWebNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Set initial permission state from browser and localStorage
    const storedPermission = localStorage.getItem('notification-permission');
    if (storedPermission === 'granted' || storedPermission === 'denied') {
      setPermission(storedPermission);
    } else if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      return;
    }

    if (permission === 'default') {
      const newPermission = await Notification.requestPermission();
      localStorage.setItem('notification-permission', newPermission);
      setPermission(newPermission);
    }
  };

  const sendNotification = async (title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      return;
    }

    // Prefer showing the notification via the service worker for a better PWA experience
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        // The service worker will handle displaying the notification
        registration.showNotification(title, options);
        return;
      }
    }

    // Fallback for when no service worker is active
    new Notification(title, options);
  };

  return { permission, requestPermission, sendNotification };
};

export default useWebNotifications;