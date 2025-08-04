import React, { useRef, useMemo } from 'react';
import { useTopZoraCoins, ZoraCoin } from '../../services/farcaster/zora';
import { SafeImage } from '../SafeImage/SafeImage';

interface ZoraCoinsListProps {
  className?: string;
}

const ZoraCoinsList: React.FC<ZoraCoinsListProps> = ({ className = '' }) => {
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
    return (
      <div
        key={`coin-${coin.id}-${index}`}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-grey hover:border-brand-highlight bg-card-light transition-colors cursor-pointer min-w-[280px] group"
        onClick={() => {
          // TODO: Navigate to coin details or open modal
          console.log('Clicked coin:', coin);
        }}
        tabIndex={0}
        role="button"
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            console.log('Clicked coin:', coin);
          }
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-10 h-10 flex-shrink-0">
            {coin.mediaContent?.previewImage?.small || coin.mediaContent?.originalUri ? (
              <SafeImage
                src={coin.mediaContent?.previewImage?.small || coin.mediaContent?.originalUri}
                alt={coin.name}
                className="rounded-full"
                width={40}
                height={40}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-highlight/20 rounded-full text-sm">
                {coin.symbol.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white truncate">{coin.name}</span>
              <span className="text-xs text-secondary/60 font-mono">{coin.symbol}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-secondary/60">
              <span>MC: {formatMarketCap(coin.marketCap)}</span>
              <span>24h: {formatVolume(coin.volume24h)}</span>
              <span>{coin.uniqueHolders} holders</span>
            </div>
          </div>
        </div>

        {/* Hover effect indicator */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-brand-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-brand-highlight">Top Zora Coins</h3>
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-sm text-secondary/60 hover:text-brand-highlight transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto"
      >
        {/* Two-row masonry layout with horizontal scroll */}
        <div className="grid grid-rows-2 gap-2 min-w-max" style={{
          gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(280px, auto)'
        }}>
          {coins.map((coin, index) => renderCoinCard(coin, index))}
        </div>
      </div>
    </div>
  );
};

export default ZoraCoinsList;