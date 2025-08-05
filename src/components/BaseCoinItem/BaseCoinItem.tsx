import React from 'react';
import { Coin } from '@src/services/farcaster/tbd';
import Image from 'next/image';

interface BaseCoinItemProps {
  coin: Coin;
  onClick?: (coin: Coin) => void;
}

export const BaseCoinItem: React.FC<BaseCoinItemProps> = ({ coin, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(coin);
    }
  };

  const getMediaContent = () => {
    // Prioritize video content first, then images
    if (coin.media_animationUrl) {
      return (
        <video
          className="w-full h-full object-cover rounded-lg"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={coin.media_animationUrl} type="video/mp4" />
        </video>
      );
    }
    
    if (coin.media_contentUri && coin.media_contentMime?.startsWith('video/')) {
      return (
        <video
          className="w-full h-full object-cover rounded-lg"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={coin.media_contentUri} type={coin.media_contentMime} />
        </video>
      );
    }

    if (coin.media_image) {
      return (
        <Image
          src={coin.media_image}
          alt={coin.name || coin.symbol}
          className="w-full h-full object-cover rounded-lg"
          width={100}
          height={100}
        />
      );
    }

    if (coin.media_contentUri) {
      return (
        <Image
          src={coin.media_contentUri}
          alt={coin.name || coin.symbol}
          className="w-full h-full object-cover rounded-lg"
          width={100}
          height={100}
        />
      );
    }

    // Fallback placeholder
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
        <span className="text-4xl font-bold text-white">{coin.symbol.charAt(0)}</span>
      </div>
    );
  };

  return (
    <div
      className="bg-card rounded-lg overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      {/* Media Content */}
      <div className="relative aspect-square w-full">
        {getMediaContent()}
        
        {/* Coin symbol badge overlay */}
        <div className="absolute top-2 right-2">
          <span className="text-white font-bold text-sm bg-black/70 px-2 py-1 rounded-full">
            ${coin.symbol}
          </span>
        </div>
      </div>

      {/* Card Content Below Media */}
      <div className="p-3">
        {/* Coin Symbol */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-bold text-lg">
            {coin.symbol}
          </span>
        </div>

        {/* Cast Text */}
        {coin.cast_text && (
          <p className="text-white/80 text-sm line-clamp-3 leading-relaxed">
            {coin.cast_text}
          </p>
        )}
      </div>
    </div>
  );
};

export default BaseCoinItem;