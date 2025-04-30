import { FC } from 'react';
import Link from 'next/link';
import { Account, Post, Repost } from '@lens-protocol/client';
import { getPostContentSubstring } from '@src/utils/utils';
import { ProfilePopper } from '@src/components/Profile/ProfilePopper';
import { ChatIcon, SwitchHorizontalIcon } from '@heroicons/react/outline';
import clsx from 'clsx';

interface TimelineItemInteractionsProps {
  reposts?: Repost[];
  comments?: Post[];
  position: 'top' | 'bottom';
  postData?: {
    presence?: {
      count: number;
      topUsers: Array<{
        handle: string;
        image: string;
        score: number;
      }>;
    }
  };
}

export const TimelineItemInteractions: FC<TimelineItemInteractionsProps> = ({ reposts, comments, position, postData }) => {
  const hasComments = comments && comments.length > 0;
  const hasReposts = reposts && reposts.length > 0;
  const hasPresence = !!postData?.presence?.topUsers?.length;

  if (!hasComments && !hasReposts && !hasPresence) return null;

  const lastComments = hasComments ? comments.slice(-2).reverse() : [];
  const maxDisplayedReposts = 3;
  const displayedReposts = hasReposts ? reposts.slice(0, maxDisplayedReposts) : [];

  // Only render reposts and presence at the top
  if (position === 'top' && (hasReposts || hasPresence)) {
    return (
      <div className="w-full overflow-hidden bg-clip-border animate-fade-in-down rounded-t-3xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.1] via-white/[0.025] to-transparent" />
        <div className="p-3 flex flex-col gap-2 relative">
          {/* Presence indicator */}
          {hasPresence && (
            <div className="flex items-center justify-end gap-2 text-white/60 mr-4">
              <div className="flex items-center gap-1">
                {postData.presence?.topUsers.slice(0, 3).map((user, index) => (
                  <img
                    key={user.handle}
                    src={user.image || "/default.png"}
                    alt={user.handle}
                    className="w-5 h-5 rounded-full border border-dark-grey"
                  />
                ))}
              </div>
              <span className="text-xs">
                {postData.presence?.count} viewing now
              </span>
            </div>
          )}

          {/* Reposts section */}
          {hasReposts && displayedReposts.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <SwitchHorizontalIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {displayedReposts.map((repost, index) => {
                    const username = repost.author.username?.localName;
                    const profile = repost.author;

                    return (
                      <div
                        key={index}
                        className="h-8 w-8 border-2 border-dark-grey rounded-full overflow-hidden relative"
                      >
                        <ProfilePopper profile={profile} followed={{}} setFollowed={() => {}}>
                          <Link
                            href={username ? `/profile/${username}` : '#'}
                            className={`block w-full h-full ${username ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <img
                              src={profile.metadata?.picture || "/default.png"}
                              alt={username || "profile"}
                              className="w-full h-full object-cover"
                            />
                          </Link>
                        </ProfilePopper>
                      </div>
                    );
                  })}
                </div>
                <p className="text-white/80 text-sm">
                  <span className="font-bold">{displayedReposts[0].author.username?.localName}</span>
                  {reposts.length > 1 && (
                    <span> and {reposts.length - 1} others</span>
                  )}
                  <span className="font-normal"> reposted</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Only render comments at the bottom
  if (position === 'bottom' && hasComments && lastComments.length > 0) {
    return (
      <div className="w-full overflow-hidden bg-clip-border animate-fade-in-up rounded-b-3xl relative">
        <div className="absolute inset-0 bg-gradient-to-t from-white/[0.1] via-white/[0.025] to-transparent" />
        <div className="relative">
          {lastComments.map((comment, index) => (
            <Link key={comment.slug} href={`/post/${comment.slug}`} className="block">
              <div className={clsx(
                "p-3 flex gap-3 cursor-pointer",
                index > 0 && "border-t border-white/[0.03]"
              )}>
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 border-2 border-dark-grey rounded-full overflow-hidden relative">
                    <ProfilePopper profile={comment.author} followed={{}} setFollowed={() => {}}>
                      <img
                        src={comment.author.metadata?.picture || "/default.png"}
                        alt={comment.author.username?.localName || "profile"}
                        className="w-full h-full object-cover"
                      />
                    </ProfilePopper>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <p className="text-white/80 text-sm">
                    <span className="font-bold">{comment.author.username?.localName}</span>
                    <span className="font-normal"> commented</span>
                  </p>
                  <p className="text-gray-300 text-sm">{getPostContentSubstring(comment.metadata?.content ?? '', 75)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return null;
};