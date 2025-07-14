import React, { useState, useCallback } from 'react';
import type { StoryboardClip } from "@src/services/madfi/studio";
import RemixPanel from './RemixPanel';
import StoryboardModal from '@src/pagesComponents/Studio/StoryboardModal';
import { Button } from '@src/components/Button';
import { Modal } from '@src/components/Modal';
import {
  SwitchHorizontalIcon,
  CollectionIcon,
  PlayIcon,
  PencilIcon
} from '@heroicons/react/solid';
import clsx from 'clsx';

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

const RemixStoryboardWrapper: React.FC<RemixStoryboardWrapperProps> = ({
  clips,
  setClips,
  audio,
  setAudio,
  audioStartTime = 0,
  setAudioStartTime,
  onAddClip,
  onReplaceClip,
  className,
  showRemixPanel = false,
  showStoryboardModal = false
}) => {
  const [isRemixPanelOpen, setIsRemixPanelOpen] = useState(showRemixPanel);
  const [isStoryboardModalOpen, setIsStoryboardModalOpen] = useState(showStoryboardModal);
  const [previewingClip, setPreviewingClip] = useState<StoryboardClip | null>(null);
  const [editingClip, setEditingClip] = useState<StoryboardClip | null>(null);

  const handlePreviewClip = useCallback((clip: StoryboardClip) => {
    setPreviewingClip(clip);
  }, []);

  const handleEditClip = useCallback((clip: StoryboardClip) => {
    setEditingClip(clip);
    setIsStoryboardModalOpen(true);
  }, []);

  const handleOpenRemixPanel = useCallback(() => {
    setIsRemixPanelOpen(true);
  }, []);

  const handleCloseRemixPanel = useCallback(() => {
    setIsRemixPanelOpen(false);
  }, []);

  const handleOpenStoryboardModal = useCallback(() => {
    setIsStoryboardModalOpen(true);
  }, []);

  const handleCloseStoryboardModal = useCallback(() => {
    setIsStoryboardModalOpen(false);
    setEditingClip(null);
  }, []);

  const handleReplaceClip = useCallback((clipId: string) => {
    // This would typically open a clip browser/selector
    // For now, we'll just call the provided callback
    onReplaceClip?.(clipId);
  }, [onReplaceClip]);

  if (!clips.length) {
    return (
      <div className={clsx("w-full", className)}>
        <div className="text-center py-8 text-gray-400">
          <CollectionIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p>No clips in your storyboard yet</p>
          <p className="text-sm mt-2">Add clips to start building your remix</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("w-full", className)}>
      {/* Control Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">Storyboard</h3>
          <span className="text-sm text-gray-400">
            {clips.length} clip{clips.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={handleOpenRemixPanel}
            variant="secondary"
            size="sm"
            className="flex items-center space-x-2"
          >
            <SwitchHorizontalIcon className="w-4 h-4" />
            <span>Remix Panel</span>
          </Button>

          <Button
            onClick={handleOpenStoryboardModal}
            variant="primary"
            size="sm"
            className="flex items-center space-x-2"
          >
            <PencilIcon className="w-4 h-4" />
            <span>Edit Timeline</span>
          </Button>
        </div>
      </div>

      {/* Preview Row */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {clips.map((clip, index) => (
          <div
            key={clip.id}
            className="relative flex-shrink-0 w-24 h-16 bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
            onClick={() => handlePreviewClip(clip)}
          >
            <img
              src={clip.preview.imagePreview || clip.preview.image}
              alt={`Clip ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <PlayIcon className="w-4 h-4 text-white" />
            </div>
            <div className="absolute bottom-1 left-1">
              <span className="text-white text-xs font-mono bg-black/60 px-1 py-0.5 rounded">
                {index + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Remix Panel Modal */}
      <Modal
        open={isRemixPanelOpen}
        onClose={handleCloseRemixPanel}
        setOpen={setIsRemixPanelOpen}
        panelClassnames="!max-w-7xl !min-w-0 w-full"
      >
        <RemixPanel
          clips={clips}
          setClips={setClips}
          onAddClip={onAddClip}
          onReplaceClip={handleReplaceClip}
          onEditClip={handleEditClip}
          onPreviewClip={handlePreviewClip}
          className="p-6"
        />
      </Modal>

      {/* Storyboard Modal */}
      <StoryboardModal
        isOpen={isStoryboardModalOpen}
        onClose={handleCloseStoryboardModal}
        clips={clips}
        setClips={setClips}
        audio={audio || null}
        setAudio={setAudio || (() => {})}
        storyboardAudioStartTime={audioStartTime}
        setStoryboardAudioStartTime={setAudioStartTime || (() => {})}
      />

      {/* Clip Preview Modal */}
      <Modal
        open={!!previewingClip}
        onClose={() => setPreviewingClip(null)}
        setOpen={(open) => !open && setPreviewingClip(null)}
        panelClassnames="!max-w-4xl"
      >
        {previewingClip && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Preview: Clip {clips.findIndex(c => c.id === previewingClip.id) + 1}
            </h3>
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  src={previewingClip.preview.video?.url}
                  poster={previewingClip.preview.imagePreview || previewingClip.preview.image}
                  controls
                  className="w-full max-h-96 object-contain"
                />
              </div>

              {/* Clip Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white ml-2">
                    {Math.floor((previewingClip.endTime - previewingClip.startTime) / 60)}:
                    {Math.floor((previewingClip.endTime - previewingClip.startTime) % 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Range:</span>
                  <span className="text-white ml-2">
                    {Math.floor(previewingClip.startTime / 60)}:
                    {Math.floor(previewingClip.startTime % 60).toString().padStart(2, '0')} -
                    {Math.floor(previewingClip.endTime / 60)}:
                    {Math.floor(previewingClip.endTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Template Data */}
              {previewingClip.templateData && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Template Data</h4>
                  <div className="bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(previewingClip.templateData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RemixStoryboardWrapper;