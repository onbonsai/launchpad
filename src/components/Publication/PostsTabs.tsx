import { FC } from 'react';
import { cx } from '@src/utils/classnames';

export enum PostTabType {
  FOR_YOU = 'for_you',
  EXPLORE = 'explore',
  COLLECTED = 'collected',
}

interface PostsTabsProps {
  activeTab: PostTabType;
  onTabChange: (tab: PostTabType) => void;
  isAuthenticated?: boolean;
}

export const PostsTabs: FC<PostsTabsProps> = ({ activeTab, onTabChange, isAuthenticated }) => {
  return (
    <div className="flex space-x-8 mb-2">
      <button
        disabled={!isAuthenticated}
        onClick={() => onTabChange(PostTabType.FOR_YOU)}
        className={cx(
          'text-lg font-medium pb-2 transition-colors duration-200',
          activeTab === PostTabType.FOR_YOU
            ? 'text-[#5be39d] border-b-2 border-[#5be39d]'
            : 'text-white/60 hover:text-white'
        )}
      >
        For You
      </button>
      <button
        disabled={!isAuthenticated}
        onClick={() => onTabChange(PostTabType.COLLECTED)}
        className={cx(
          'text-lg font-medium pb-2 transition-colors duration-200',
          activeTab === PostTabType.COLLECTED
            ? 'text-[#5be39d] border-b-2 border-[#5be39d]'
            : 'text-white/60 hover:text-white'
        )}
      >
        Collected
      </button>
      <button
        onClick={() => onTabChange(PostTabType.EXPLORE)}
        className={cx(
          'text-lg font-medium pb-2 transition-colors duration-200',
          activeTab === PostTabType.EXPLORE
            ? 'text-[#5be39d] border-b-2 border-[#5be39d]'
            : 'text-white/60 hover:text-white'
        )}
      >
        Explore
      </button>
    </div>
  );
};