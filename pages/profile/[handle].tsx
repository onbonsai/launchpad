import { MobileViewSelector } from './MobileViewSelector';
import { resumeSession } from "@src/hooks/useLensLogin";
import { GetServerSideProps, NextPage } from "next";
import { useMemo, useState, useEffect } from "react";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import { erc20Abi } from "viem";
import { last } from "lodash/array";

import { Modal } from "@src/components/Modal";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { followProfile, unfollowProfile } from "@src/services/lens/follow";
import { getProfileByHandle } from "@src/services/lens/getProfiles";
import useLensSignIn from "@src/hooks/useLensSignIn";
import useIsMounted from "@src/hooks/useIsMounted";
import { getClientWithCreatorInfo } from "@src/services/mongo/client";
import PublicationFeed from "@src/components/Profile/PublicationFeed";
import LoginWithLensModal from "@src/components/Lens/LoginWithLensModal";
// import { FarcasterProfile } from "@src/services/farcaster/types";
import useIsFollowed from "@src/hooks/useIsFollowed";
import ProfileHoldings from "./ProfileHoldings";
import { BONSAI_TOKEN_BASE_ADDRESS, CONTRACT_CHAIN_ID } from "@src/services/madfi/moneyClubs";
import { useGetBonsaiNFTs } from "@src/hooks/useGetBonsaiNFTs";
import { useProfileWithSession } from '@src/hooks/useProfileWithSession';
import { useFollowersYouKnow } from '@src/hooks/useFollowersYouKnow';
import toast from 'react-hot-toast';
import { useSIWE } from 'connectkit';
import { Tabs } from '@src/components/Profile/Tabs';
import { ProfileContainer } from "@src/components/Profile/ProfileContainer";
import { Account } from '@lens-protocol/client';
import { getAccountStats } from '@src/services/lens/getStats';
import { EditProfileModal } from '@src/components/Profile/EditProfileModal';
import { useRouter } from 'next/router';

interface CreatorPageProps {
  profile: any;
  type: "lens" | "farcaster" | "ens";
  airdrops: any[];
  creatorInfo: any;
  allSocials?: { data: any[]; commonUserAssociatedAddresses: string[]; error?: any };
  accountStats?: {
    graphFollowStats: {
      followers: number;
      following: number;
    };
    feedStats: {
      posts: number;
      quotes: number;
    };
  };
}

const profileAddress = (profile, creatorInfoAddress?: string) =>
  creatorInfoAddress ||
  profile?.owner ||
  (profile?.userAssociatedAddresses?.length ? last(profile?.userAssociatedAddresses) : null) ||
  profile?.address;

