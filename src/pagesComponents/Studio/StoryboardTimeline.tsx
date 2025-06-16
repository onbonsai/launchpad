import React, { useState } from 'react';
import { XCircleIcon, ScissorsIcon } from '@heroicons/react/solid';
import type { StoryboardClip } from '@pages/studio/create';
import { Preview } from '@src/services/madfi/studio';
import TrimModal from './TrimModal';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface StoryboardTimelineProps {
  clips: StoryboardClip[];
  setClips: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
}

const StoryboardTimeline: React.FC<StoryboardTimelineProps> = ({ clips, setClips }) => {
  const [clipToTrim, setClipToTrim] = useState<StoryboardClip | null>(null);

  const removeClip = (clipId: string) => {
    setClips(clips.filter(clip => clip.id !== clipId));
  };

  const handleSaveTrim = (clipId: string, startTime: number, endTime: number) => {
    setClips(clips.map(clip =>
      clip.id === clipId ? { ...clip, startTime, endTime } : clip
    ));
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;

    const reorderedClips = Array.from(clips);
    const [removed] = reorderedClips.splice(source.index, 1);
    reorderedClips.splice(destination.index, 0, removed);

    setClips(reorderedClips);
  };

  if (!clips.length) {
    return null;
  }

  return (
    <>
      <div className="w-full bg-card-light rounded-lg p-4 mt-4">
        <h3 className="text-lg font-semibold text-white mb-2">Storyboard</h3>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="storyboard" direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex space-x-2 overflow-x-auto pb-2"
              >
                {clips.map((clip, index) => (
                  <Draggable key={clip.id} draggableId={clip.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="relative flex-shrink-0 w-32 h-20 bg-dark-grey rounded-lg overflow-hidden group"
                      >
                        <img
                          src={clip.preview.imagePreview || clip.preview.image}
                          alt={`Clip ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 flex flex-col justify-between p-1">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setClipToTrim(clip)}
                              className="text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Trim clip"
                            >
                              <ScissorsIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeClip(clip.id)}
                              className="text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove clip"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-white text-xs font-mono bg-black/50 px-1 rounded self-start">{index + 1}</span>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      <TrimModal
        clip={clipToTrim}
        onClose={() => setClipToTrim(null)}
        onSave={handleSaveTrim}
      />
    </>
  );
};

export default StoryboardTimeline; 