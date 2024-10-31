import { Subtitle, BodySemiBold } from "@src/styles/text";
import { Account } from "@lens-protocol/client";
import { FollowButton } from '@src/components/Profile/FollowButton';
import { useAccount, useWalletClient } from "wagmi";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { resumeSession } from "@src/hooks/useLensLogin";
import { followProfile, unfollowProfile } from "@src/services/lens/follow";
import toast from "react-hot-toast";
import { SafeImage } from "../SafeImage/SafeImage";

interface ProfilePopperContentProps {
  profile: Account;
  isProfileAdmin?: boolean;
  isConnected?: boolean;
  isAuthenticated?: boolean;
  followed: Record<string, boolean>;
  setFollowed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const ProfilePopperContent = ({ profile, isProfileAdmin, followed, setFollowed }: ProfilePopperContentProps) => {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isAuthenticated } = useLensSignIn(walletClient);
  const isFollowedByMe = followed[profile.address] ?? profile?.operations?.isFollowedByMe;

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const sessionClient = await resumeSession();
      if (isFollowedByMe) {
        await unfollowProfile(sessionClient, profile.address);
        setFollowed(prev => ({...prev, [profile.address]: false}));
        toast('Unfollowed');
      } else {
        await followProfile(sessionClient, profile.address);
        setFollowed(prev => ({...prev, [profile.address]: true}));
        toast.success('Followed');
      }

    } catch (error) {
      console.error('Failed:', error);
    }
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-dark-grey shadow-xl w-[320px] z-50">
      <div className="py-3 h-full relative">
        <div className='px-3 flex flex-col justify-between items-start h-full relative z-10'>
          <div className='w-full space-y-4'>
            <div className="flex justify-between items-center w-full">
              <div className="flex flex-col">
                <SafeImage
                  src={profile.metadata?.picture || "/default.webp"}
                  alt="pfp"
                  width={60}
                  height={60}
                  className="bg-white/10 rounded-xl border-2 border-dark-grey"
                  unoptimized={true}
                />
              </div>
              {/* TODO */}
              {/* {!isProfileAdmin && (
                <FollowButton
                  isFollowing={!!isFollowedByMe}
                  onFollowClick={handleFollowClick}
                  disabled={!isConnected || !isAuthenticated}
                />
              )} */}
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl leading-tight font-semibold text-white">
                {profile.metadata?.name}
              </h2>

              <div className="flex items-center gap-2">
                <Subtitle className="text-sm">@{profile.username?.localName}</Subtitle>
                {profile.operations?.isFollowingMe && (
                  <div className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-sm">
                    <span className="text-[10px] font-medium text-white">Follows you</span>
                  </div>
                )}
              </div>

              {profile.metadata?.bio && (
                <p className="text-white/80 text-xs leading-snug pt-2">
                  {profile.metadata.bio.length > 80
                    ? `${profile.metadata.bio.substring(0, 80)}...`
                    : profile.metadata.bio}
                </p>
              )}
            </div>

            {/* TODO */}
            {/* <div className="flex gap-4">
              <div className="flex flex-col gap-0.5 gap-y-1">
                <Subtitle className="text-xs">Following</Subtitle>
                <BodySemiBold className="text-sm">{profile.stats?.following ?? 0}</BodySemiBold>
              </div>
              <div className="flex flex-col gap-0.5">
                <Subtitle className="text-xs">Followers</Subtitle>
                <BodySemiBold className="text-sm">{profile.stats?.followers ?? 0}</BodySemiBold>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};