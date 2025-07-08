# RemixForm Service Worker Fixes

## Issues Addressed

### 1. Notification URL Fix
**Problem**: Notifications were trying to navigate to studio/create page instead of the post page
**Solution**: 
- Updated service worker to use `generation.postUrl` from the registered generation data
- Modified RemixForm to pass the postId when registering generations
- Added postId prop chain from Chat → ChatInput → RemixForm

### 2. Loading Existing Previews
**Problem**: When reopening the chat, completed previews weren't being displayed
**Solution**:
- Added `loadExistingPreviews` effect in RemixForm that runs on mount
- Fetches messages from the room's history via the preview API
- Converts messages to localPreviews format and sets the most recent as current

### 3. Persisting Pending Generations
**Problem**: Pending generations were lost when closing and reopening the chat
**Solution**:
- Added `GET_PENDING_GENERATIONS` message handler in service worker
- Added `checkPendingGenerations` effect in RemixForm that queries service worker on mount
- Service worker returns filtered pending generations for the specific roomId
- RemixForm restores pending previews to local state and continues tracking

## Technical Implementation

### Service Worker Changes
```javascript
// Handle GET_PENDING_GENERATIONS request
else if (event.data && event.data.type === "GET_PENDING_GENERATIONS") {
  const roomId = event.data.roomId;
  const roomGenerations = Array.from(pendingGenerations.values())
    .filter(gen => !roomId || gen.roomId === roomId);
  
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({
      pendingGenerations: roomGenerations
    });
  }
}
```

### RemixForm Changes
1. Load existing previews on mount from room history
2. Check with service worker for pending generations
3. Pass postId through props for correct notification URLs
4. Store prompt text with pending generations for better UX

## User Experience Improvements
- Notifications now correctly navigate to the post page
- Chat remembers all previews across sessions
- Pending generations continue across navigation
- Better loading states with prompt text displayed 