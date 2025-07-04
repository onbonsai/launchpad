# RemixPanel Components

A comprehensive UI system for handling storyboard posts with template data manipulation capabilities.

## Components

### RemixPanel
The main component that provides a rich interface for managing storyboard clips with template data editing capabilities.

### RemixStoryboardWrapper
A wrapper component that integrates the RemixPanel with the existing StoryboardModal functionality.

## Features

- **Drag & Drop Reordering**: Easily rearrange clips by dragging them
- **Template Data Editing**: View and edit template data in a JSON editor
- **Clip Management**: Add, remove, duplicate, and replace clips
- **Multiple View Modes**: Switch between timeline and grid views
- **Clip Preview**: Preview individual clips with video controls
- **Time Range Editing**: Adjust start/end times for each clip
- **Integration**: Works seamlessly with existing storyboard functionality

## Usage

### Basic Usage with RemixStoryboardWrapper

```tsx
import { RemixStoryboardWrapper } from '@src/components/RemixPanel';
import type { StoryboardClip } from '@pages/studio/create';

function MyStudioComponent() {
  const [storyboardClips, setStoryboardClips] = useState<StoryboardClip[]>([]);
  const [storyboardAudio, setStoryboardAudio] = useState<File | string | null>(null);
  const [storyboardAudioStartTime, setStoryboardAudioStartTime] = useState<number>(0);

  const handleAddClip = () => {
    // Your logic to add a clip (e.g., open preview history)
    console.log('Add clip clicked');
  };

  const handleReplaceClip = (clipId: string) => {
    // Your logic to replace a clip
    console.log('Replace clip:', clipId);
  };

  return (
    <RemixStoryboardWrapper
      clips={storyboardClips}
      setClips={setStoryboardClips}
      audio={storyboardAudio}
      setAudio={setStoryboardAudio}
      audioStartTime={storyboardAudioStartTime}
      setAudioStartTime={setStoryboardAudioStartTime}
      onAddClip={handleAddClip}
      onReplaceClip={handleReplaceClip}
    />
  );
}
```

### Advanced Usage with RemixPanel Only

```tsx
import { RemixPanel } from '@src/components/RemixPanel';
import type { StoryboardClip } from '@pages/studio/create';

function MyRemixInterface() {
  const [clips, setClips] = useState<StoryboardClip[]>([]);

  const handlePreviewClip = (clip: StoryboardClip) => {
    // Your preview logic
    console.log('Preview clip:', clip);
  };

  const handleEditClip = (clip: StoryboardClip) => {
    // Your edit logic
    console.log('Edit clip:', clip);
  };

  return (
    <RemixPanel
      clips={clips}
      setClips={setClips}
      onPreviewClip={handlePreviewClip}
      onEditClip={handleEditClip}
      onAddClip={() => console.log('Add clip')}
      onReplaceClip={(clipId) => console.log('Replace clip:', clipId)}
    />
  );
}
```

## Integration with Existing Studio Create Page

To integrate with the existing Studio create page, replace the current `StoryboardTimeline` component:

```tsx
// In src/pagesComponents/Studio/CreatePostForm.tsx

// Replace this:
import StoryboardTimeline from "./StoryboardTimeline";

// With this:
import { RemixStoryboardWrapper } from '@src/components/RemixPanel';

// Then in your component JSX, replace:
<StoryboardTimeline
  clips={storyboardClips}
  setClips={setStoryboardClips}
  audio={storyboardAudio}
  setAudio={setStoryboardAudio}
  audioStartTime={storyboardAudioStartTime}
  setAudioStartTime={setStoryboardAudioStartTime}
/>

// With:
<RemixStoryboardWrapper
  clips={storyboardClips}
  setClips={setStoryboardClips}
  audio={storyboardAudio}
  setAudio={setStoryboardAudio}
  audioStartTime={storyboardAudioStartTime}
  setAudioStartTime={setStoryboardAudioStartTime}
  onAddClip={() => {
    // Your add clip logic - typically opens PreviewHistory modal
    // or calls a function to add clips to the storyboard
  }}
  onReplaceClip={(clipId) => {
    // Your replace clip logic
    // This could open a clip browser or preview history
  }}
/>
```

## Props

### RemixPanelProps

```typescript
interface RemixPanelProps {
  clips: StoryboardClip[];
  setClips: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  onAddClip?: () => void;
  onReplaceClip?: (clipId: string) => void;
  onEditClip?: (clip: StoryboardClip) => void;
  onPreviewClip?: (clip: StoryboardClip) => void;
  className?: string;
  isCompact?: boolean;
}
```

### RemixStoryboardWrapperProps

```typescript
interface RemixStoryboardWrapperProps {
  clips: StoryboardClip[];
  setClips: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  audio?: File | string | null;
  setAudio?: React.Dispatch<React.SetStateAction<File | string | null>>;
  audioStartTime?: number;
  setAudioStartTime?: React.Dispatch<React.SetStateAction<number>>;
  onAddClip?: () => void;
  onReplaceClip?: (clipId: string) => void;
  className?: string;
  showRemixPanel?: boolean;
  showStoryboardModal?: boolean;
}
```

## Key Features Explained

### Template Data Editing
Each clip's template data can be viewed and edited through a JSON editor. This allows for fine-grained control over the generation parameters for each clip.

### Drag & Drop Reordering
Clips can be easily reordered by dragging them in both timeline and grid views.

### Multiple View Modes
- **Timeline View**: Shows clips in a vertical timeline with expanded details
- **Grid View**: Shows clips in a responsive grid layout for quick overview

### Clip Actions
- **Preview**: Play the clip with video controls
- **Edit**: Open the storyboard modal for detailed editing
- **Duplicate**: Create a copy of the clip
- **Replace**: Replace the clip with a new one
- **Remove**: Delete the clip from the storyboard

### Integration with Existing Components
The wrapper component seamlessly integrates with the existing `StoryboardModal` component, maintaining all existing functionality while adding the new remix capabilities.

## Styling

The components use Tailwind CSS and are designed to match the existing application's dark theme with gray and blue color scheme.

## Dependencies

- `@hello-pangea/dnd` - For drag and drop functionality
- `@heroicons/react` - For icons
- `clsx` - For conditional class names
- Existing application components: `Button`, `Modal`