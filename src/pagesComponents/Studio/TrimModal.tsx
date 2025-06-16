import React, { useState, useEffect, useRef } from 'react';
import { StoryboardClip } from '@pages/studio/create';
import { Button } from '@src/components/Button';

interface TrimModalProps {
  clip: StoryboardClip | null;
  onClose: () => void;
  onSave: (clipId: string, startTime: number, endTime: number) => void;
}

const TrimModal: React.FC<TrimModalProps> = ({ clip, onClose, onSave }) => {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (clip) {
      setStartTime(clip.startTime);
      setEndTime(clip.endTime);
    }
  }, [clip]);

  if (!clip || !clip.preview.video) return null;

  const handleSave = () => {
    onSave(clip.id, startTime, endTime);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className=" bg-zinc-800 rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Trim Clip</h2>
        <video
          ref={videoRef}
          src={clip.preview.video.url}
          className="w-full rounded-lg"
          controls
        />
        <div className="flex items-center gap-4 mt-4">
          <div>
            <label className="text-sm text-secondary">Start Time</label>
            <input
              type="number"
              value={startTime}
              onChange={(e) => setStartTime(parseFloat(e.target.value))}
              className="w-full bg-dark-grey rounded-md p-2 text-white"
              max={clip.duration}
              min={0}
            />
          </div>
          <div>
            <label className="text-sm text-secondary">End Time</label>
            <input
              type="number"
              value={endTime}
              onChange={(e) => setEndTime(parseFloat(e.target.value))}
              className="w-full bg-dark-grey rounded-md p-2 text-white"
              max={clip.duration}
              min={startTime}
            />
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="primary" onClick={onClose}>Cancel</Button>
          <Button variant="accentBrand" onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
};

export default TrimModal; 