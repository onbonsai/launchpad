import React, { useState } from 'react';
import { PlayIcon, ClipboardCopyIcon } from '@heroicons/react/solid';
import type { StoryboardClip } from '@pages/studio/create';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export interface RemixPanelProps {
  clips: StoryboardClip[];
  setClips: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  onAddClip?: () => void;
  onReplaceClip?: (clipId: string) => void;
  onEditClip?: (clip: StoryboardClip) => void;
  onPreviewClip?: (clip: StoryboardClip) => void;
  onCopyField?: (fieldKey: string, value: any) => void;
  className?: string;
  isCompact?: boolean;
}

const RemixPanel: React.FC<RemixPanelProps> = ({
  clips,
  className,
  onCopyField
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    return clips.reduce((total, clip) => total + (clip.endTime - clip.startTime), 0);
  };

  const formatTemplateData = (templateData: any) => {
    if (!templateData) return null;

    const fields = [
      { key: 'prompt', label: 'Prompt' },
      { key: 'sceneDescription', label: 'Scene Description' },
      { key: 'stylePreset', label: 'Style Preset' },
      { key: 'subjectReference', label: 'Subject Reference' },
      { key: 'elevenLabsVoiceId', label: 'Voice ID' },
      { key: 'narration', label: 'Narration' },
    ];

    return fields
      .filter(field => templateData[field.key] !== undefined && templateData[field.key] !== null)
      .map(field => ({
        label: field.label,
        key: field.key,
        value: templateData[field.key]
      }));
  };

  const handleCopyField = (fieldKey: string, value: any) => {
    if (onCopyField) {
      onCopyField(fieldKey, value);
      toast.success(`Copied ${fieldKey} to form`);
    }
  };

  const renderClipCard = (clip: StoryboardClip, index: number) => {
    const isSelected = selectedClipId === clip.id;
    const clipDuration = clip.endTime - clip.startTime;
    const formattedData = formatTemplateData(clip.templateData);

    return (
      <div
        className={clsx(
          "bg-gray-800 rounded-lg border transition-all duration-200 cursor-pointer",
          isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-700 hover:border-gray-600"
        )}
        onClick={() => setSelectedClipId(isSelected ? null : clip.id)}
      >
        {/* Clip Header */}
        <div className="p-4">
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
        </div>

        {/* Template Data Section */}
        {isSelected && (
          <div className="border-t border-gray-700">
            <div className="p-4">
              <h4 className="text-sm font-medium text-white mb-3">Clip Details</h4>
              {formattedData && formattedData.length > 0 ? (
                <div className="space-y-3">
                  {formattedData.map((field, index) => (
                    <div key={index}>
                      <div className="text-xs font-medium text-gray-400 mb-1">
                        {field.label}
                      </div>
                      <div 
                        className={clsx(
                          "text-sm text-white bg-gray-900 rounded-lg p-3 transition-colors",
                          onCopyField && "hover:bg-gray-800 cursor-pointer group relative"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCopyField) {
                            handleCopyField(field.key, field.value);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <span className="flex-1">
                            {typeof field.value === 'string' ? field.value : String(field.value)}
                          </span>
                          {onCopyField && (
                            <ClipboardCopyIcon className="w-4 h-4 text-gray-500 group-hover:text-blue-400 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        {onCopyField && (
                          <div className="absolute inset-0 rounded-lg border border-transparent group-hover:border-blue-500/30 pointer-events-none" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">
                  No template data available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={clsx("w-full", className)}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">Storyboard Clips</h3>
          <span className="text-sm text-gray-400">
            {clips.length} clip{clips.length !== 1 ? 's' : ''} • {formatTime(getTotalDuration())}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Click on a clip to view its details{onCopyField ? ' • Click on any field to copy it to the form' : ''}
        </p>
      </div>

      {/* Content */}
      {clips.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <PlayIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p>No clips in your storyboard yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clips.map((clip, index) => (
            <div key={clip.id}>
              {renderClipCard(clip, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RemixPanel;