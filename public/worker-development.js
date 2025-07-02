/******/ (() => { // webpackBootstrap
// This file is used by next-pwa to inject custom code into the service worker

// Listen for push events
self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
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
    actions: [{
      action: 'view',
      title: 'View Generation',
      icon: '/logo.png'
    }, {
      action: 'dismiss',
      title: 'Dismiss'
    }]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
  var _event$notification$d, _event$notification$d2, _event$notification$d3;
  event.notification.close();
  if (event.action === 'dismiss') {
    // Just close the notification
    return;
  }

  // For 'view' action or default click
  const url = ((_event$notification$d = event.notification.data) === null || _event$notification$d === void 0 ? void 0 : _event$notification$d.url) || '/studio/create';
  const roomId = (_event$notification$d2 = event.notification.data) === null || _event$notification$d2 === void 0 ? void 0 : _event$notification$d2.roomId;
  const generationId = (_event$notification$d3 = event.notification.data) === null || _event$notification$d3 === void 0 ? void 0 : _event$notification$d3.generationId;
  event.waitUntil(clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(clientList => {
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
  }));
});

// Handle messages from the app
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const {
      title,
      options
    } = event.data;
    self.registration.showNotification(title, options);
  }
});
/******/ })()
;