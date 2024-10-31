import { Subtitle, BodySemiBold } from "@src/styles/text";
import { FollowButton } from '@src/components/Profile/FollowButton';
import { FollowersYouKnow } from "./FollowersYouKnow";
import { Account } from "@lens-protocol/client";
import { SafeImage } from "../SafeImage/SafeImage";
import { Button } from '../Button';

interface ProfileContainerProps {
  profile: Account;
  isProfileAdmin?: boolean;
  onFollowClick?: () => void;
  followersYouKnow?: any[];
  isLoadingFollowers?: boolean;
  isConnected?: boolean;
  isAuthenticated?: boolean;
  isLoadingProfile?: boolean;
  following?: number;
  followers?: number;
  onEditClick: () => void;
}

export const ProfileContainer = ({
  profile,
  isProfileAdmin = false,
  onFollowClick,
  followersYouKnow = [],
  isLoadingFollowers = false,
  isConnected = false,
  isAuthenticated = false,
  isLoadingProfile = false,
  following,
  followers,
  onEditClick,
}: ProfileContainerProps) => {
  if (!profile?.metadata) return null;
  return (
    <div>
      <div className="py-4 h-full">
        <div
          className="absolute top-0 left-0 w-full h-[112px] z-[-2] rounded-t-3xl"
          style={{
            backgroundImage: `url(${profile.metadata?.coverPicture || '/bg.jpg'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div
          className='absolute top-0 left-0 w-full h-[112px] z-[-1]'
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.9))',
          }}
        />
        <div className='px-4 flex flex-col justify-between items-start h-full'>
          <div className='w-full'>
            <div className="flex flex-col">
              <SafeImage
                src={profile.metadata?.picture || "/default.webp"}
                alt={profile?.metadata?.name || 'Profile picture'}
                width={96}
                height={96}
                className="rounded-full h-24 w-24"
                aria-label="Profile picture"
                unoptimized
              />
            </div>
            <div className="mt-6 flex justify-between items-center w-full">
              <h2 className="font-semibold text-[#ffffff] text-[32px] leading-[1.125]">{profile.metadata?.name}</h2>
              {!isProfileAdmin && onFollowClick && isAuthenticated && (
                <FollowButton
                  isFollowing={!!profile.operations?.isFollowedByMe}
                  onFollowClick={onFollowClick}
                  disabled={isLoadingProfile}
                />
              )}
            </div>
            <span
              className="text-[#ffffff] opacity-60 text-[16px] leading-tight mt-[2px]"
            >
              @{profile.username?.localName}
            </span>
            {profile.operations?.isFollowingMe && (
              <div className="mt-2 ml-4 inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-sm">
                <span className="text-xs font-medium text-white">Follows you</span>
              </div>
            )}
            {profile.metadata?.bio && (
              <p className="text-[#ffffff] text-[16px] leading-tight font-light mt-8">
                {profile.metadata.bio}
              </p>
            )}
            {isProfileAdmin && (
              <div className="my-4">
                <Button onClick={onEditClick} variant="primary" className="w-fit" size="sm">
                  Edit Profile
                </Button>
              </div>
            )}
            <div className='mt-5 flex flex-col gap-5'>
              <div className='flex gap-5'>
                <div className='flex flex-col gap-[2px] gap-y-2'>
                  <Subtitle>Following</Subtitle>
                  <BodySemiBold>{following?.toLocaleString() ?? 0}</BodySemiBold>
                </div>
                <div className='flex flex-col gap-[2px] gap-y-2'>
                  <Subtitle>Followers</Subtitle>
                  <BodySemiBold>{followers?.toLocaleString() ?? 0}</BodySemiBold>
                </div>
              </div>

              {/* Add the FollowersYouKnow component */}
              {!isProfileAdmin && !isLoadingFollowers && followersYouKnow.length > 0 && (
                <FollowersYouKnow
                  followers={followersYouKnow}
                  className="mt-2"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};