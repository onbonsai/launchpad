// This file is used by next-pwa to inject custom code into the service worker

// Cache names
const CACHE_NAME = 'bonsai-cache-v1';
const OFFLINE_URL = '/offline';

// Install event - cache offline page
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching offline page');
        return cache.addAll([
          OFFLINE_URL,
          '/',
          '/favicon.ico',
          '/logo.png',
        ]);
      })
      .then(() => {
        console.log('[SW] Offline page cached');
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle offline fallback
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests (page requests)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If we got a response, cache it and return it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try to serve from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If not in cache and it's a navigation request, serve offline page
              return caches.match(OFFLINE_URL);
            });
        })
    );
  }
  // For non-navigation requests, try cache first, then network
  else if (event.request.destination === 'image' || 
           event.request.destination === 'script' || 
           event.request.destination === 'style') {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseClone);
                  });
              }
              return response;
            });
        })
    );
  }
});

// Listen for push events
self.addEventListener("push", function (event) {
  console.log("[SW] Push event received:", event);
  console.log("[SW] Push event data:", event.data);

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
    console.log("[SW] Parsed push data:", data);
  } catch (error) {
    console.error("[SW] Error parsing push data:", error);
    console.log("[SW] Raw push data:", event.data ? event.data.text() : "No data");
  }

  const title = data.title || "Bonsai Notification";
  const options = {
    body: data.body || "You have a new notification",
    icon: data.icon || "/logo.png",
    badge: "/favicon.png",
    vibrate: [100, 50, 100],
    requireInteraction: true,
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: data.url || "/studio/create",
      generationId: data.generationId,
      roomId: data.roomId,
    },
    actions: [
      {
        action: "view",
        title: "View Generation",
        icon: "/logo.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  console.log("[SW] Showing notification with title:", title, "and options:", options);

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        console.log("[SW] Notification shown successfully");
      })
      .catch((error) => {
        console.error("[SW] Error showing notification:", error);
      }),
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "dismiss") {
    // Just close the notification
    return;
  }

  // For 'view' action or default click
  const url = event.notification.data?.url || "/studio/create";
  const roomId = event.notification.data?.roomId;
  const generationId = event.notification.data?.generationId;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing window with the studio/create page
      for (const client of clientList) {
        if (client.url.includes("/studio/create") && "focus" in client) {
          // Send a message to reload messages
          client.postMessage({
            type: "RELOAD_MESSAGES",
            roomId: roomId,
            generationId: generationId,
          });
          return client.focus();
        }
      }

      // If no existing window, open a new one
      if (clients.openWindow) {
        const finalUrl = roomId ? `${url}?roomId=${roomId}` : url;
        return clients.openWindow(finalUrl);
      }
    }),
  );
});

// Handle messages from the app
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
