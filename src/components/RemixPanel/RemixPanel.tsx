import React, { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  XCircleIcon, 
  PlusIcon, 
  DuplicateIcon, 
  CogIcon, 
  PlayIcon,
  PencilIcon,
  TrashIcon,
  SwitchHorizontalIcon,
  CollectionIcon,
  ViewGridIcon,
  RewindIcon,
  FastForwardIcon
} from '@heroicons/react/solid';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/outline';
import type { StoryboardClip } from '@pages/studio/create';
import { Button } from '@src/components/Button';
import { Modal } from '@src/components/Modal';
import clsx from 'clsx';

export interface RemixPanelProps {
  clips: StoryboardClip[];
  setClips: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  onAddClip?: () => void;
  onReplaceClip?: (clipId: string) => void;
  onEditClip?: (clip: StoryboardClip) => void;
  onPreviewClip?: (clip: StoryboardClip) => void;
  className?: string;
  isCompact?: boolean;
}

interface ClipTemplateData {
  id: string;
  templateData: any;
  expanded: boolean;
}

const RemixPanel: React.FC<RemixPanelProps> = ({
  clips,
  setClips,
  onAddClip,
  onReplaceClip,
  onEditClip,
  onPreviewClip,
  className,
  isCompact = false
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [expandedClips, setExpandedClips] = useState<Set<string>>(new Set());
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateData, setEditingTemplateData] = useState<any>(null);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('timeline');

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const onDragEnd = useCallback((result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;

    const reorderedClips = Array.from(clips);
    const [removed] = reorderedClips.splice(source.index, 1);
    reorderedClips.splice(destination.index, 0, removed);

    setClips(reorderedClips);
  }, [clips, setClips]);

  const removeClip = useCallback((clipId: string) => {
    setClips(clips.filter(clip => clip.id !== clipId));
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  }, [clips, setClips, selectedClipId]);

  const duplicateClip = useCallback((clip: StoryboardClip) => {
    const newClip: StoryboardClip = {
      ...clip,
      id: `${clip.id}_copy_${Date.now()}`,
    };
    setClips([...clips, newClip]);
  }, [clips, setClips]);

  const toggleClipExpansion = useCallback((clipId: string) => {
    setExpandedClips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clipId)) {
        newSet.delete(clipId);
      } else {
        newSet.add(clipId);
      }
      return newSet;
    });
  }, []);

  const handleEditTemplateData = useCallback((clip: StoryboardClip) => {
    setEditingTemplateData(clip.templateData || {});
    setEditingClipId(clip.id);
    setIsTemplateModalOpen(true);
  }, []);

  const handleSaveTemplateData = useCallback(() => {
    if (editingClipId) {
      setClips(clips.map(clip => 
        clip.id === editingClipId 
          ? { ...clip, templateData: editingTemplateData }
          : clip
      ));
    }
    setIsTemplateModalOpen(false);
    setEditingTemplateData(null);
    setEditingClipId(null);
  }, [clips, setClips, editingTemplateData, editingClipId]);

  const getTotalDuration = useCallback(() => {
    return clips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);
  }, [clips]);

  const renderClipCard = (clip: StoryboardClip, index: number, isDragging: boolean = false) => {
    const isExpanded = expandedClips.has(clip.id);
    const isSelected = selectedClipId === clip.id;
    const clipDuration = clip.endTime - clip.startTime;

    return (
      <div
        className={clsx(
          "bg-gray-800 rounded-lg border transition-all duration-200",
          isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-700",
          isDragging ? "opacity-50 scale-105" : "hover:border-gray-600",
          "group"
        )}
      >
        {/* Clip Header */}
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setSelectedClipId(isSelected ? null : clip.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Clip Preview */}
              <div className="relative w-16 h-12 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                {clip.preview.imagePreview || clip.preview.image ? (
                  <img
                    src={clip.preview.imagePreview || clip.preview.image}
                    alt={`Clip ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PlayIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <PlayIcon className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Clip Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-white truncate">
                    Clip {index + 1}
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    {formatTime(clipDuration)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewClip?.(clip);
                }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Preview clip"
              >
                <PlayIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClip?.(clip);
                }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Edit clip"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateClip(clip);
                }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Duplicate clip"
              >
                <DuplicateIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReplaceClip?.(clip.id);
                }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Replace clip"
              >
                <SwitchHorizontalIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeClip(clip.id);
                }}
                className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-700 transition-colors"
                title="Remove clip"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isSelected && (
          <div className="border-t border-gray-700">
            <div className="p-4 space-y-4">
              {/* Template Data Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">Template Data</h4>
                  <button
                    onClick={() => handleEditTemplateData(clip)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                    {clip.templateData ? JSON.stringify(clip.templateData, null, 2) : 'No template data'}
                  </pre>
                </div>
              </div>

              {/* Clip Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                  <input
                    type="number"
                    value={clip.startTime}
                    onChange={(e) => {
                      const newStartTime = Math.max(0, Math.min(parseFloat(e.target.value) || 0, clip.endTime - 0.1));
                      setClips(clips.map(c => 
                        c.id === clip.id ? { ...c, startTime: newStartTime } : c
                      ));
                    }}
                    className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">End Time</label>
                  <input
                    type="number"
                    value={clip.endTime}
                    onChange={(e) => {
                      const newEndTime = Math.max(clip.startTime + 0.1, Math.min(parseFloat(e.target.value) || 0, clip.duration));
                      setClips(clips.map(c => 
                        c.id === clip.id ? { ...c, endTime: newEndTime } : c
                      ));
                    }}
                    className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
                    step="0.1"
                    min={clip.startTime + 0.1}
                    max={clip.duration}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTimelineView = () => (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="remix-clips">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="space-y-3"
          >
            {clips.map((clip, index) => (
              <Draggable key={clip.id} draggableId={clip.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    {renderClipCard(clip, index, snapshot.isDragging)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );

  const renderGridView = () => (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="remix-clips-grid" direction="horizontal">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {clips.map((clip, index) => (
              <Draggable key={clip.id} draggableId={clip.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    {renderClipCard(clip, index, snapshot.isDragging)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );

  return (
    <div className={clsx("w-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">Remix Panel</h3>
          <span className="text-sm text-gray-400">
            {clips.length} clip{clips.length !== 1 ? 's' : ''} • {formatTime(getTotalDuration())}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                viewMode === 'timeline' 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-400 hover:text-white"
              )}
              title="Timeline view"
            >
              <CollectionIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                viewMode === 'grid' 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-400 hover:text-white"
              )}
              title="Grid view"
            >
              <ViewGridIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Add Clip Button */}
          <Button
            onClick={onAddClip}
            variant="primary"
            size="sm"
            className="flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Clip</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      {clips.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CollectionIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p>No clips in your storyboard yet</p>
          <p className="text-sm mt-2">Add clips to start building your remix</p>
        </div>
      ) : (
        viewMode === 'timeline' ? renderTimelineView() : renderGridView()
      )}

      {/* Template Data Editor Modal */}
      <Modal
        open={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        setOpen={setIsTemplateModalOpen}
        panelClassnames="!max-w-4xl"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Edit Template Data</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Template Data (JSON)
              </label>
              <textarea
                value={JSON.stringify(editingTemplateData, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setEditingTemplateData(parsed);
                  } catch (error) {
                    // Keep the text as-is if it's not valid JSON
                  }
                }}
                className="w-full h-64 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white font-mono text-sm"
                placeholder="Enter template data as JSON..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setIsTemplateModalOpen(false)}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplateData}
                variant="primary"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RemixPanel;