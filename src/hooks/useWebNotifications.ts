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

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      new Notification(title, options);
    }
  };

  return { permission, requestPermission, sendNotification };
};

export default useWebNotifications;