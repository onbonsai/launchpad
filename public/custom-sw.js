// Custom service worker for handling PWA notifications

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    
    // Show the notification
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW] Notification shown successfully');
      })
      .catch((error) => {
        console.error('[SW] Error showing notification:', error);
      });
  }
  
  if (event.data && event.data.type === 'REGISTER_PENDING_GENERATION') {
    const { generation } = event.data;
    console.log('[SW] Registering pending generation:', generation);
    
    // Add to pending generations list
    addPendingGeneration(generation);
    
    // Schedule background sync to check for completion
    if (self.registration.sync) {
      self.registration.sync.register('check-generations');
    }
  }
  
  if (event.data && event.data.type === 'REMOVE_PENDING_GENERATION') {
    const { generationId } = event.data;
    console.log('[SW] Removing pending generation:', generationId);
    
    // Remove from pending generations list
    removePendingGeneration(generationId);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();
  
  // Focus or open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/studio/create') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise, open a new window
        if (clients.openWindow) {
          const url = event.notification.data?.url || '/studio/create';
          return clients.openWindow(url);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification);
});

// Background sync for checking completed generations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'check-generations') {
    event.waitUntil(checkForCompletedGenerations());
  }
});

// Function to check for completed generations in the background
async function checkForCompletedGenerations() {
  try {
    console.log('[SW] Checking for completed generations...');
    
    // Get stored pending generations from IndexedDB or localStorage
    const pendingGenerations = await getPendingGenerations();
    
    if (pendingGenerations.length === 0) {
      console.log('[SW] No pending generations to check');
      return;
    }
    
    // Check each pending generation
    for (const generation of pendingGenerations) {
      const isCompleted = await checkGenerationStatus(generation);
      
      if (isCompleted) {
        // Show notification for completed generation
        await self.registration.showNotification('Your generation is ready', {
          body: 'Click to view it on Bonsai',
          icon: '/logo.png',
          badge: '/favicon.png',
          tag: 'generation-complete',
          requireInteraction: true,
          data: {
            url: '/studio/create',
            generationId: generation.id,
            timestamp: Date.now()
          }
        });
        
        // Remove from pending list
        await removePendingGeneration(generation.id);
      }
    }
  } catch (error) {
    console.error('[SW] Error checking for completed generations:', error);
  }
}

// Helper functions for managing pending generations
async function getPendingGenerations() {
  // This would typically use IndexedDB, but for simplicity using a basic approach
  try {
    const stored = await getFromIndexedDB('pendingGenerations');
    return stored || [];
  } catch (error) {
    console.error('[SW] Error getting pending generations:', error);
    return [];
  }
}

async function addPendingGeneration(generation) {
  try {
    const pending = await getPendingGenerations();
    const updated = [...pending, generation];
    await saveToIndexedDB('pendingGenerations', updated);
    console.log('[SW] Added pending generation:', generation.id);
  } catch (error) {
    console.error('[SW] Error adding pending generation:', error);
  }
}

async function removePendingGeneration(id) {
  try {
    const pending = await getPendingGenerations();
    const updated = pending.filter(gen => gen.id !== id);
    await saveToIndexedDB('pendingGenerations', updated);
    console.log('[SW] Removed pending generation:', id);
  } catch (error) {
    console.error('[SW] Error removing pending generation:', error);
  }
}

async function checkGenerationStatus(generation) {
  try {
    // This would make an API call to check if the generation is complete
    const response = await fetch(`${generation.apiUrl}/previews/${generation.roomId}/messages?count=1&end=`);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    const messages = data.messages || [];
    
    // Check if the latest message is our completed generation
    const latestMessage = messages.find(msg => 
      msg.userId === 'agent' && 
      msg.content?.preview?.agentId === generation.expectedAgentId
    );
    
    return !!latestMessage;
  } catch (error) {
    console.error('[SW] Error checking generation status:', error);
    return false;
  }
}

// Simple IndexedDB helpers
async function getFromIndexedDB(key) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BonsaiSW', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => resolve(getRequest.result?.value);
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data', { keyPath: 'key' });
      }
    };
  });
}

async function saveToIndexedDB(key, value) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BonsaiSW', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const putRequest = store.put({ key, value });
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data', { keyPath: 'key' });
      }
    };
  });
} 