const CreatorPage: NextPage<CreatorPageProps> = ({
  profile,
  airdrops,
  creatorInfo,
  type,
  allSocials,
  accountStats,
}: CreatorPageProps) => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { isReady: ready } = useSIWE();
  const {
    // signInWithLens,
    signingIn,
    isAuthenticated,
    authenticatedProfileId,
    authenticatedProfile,
    // authenticatedLensClient,
  } = useLensSignIn(walletClient);
  const { data: isFollowedResponse } = useIsFollowed(authenticatedProfileId, profile?.id)
  const { canFollow, isFollowed: _isFollowed } = isFollowedResponse || {};
  const { data: bonsaiNFTs } = useGetBonsaiNFTs(profileAddress(profile, creatorInfo?.address));

  const [openSignInModal, setOpenSignInModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [openTab, setOpenTab] = useState<number>(type === "lens" ? 1 : 5);
  const [mobileView, setMobileView] = useState('profile');

  const { profileData, isLoading: isLoadingProfile, refetch } = useProfileWithSession(profile?.username?.localName, isAuthenticated);

  const { data: bonsaiBalance, isLoading: isLoadingBalance } = useReadContract({
    address: BONSAI_TOKEN_BASE_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [profile?.owner.toLowerCase()],
    query: { enabled: !!address }
  });

  // for admin stuff directly related to lens (create post, decrypt)
  const isProfileAdmin = useMemo(() => {
    // if (!authenticatedProfileId) return false;

    return profile?.owner === authenticatedProfile?.owner;
  }, [profile, authenticatedProfile]);

  const { followers: followersYouKnow, isLoading: isLoadingFollowers } = useFollowersYouKnow(
    authenticatedProfile?.address || '',
    profile?.address || ''
  );

  // Check for settings query parameter to auto-open edit modal
  useEffect(() => {
    const { settings } = router.query;
    if (!!settings && isProfileAdmin) {
      setIsEditModalOpen(true);
    }
  }, [router.query]);

  if (!isMounted) return null;

  if (!ready)
    return (
      <div className="bg-background text-secondary min-h-[50vh]">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-28 pb-4">
          <div className="flex justify-center">
            <Spinner customClasses="h-6 w-6" color="#5be39d" />
          </div>
        </main>
      </div>
    );

  // function isFarcasterProfile(profile: ProfileFragment | FarcasterProfile): profile is FarcasterProfile {
  //   return (profile as FarcasterProfile).profileHandle !== undefined;
  // }

  const handleFollowClick = async () => {
    if (!isConnected || !isAuthenticated) {
      setOpenSignInModal(true);
      return;
    }

    try {
      const sessionClient = await resumeSession();
      if (profileData?.operations?.isFollowedByMe) {
        await unfollowProfile(sessionClient, profile.address);
      } else {
        await followProfile(sessionClient, profile.address);
      }

      // Refetch profile data to update follow status
      setTimeout(() => {
        refetch();
      }, 2000);

      toast.success(profileData?.operations?.isFollowedByMe ? 'Unfollowed successfully' : 'Followed successfully');

    } catch (error) {
      console.error('Failed to follow/unfollow:', error);
    }
  };

  return (
    <div className="bg-background text-secondary min-h-full flex flex-col flex-grow">
      <main className="lg:mx-auto max-w-full md:max-w-[2160px] px-4 sm:px-6 lg:px-8 min-h-full flex flex-col flex-grow">
        <MobileViewSelector activeView={mobileView} setActiveView={setMobileView} />
        <section aria-labelledby="dashboard-heading" className="py-2 lg:py-6 max-w-full h-full flex flex-col flex-grow">
          <div className="grid grid-cols-1 gap-x-2 gap-y-4 lg:gap-y-10 lg:grid-cols-12 max-w-full h-full flex-grow">
            <div className={`col-span-full lg:col-span-3 h-full ${mobileView === 'profile' ? 'block' : 'hidden lg:block'}`}>
              <div className={`z-20 flex bottom-0 top-0 h-full md:top-0 w-full flex-col transition-transform bg-black md:bg-cardBackground rounded-3xl relative min-h-full flex-grow`}>
                <ProfileContainer
                  profile={isAuthenticated ? profileData as Account : profile}
                  isProfileAdmin={isProfileAdmin}
                  onFollowClick={handleFollowClick}
                  onEditClick={() => setIsEditModalOpen(true)}
                  followersYouKnow={followersYouKnow}
                  isLoadingFollowers={isLoadingFollowers}
                  isConnected={isConnected}
                  isAuthenticated={isAuthenticated}
                  isLoadingProfile={isLoadingProfile}
                  following={accountStats?.graphFollowStats?.following}
                  followers={accountStats?.graphFollowStats?.followers}
                />
              </div>
            </div>

            <div className="lg:col-span-6 h-full">
              <div className="flex flex-col flex-grow min-h-0 w-full h-full">
                <div className={`w-full h-full ${mobileView === 'feed' ? 'block' : 'hidden lg:block'}`}>
                  <PublicationFeed
                    openTab={openTab}
                    creatorProfile={profile}
                    isProfileAdmin={isProfileAdmin}
                    returnToPage={`u/${profile.handle?.localName || profile.profileHandle}`}
                    setOpenTab={setOpenTab}
                  />
                </div>
              </div>
            </div>

            <div className={`lg:col-span-3 h-full ${mobileView === 'holdings' ? 'block' : 'hidden lg:block'}`}>
              <ProfileHoldings isProfileAdmin={isProfileAdmin} address={profileAddress(profile, creatorInfo?.address)} bonsaiAmount={bonsaiBalance ?? BigInt(0)} nfts={bonsaiNFTs ?? []} />
            </div>
          </div>
        </section>
      </main>

      {/* Login Modal */}
      <Modal
        onClose={() => setOpenSignInModal(false)}
        open={openSignInModal}
        setOpen={setOpenSignInModal}
        panelClassnames="bg-card w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <LoginWithLensModal closeModal={() => setOpenSignInModal(false)} />
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        onClose={() => setIsEditModalOpen(false)}
        open={isEditModalOpen}
        setOpen={setIsEditModalOpen}
        panelClassnames="bg-card w-screen h-screen md:h-full md:w-[60vw] lg:w-[40vw] p-4 text-secondary"
      >
        <EditProfileModal 
          profile={profileData as Account} 
          closeModal={() => setIsEditModalOpen(false)}
          onProfileUpdate={() => {
            refetch();
          }}
        />
      </Modal>
    </div>
  );
};

export default CreatorPage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    query: { handle },
  } = context;

  if (typeof handle !== "string") {
    throw new Error("Handle must be a string.");
  }

  if (handle) {
    try {
      const [profile, accountStats] = await Promise.all([
        getProfileByHandle(handle),
        getAccountStats(handle)
      ]);

      if (profile?.owner) {
        const { collection } = await getClientWithCreatorInfo();
        const creatorInfo = await collection.findOne(
          { address: profile.owner.toLowerCase() },
          { projection: { _id: 0 } },
        );

        return {
          props: {
            profile,
            accountStats,
            type: "lens",
            pageName: "profile",
            creatorInfo: creatorInfo || null,
            allSocials: {},
          },
        };
      }

      // not found
      return {
        redirect: {
          permanent: false,
          destination: "/",
        },
      };
    } catch (error) {
      console.log(error);
    }
  }

  return { props: {} };
};
