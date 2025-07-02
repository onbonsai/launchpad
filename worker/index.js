// This file is used by next-pwa to inject custom code into the service worker

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('[SW] Push event received:', event);
  console.log('[SW] Push event data:', event.data);
  
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
    console.log('[SW] Parsed push data:', data);
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    console.log('[SW] Raw push data:', event.data ? event.data.text() : 'No data');
  }
  
  const title = data.title || 'Bonsai Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/logo.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    requireInteraction: true,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: data.url || '/studio/create',
      generationId: data.generationId,
      roomId: data.roomId
    },
    actions: [
      {
        action: 'view',
        title: 'View Generation',
        icon: '/logo.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  console.log('[SW] Showing notification with title:', title, 'and options:', options);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW] Notification shown successfully');
      })
      .catch((error) => {
        console.error('[SW] Error showing notification:', error);
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    // Just close the notification
    return;
  }

  // For 'view' action or default click
  const url = event.notification.data?.url || '/studio/create';
  const roomId = event.notification.data?.roomId;
  const generationId = event.notification.data?.generationId;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an existing window with the studio/create page
        for (const client of clientList) {
          if (client.url.includes('/studio/create') && 'focus' in client) {
            // Send a message to reload messages
            client.postMessage({
              type: 'RELOAD_MESSAGES',
              roomId: roomId,
              generationId: generationId
            });
            return client.focus();
          }
        }
        
        // If no existing window, open a new one
        if (clients.openWindow) {
          const finalUrl = roomId ? `${url}?roomId=${roomId}` : url;
          return clients.openWindow(finalUrl);
        }
      })
  );
});

// Handle messages from the app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
}); 