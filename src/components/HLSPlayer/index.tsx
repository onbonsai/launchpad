
import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HLSPlayerProps {
  src: string;
  [key: string]: any; // Allow other video props
}

const HLSPlayer: React.FC<HLSPlayerProps> = ({ src, ...props }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(error => console.error("Autoplay was prevented:", error));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(error => console.error("Autoplay was prevented:", error));
        });
      }
    }
  }, [src]);

  return <video ref={videoRef} {...props} />;
};

export default HLSPlayer;
