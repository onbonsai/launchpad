// This file is used by next-pwa to inject custom code into the service worker

// Cache names
const CACHE_NAME = 'bonsai-cache-v1';
const OFFLINE_URL = '/offline';

// Pending generations tracking
const pendingGenerations = new Map();
const POLL_INTERVAL = 10000; // 10 seconds

// Function to poll for task status
async function pollTaskStatus(generation) {
  const { id, apiUrl, roomId, expectedAgentId, idToken } = generation;
  
  try {
    console.log(`[SW] Polling status for task ${id}`);
    
    // First, try to get the task status
    const statusResponse = await fetch(`${apiUrl}/task/${id}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
      },
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`[SW] Task ${id} status:`, statusData.status);
      
      if (statusData.status === 'completed') {
        // Task completed, notify all clients
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
          client.postMessage({
            type: 'RELOAD_MESSAGES',
            roomId: roomId,
            generationId: id,
          });
        });
        
        // Show notification if we have permission
        if (Notification.permission === 'granted') {
          self.registration.showNotification('Preview Generated!', {
            body: 'Your preview is ready. Click to view.',
            icon: '/logo.png',
            badge: '/favicon.png',
            data: {
              url: generation.postUrl || '/',
              roomId: roomId,
              generationId: id,
            },
          });
        }
        
        // Remove from pending
        pendingGenerations.delete(id);
        return true;
      } else if (statusData.status === 'failed') {
        console.error(`[SW] Task ${id} failed:`, statusData.error);
        pendingGenerations.delete(id);
        return false;
      }
    }
    
    // If task status endpoint doesn't work or task is still processing,
    // try checking messages endpoint as fallback
    if (roomId && expectedAgentId && idToken) {
      const messagesResponse = await fetch(`${apiUrl}/previews/${roomId}/messages?count=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer: ${idToken}`
        },
      });
      
      if (messagesResponse.ok) {
        const data = await messagesResponse.json();
        const messages = data.messages || [];
        
        // Check if our expected preview is in the messages
        const foundPreview = messages.find(msg => 
          msg.userId === 'agent' && 
          msg.content?.preview?.agentId === expectedAgentId
        );
        
        if (foundPreview) {
          console.log(`[SW] Found completed preview for ${id} via messages endpoint`);
          
          // Notify all clients
          const clients = await self.clients.matchAll({ type: 'window' });
          clients.forEach(client => {
            client.postMessage({
              type: 'RELOAD_MESSAGES',
              roomId: roomId,
              generationId: id,
            });
          });
          
          // Show notification
          if (Notification.permission === 'granted') {
            self.registration.showNotification('Preview Generated!', {
              body: 'Your preview is ready. Click to view.',
              icon: '/logo.png',
              badge: '/favicon.png',
              data: {
                url: generation.postUrl || '/',
                roomId: roomId,
                generationId: id,
              },
            });
          }
          
          pendingGenerations.delete(id);
          return true;
        }
      }
    }
    
    // Still processing, continue polling
    return null;
  } catch (error) {
    console.error(`[SW] Error polling task ${id}:`, error);
    // Don't remove from pending on network errors, keep trying
    return null;
  }
}

// Start polling for all pending generations
async function pollAllPendingGenerations() {
  if (pendingGenerations.size === 0) return;
  
  console.log(`[SW] Polling ${pendingGenerations.size} pending generations`);
  
  for (const [id, generation] of pendingGenerations) {
    // Skip if too old (>1 hour)
    if (Date.now() - generation.timestamp > 3600000) {
      console.log(`[SW] Removing old generation ${id}`);
      pendingGenerations.delete(id);
      continue;
    }
    
    await pollTaskStatus(generation);
  }
  
  // Schedule next poll if we still have pending generations
  if (pendingGenerations.size > 0) {
    setTimeout(pollAllPendingGenerations, POLL_INTERVAL);
  }
}

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
            })
            .catch((error) => {
              // Network failed, try to serve from cache again
              console.log('[SW] Network request failed, attempting cache lookup:', error);
              return caches.match(event.request);
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
      // For studio/create notifications, try to find an existing studio window
      if (url.includes("/studio/create")) {
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
      }

      // If no existing window or not a studio notification, open a new one
      if (clients.openWindow) {
        // const finalUrl = roomId ? `${url}?roomId=${roomId}` : url;
        return clients.openWindow(url);
      }
    }),
  );
});

// Handle messages from the app
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  } else if (event.data && event.data.type === "REGISTER_PENDING_GENERATION") {
    // Register a new pending generation to track
    const generation = event.data.generation;
    console.log('[SW] Registering pending generation:', generation);
    pendingGenerations.set(generation.id, generation);
    
    // Start polling if not already running
    if (pendingGenerations.size === 1) {
      setTimeout(pollAllPendingGenerations, POLL_INTERVAL);
    }
  } else if (event.data && event.data.type === "REMOVE_PENDING_GENERATION") {
    // Remove a pending generation
    const generationId = event.data.generationId;
    console.log('[SW] Removing pending generation:', generationId);
    pendingGenerations.delete(generationId);
  } else if (event.data && event.data.type === "GET_PENDING_GENERATIONS") {
    // Return pending generations for a specific room
    const roomId = event.data.roomId;
    console.log('[SW] Getting pending generations for room:', roomId);
    
    const roomGenerations = Array.from(pendingGenerations.values())
      .filter(gen => !roomId || gen.roomId === roomId);
    
    // Reply using the provided MessagePort
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        pendingGenerations: roomGenerations
      });
    }
  }
});
