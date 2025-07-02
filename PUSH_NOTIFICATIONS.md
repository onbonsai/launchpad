# Push Notifications Setup for PWA Generation Completion

This guide explains how to implement server-side push notifications to notify users when their generations are complete, even when the PWA is backgrounded on mobile.

## Problem Solved

The current implementation relies on frontend-only polling which doesn't work reliably when:
- The PWA is backgrounded on iOS/Android
- The device suspends the app to save battery
- The user switches to another app

## Solution Overview

1. **Frontend**: Subscribes to push notifications and sends subscription to server
2. **Backend**: Uses `web-push` to send notifications when generations complete
3. **Service Worker**: Handles incoming push notifications and manages app reactivation

## Frontend Implementation (Already Done)

The frontend code has been updated to:

### 1. Subscribe to Push Notifications
- `useWebNotifications.ts` hook handles subscription
- Requests notification permission
- Registers push subscription with browser
- Sends subscription to backend server

### 2. Handle Incoming Notifications
- Service worker receives push notifications
- Shows notification to user
- Handles notification clicks to reopen app
- Sends message to app to reload latest generations

### 3. Reload Messages on Notification Click
- `create.tsx` listens for service worker messages
- Automatically checks for completed generations when app is reactivated

## Backend Implementation (Server Side)

You need to implement the following on your **BonsaiClient server** (not the Next.js frontend):

### 1. Install Dependencies

```bash
npm install web-push
npm install @types/web-push --save-dev
```

### 2. Generate VAPID Keys

```javascript
const webpush = require('web-push');

// Generate VAPID keys (run once)
const vapidKeys = webpush.generateVAPIDs();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

### 3. Environment Variables

Add to your server environment:

```bash
# VAPID keys for push notifications
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@domain.com
```

Add to your **frontend** environment:

```bash
# Frontend only needs the public key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
```

### 4. Database Schema for Subscriptions

Add a collection to store user subscriptions:

```javascript
// MongoDB collection: pushSubscriptions
{
  userAddress: "0x...", // User's address
  subscription: {
    endpoint: "https://...",
    keys: {
      p256dh: "...",
      auth: "..."
    }
  },
  createdAt: Date,
  lastUsed: Date
}
```

### 5. Server Routes

Add these routes to your BonsaiClient server:

```javascript
import webpush from 'web-push';

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Store push subscription
this.app.post('/push/subscribe', verifyLensId, async (req, res) => {
  try {
    const userAddress = (req as any).user?.act?.sub;
    const { subscription } = req.body;

    // Store subscription in database
    await this.mongo.pushSubscriptions?.updateOne(
      { userAddress },
      { 
        $set: { 
          subscription, 
          lastUsed: new Date() 
        },
        $setOnInsert: { 
          createdAt: new Date() 
        }
      },
      { upsert: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error storing push subscription:', error);
    res.status(500).json({ error: 'Failed to store subscription' });
  }
});

// Send push notification
async sendPushNotification(userAddress: string, payload: any) {
  try {
    const subscriptionDoc = await this.mongo.pushSubscriptions?.findOne({ userAddress });
    if (!subscriptionDoc?.subscription) {
      console.log(`No push subscription found for user: ${userAddress}`);
      return;
    }

    await webpush.sendNotification(
      subscriptionDoc.subscription,
      JSON.stringify(payload)
    );

    // Update last used timestamp
    await this.mongo.pushSubscriptions?.updateOne(
      { userAddress },
      { $set: { lastUsed: new Date() } }
    );

    console.log(`Push notification sent to ${userAddress}`);
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // Clean up invalid subscriptions
    if (error.statusCode === 410) {
      await this.mongo.pushSubscriptions?.deleteOne({ userAddress });
    }
  }
}
```

### 6. Trigger Notifications on Generation Completion

Update your generation completion logic:

```javascript
// In your _processCreatePreviewTask method, after successful generation:
if (response?.preview) {
  // ... existing code ...

  // Send push notification
  await this.sendPushNotification(creator, {
    title: 'Your generation is ready',
    body: 'Click to view it on Bonsai',
    icon: '/logo.png',
    url: '/studio/create',
    roomId: createdRoomId,
    generationId: media.agentId
  });
}
```

### 7. Database Setup

Add the push subscriptions collection to your MongoDB initialization:

```javascript
// In your initCollections function
export const initCollections = async () => {
  // ... existing collections ...
  
  const pushSubscriptions = db.collection('pushSubscriptions');
  await pushSubscriptions.createIndex({ userAddress: 1 }, { unique: true });
  await pushSubscriptions.createIndex({ lastUsed: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days
  
  return { /* other collections */, pushSubscriptions };
};
```

## Testing

1. **Development**: Notifications work in development mode for immediate feedback
2. **Production**: Use HTTPS and valid VAPID keys for production push notifications
3. **Mobile**: Test with PWA installed on iOS/Android devices

## Key Benefits

1. **Reliable**: Works even when PWA is backgrounded
2. **Battery Efficient**: No need for constant polling
3. **User Friendly**: Native notification experience
4. **Automatic Reload**: App automatically shows new generations when reopened

## Troubleshooting

1. **Notifications not appearing**: Check VAPID keys and HTTPS requirement
2. **Service worker issues**: Ensure service worker is registered and updated
3. **Permission denied**: User must grant notification permission
4. **iOS limitations**: iOS may still have some restrictions in certain scenarios

## Security Notes

- VAPID keys should be kept secure
- Subscriptions are tied to authenticated users
- Clean up expired/invalid subscriptions regularly
- Use HTTPS in production (required for push notifications) 