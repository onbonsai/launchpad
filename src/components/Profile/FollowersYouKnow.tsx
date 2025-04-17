import { FC } from 'react';
import Image from 'next/image';
import { getProfileImage } from '@src/services/lens/utils';

interface FollowersYouKnowProps {
  followers: any[];
  className?: string;
}

export const FollowersYouKnow: FC<FollowersYouKnowProps> = ({ followers, className = '' }) => {
  if (!followers.length) return null;

  const displayedFollowers = followers.slice(0, 3);
  const remainingCount = Math.max(0, followers.length - 3);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-sm text-gray-500">Followers you know</span>
      <div className="flex items-center">
        <div className="flex -space-x-3">
          {displayedFollowers.map((follower, index) => (
            <div
              key={index}
              className="relative rounded-full border-2 border-black overflow-hidden w-8 h-8"
            >
              <Image
                src={getProfileImage(follower.follower) || '/default-avatar.png'}
                alt={follower.follower.username?.localName || 'follower'}
                width={32}
                height={32}
                className="rounded-full"
              />
            </div>
          ))}
        </div>
        <div className="ml-3 text-sm">
          <span>
            {displayedFollowers
              .filter(f => f.follower.username?.localName)
              .map((f, index, arr) => (
                <>
                  <a 
                    href={`/profile/${f.follower.username?.localName}`}
                    className="hover:underline"
                  >
                    {f.follower.username?.localName}
                  </a>
                  {index < arr.length - 1 && ', '}
                </>
              ))}
            {remainingCount > 0 && ` and ${remainingCount} others`}
          </span>
        </div>
      </div>
    </div>
  );
}; 