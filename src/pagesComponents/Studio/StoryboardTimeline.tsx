import React, { useState } from 'react';
import { MusicNoteIcon, PencilIcon } from '@heroicons/react/solid';
import type { StoryboardClip } from "@src/services/madfi/studio";
import StoryboardModal from './StoryboardModal';

interface StoryboardTimelineProps {
  clips: StoryboardClip[];
  setClips: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  audio: File | string | null;
  setAudio: React.Dispatch<React.SetStateAction<File | string | null>>;
  audioStartTime: number;
  setAudioStartTime: React.Dispatch<React.SetStateAction<number>>;
  isRemixAudio?: boolean;
}

const StoryboardTimeline: React.FC<StoryboardTimelineProps> = ({ clips, setClips, audio, setAudio, audioStartTime, setAudioStartTime, isRemixAudio = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  console.log('[StoryboardTimeline] Component rendered with clips:', {
    count: clips.length,
    firstClipHasVideo: !!clips[0]?.preview?.video?.url,
    firstClipId: clips[0]?.id
  });

  const openModal = () => {
    console.log('[StoryboardTimeline] Opening modal');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    console.log('[StoryboardTimeline] Closing modal');
    setIsModalOpen(false);
  };

  if (!clips.length) {
    console.log('[StoryboardTimeline] No clips, returning null');
    return null;
  }

  return (
    <>
      <div className="w-full rounded-lg mt-4">
        <h3 className="text-md text-white mb-2">Storyboard</h3>

        {/* Clickable preview that opens the modal */}
        <div
          onClick={openModal}
          className="cursor-pointer group hover:bg-dark-grey/20 rounded-lg p-3 transition-colors border border-dark-grey/30 hover:border-brand-highlight/50"
        >
          {/* Clips Preview Row */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {clips.map((clip, index) => {
              console.log(`[StoryboardTimeline] Rendering clip ${index + 1}:`, {
                id: clip.id,
                hasImage: !!(clip.preview.imagePreview || clip.preview.image),
                hasVideo: !!clip.preview.video,
                hasVideoUrl: !!clip.preview.video?.url
              });

              return (
                <div
                  key={clip.id}
                  className="relative flex-shrink-0 w-24 h-16 bg-dark-grey rounded-lg overflow-hidden"
                >
                  <img
                    src={clip.preview.imagePreview || clip.preview.image}
                    alt={`Clip ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error(`[StoryboardTimeline] Failed to load image for clip ${index + 1}:`, e);
                    }}
                    onLoad={() => {
                      console.log(`[StoryboardTimeline] Successfully loaded image for clip ${index + 1}`);
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-end justify-start p-1">
                    <span className="text-white text-xs font-mono bg-black/60 px-1 py-0.5 rounded">
                      {index + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audio indicator */}
          {audio && (
            <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
              <MusicNoteIcon className="w-4 h-4" />
              <span>
                {typeof audio === 'string' ? 'Background Music' : audio.name}
              </span>
            </div>
          )}

          {/* Edit indicator */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-white/70">
              {/* {clips.length} clip{clips.length !== 1 ? 's' : ''} in storyboard */}
            </span>
            <div className="flex items-center gap-1 text-brand-highlight text-sm opacity-70 group-hover:opacity-100 transition-opacity">
              <PencilIcon className="w-4 h-4" />
              <span>Edit</span>
            </div>
          </div>
        </div>
      </div>

      <StoryboardModal
        isOpen={isModalOpen}
        onClose={closeModal}
        clips={clips}
        setClips={setClips}
        audio={audio}
        setAudio={setAudio}
        storyboardAudioStartTime={audioStartTime}
        setStoryboardAudioStartTime={setAudioStartTime}
        isRemixAudio={isRemixAudio}
      />
    </>
  );
};

export default StoryboardTimeline;