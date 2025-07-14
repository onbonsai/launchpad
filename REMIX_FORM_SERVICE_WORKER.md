# RemixForm Service Worker Based Preview Generation

## Overview

This implementation replaces the direct worker management in RemixForm with a Service Worker-based approach that allows preview generation tasks to continue running in the background, even when the RemixForm component unmounts or the user navigates away.

## Key Changes

### 1. Service Worker Updates (`public/sw.js`)

Added background task tracking functionality:

- **Pending Generation Tracking**: The service worker maintains a Map of pending preview generations
- **Task Status Polling**: Polls the `/task/:taskId/status` endpoint every 10 seconds
- **Message Fallback**: Falls back to checking the messages endpoint if task status is unavailable
- **Client Notification**: Notifies all open clients when a preview completes
- **Push Notifications**: Shows browser notifications when previews are ready

### 2. RemixForm Component Updates

Replaced direct worker management with service worker communication:

- **Task Creation**: Makes direct API calls to create preview tasks
- **Service Worker Registration**: Registers pending tasks with the service worker
- **Background Persistence**: Tasks continue even when component unmounts
- **Visibility Handling**: Checks for completed previews when tab becomes visible
- **Message Listening**: Listens for service worker messages about completed previews

### 3. CSS Animation

Added shimmer animation for better loading state visualization:

```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

## How It Works

1. **User Initiates Preview Generation**
   - RemixForm creates a preview task via API
   - Receives a taskId from the server
   - Registers the task with the service worker

2. **Background Processing**
   - Service worker polls task status independently
   - Continues polling even if user closes the modal
   - Handles authentication with stored idToken

3. **Completion Handling**
   - Service worker detects completion
   - Sends messages to all open clients
   - Shows browser notification if permitted
   - Updates UI when user returns

## Benefits

- **Non-blocking UX**: Users can continue using the app while previews generate
- **Persistence**: Generations continue across navigation and tab changes
- **Notifications**: Users are notified when previews complete
- **Reliability**: Network failures don't lose track of pending generations
- **Multi-tab Support**: All open tabs are notified of completions

## Technical Details

### Service Worker Message Types

- `REGISTER_PENDING_GENERATION`: Register a new task to track
- `REMOVE_PENDING_GENERATION`: Remove a completed/failed task
- `RELOAD_MESSAGES`: Signal to reload messages and check for completions

### Task Tracking Structure

```javascript
{
  id: taskId,
  roomId: roomId,
  apiUrl: template.apiUrl,
  expectedAgentId: tempId,
  timestamp: Date.now(),
  idToken: idToken
}
```

### Error Handling

- Tasks older than 1 hour are automatically removed
- Network errors don't remove tasks (keeps retrying)
- Failed tasks are removed and users are notified

## Future Enhancements

1. **Offline Support**: Queue generations when offline
2. **Progress Updates**: Show percentage completion
3. **Batch Operations**: Handle multiple generations efficiently
4. **Analytics**: Track success rates and timing 