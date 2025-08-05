import React, { useRef, useMemo, useEffect } from 'react';
import { useTopZoraCoins, ZoraCoin } from '../../services/farcaster/zora';
import { Subtitle } from '@src/styles/text';

interface ZoraCoinsListProps {
  className?: string;
  onCoinSelect?: (coin: ZoraCoin) => void;
  selectedCoin?: ZoraCoin;
}

const ZoraCoinsList: React.FC<ZoraCoinsListProps> = ({ className = '', onCoinSelect, selectedCoin }) => {
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useTopZoraCoins();

  const coins = useMemo(() => {
    return data?.pages?.flatMap(page => page.coins) ?? [];
  }, [data]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle horizontal scroll pagination
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      const isNearEnd = scrollLeft + clientWidth >= scrollWidth - 50; // 50px threshold

      // Only fetch if we're near the end, have more pages, not currently fetching, and have some coins
      if (isNearEnd && hasNextPage && !isFetchingNextPage && coins.length > 0) {
        fetchNextPage();
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, coins.length]);

  const formatMarketCap = (marketCap: string) => {
    const num = parseFloat(marketCap);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatVolume = (volume: string) => {
    const num = parseFloat(volume);
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(2);
  };

    const renderCoinCard = (coin: ZoraCoin, index: number) => {
    const isSelected = selectedCoin?.id === coin.id;
    const coinImage = coin.mediaContent?.previewImage?.small || coin.mediaContent?.originalUri;

    return (
      <div
        key={`coin-${coin.id}-${index}`}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-lg border ${
          isSelected
            ? "border-brand-highlight"
            : "border-dark-grey hover:border-brand-highlight"
        } transition-colors cursor-pointer min-w-[200px] group overflow-hidden flex-shrink-0 w-auto`}
        onClick={() => {
          if (onCoinSelect) {
            onCoinSelect(coin);
          }
        }}
        tabIndex={0}
        role="button"
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (onCoinSelect) {
              onCoinSelect(coin);
            }
          }
        }}
      >
        <div className="relative flex items-center gap-3 flex-1">
          <div className="w-12 h-12 flex-shrink-0">
            {coin.mediaContent?.previewImage?.small || coin.mediaContent?.originalUri ? (
              <img
                src={coin.mediaContent?.previewImage?.small || coin.mediaContent?.originalUri}
                alt={coin.name}
                className="rounded-full"
                width={48}
                height={48}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-highlight/20 rounded-full text-base">
                {coin.symbol.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {/* <span className="text-base font-medium text-white">{coin.name}</span> */}
              <span className="text-base font-semibold text-white whitespace-nowrap">{coin.symbol}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/80 whitespace-nowrap">
              <span>MC: {formatMarketCap(coin.marketCap)}</span>
              <span>24h: {formatVolume(coin.volume24h)}</span>
              {/* <span>{coin.uniqueHolders} holders</span> */}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className={`text-red-400 text-sm ${className}`}>
        Failed to load Zora coins: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (isLoading && coins.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-highlight"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <Subtitle className="!text-brand-highlight mb-2 text-2xl">Remix a trending Base coin</Subtitle>
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto"
      >
        {/* Two-row masonry layout with horizontal scroll */}
        <div className="flex flex-col h-40 gap-2 min-w-max">
          {/* First row */}
          <div className="flex gap-2 flex-1">
            {coins.filter((_, index) => index % 2 === 0).map((coin, index) => renderCoinCard(coin, index * 2))}
            {/* Loading spinner for first row */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center min-w-[60px]">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-highlight"></div>
              </div>
            )}
          </div>

          {/* Second row */}
          <div className="flex gap-2 flex-1">
            {coins.filter((_, index) => index % 2 === 1).map((coin, index) => renderCoinCard(coin, index * 2 + 1))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoraCoinsList;