import { MobileViewSelector } from './MobileViewSelector';
import { logout as lensLogout, resumeSession } from "@src/hooks/useLensLogin";
import { Subtitle, BodySemiBold } from "@src/styles/text";
import { SITE_URL } from "@src/constants/constants";
import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import { erc20Abi } from "viem";
import { last } from "lodash/array";
import Image from "next/image";
import Link from "next/link";

import { Modal } from "@src/components/Modal";
import { Button } from "@src/components/Button";
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
import ListItemCard from "@src/components/Shared/ListItemCard";
import ProfileHoldings from "./ProfileHoldings";
import { BONSAI_TOKEN_BASE_ADDRESS, CONTRACT_CHAIN_ID } from "@src/services/madfi/moneyClubs";
import { useGetBonsaiNFTs } from "@src/hooks/useGetBonsaiNFTs";
import { getProfileImage } from '@src/services/lens/utils';
import { useProfileWithSession } from '@src/hooks/useProfileWithSession';
import { FollowButton } from '@src/components/Profile/FollowButton';
import { useFollowersYouKnow } from '@src/hooks/useFollowersYouKnow';
import { FollowersYouKnow } from '@src/components/Profile/FollowersYouKnow';
import { getAccountStats } from "@src/services/lens/getStats";
import toast from 'react-hot-toast';
import { useSIWE } from 'connectkit';
import { Tabs } from '@src/components/Profile/Tabs';

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
  const {
    query: {
      openModal: openSubModalOnPageLoad,
      source: referralSource,
      invite: openInviteModal,
    },
  } = useRouter();
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
  const [openTab, setOpenTab] = useState<number>(type === "lens" ? 1 : 5);
  const [mobileView, setMobileView] = useState('profile');

  const { profileData, isLoading: isLoadingProfile, refetch } = useProfileWithSession(profile?.username?.localName);

  const { data: bonsaiBalance, isLoading: isLoadingBalance } = useReadContract({
    address: BONSAI_TOKEN_BASE_ADDRESS,
    abi: erc20Abi,
    chainId: CONTRACT_CHAIN_ID,
    functionName: 'balanceOf',
    args: [profile?.owner.toLowerCase()],
    query: { enabled: !!address }
  });

  const hasBenefits = bonsaiBalance ? bonsaiBalance > BigInt(100_000) : false;

  // for admin stuff directly related to lens (create post, decrypt)
  const isProfileAdmin = useMemo(() => {
    if (!authenticatedProfileId) return false;

    return profile?.owner === authenticatedProfile?.owner;
  }, [profile, authenticatedProfile]);

  const { followers: followersYouKnow, isLoading: isLoadingFollowers } = useFollowersYouKnow(
    authenticatedProfile?.address || '',
    profile?.owner || ''
  );

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

  const profilePicture = () => {
    // if (isFarcasterProfile(profile)) {
    //   return profile.profileImage;
    // }
    return getProfileImage(profile.metadata?.picture)
  };

  const coverImage = () => {
    // if (isFarcasterProfile(profile)) {
    //   return profile.coverImageURI;
    // }
    return profile.metadata?.coverPicture
  }

  const userBio = () => {
    // if (isFarcasterProfile(profile)) {
    //   return profile.profileBio;
    // }
    return profile.metadata?.bio;
  }

  const userHandle = () => {
    // if (isFarcasterProfile(profile)) {
    //   return profile.profileHandle;
    // }
    return profile.username.localName;
  }

  const displayName = () => {
    // if (isFarcasterProfile(profile)) {
    //   return profile.profileDisplayName;
    // }
    return profile.metadata?.name;
  }

  const followingCount = () => {
    return accountStats?.graphFollowStats?.following ?? 0;
  };

  const followerCount = () => {
    return accountStats?.graphFollowStats?.followers ?? 0;
  };

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
    <div className="bg-background text-secondary min-h-full flex flex-col flex-grow min-w-screen">
      <main className="lg:mx-auto max-w-full md:max-w-[2160px] px-4 sm:px-6 lg:px-8 min-h-full flex flex-col flex-grow">
        <MobileViewSelector activeView={mobileView} setActiveView={setMobileView} />
        <section aria-labelledby="dashboard-heading" className="py-6 max-w-full h-full flex flex-col flex-grow">
          <div className="grid grid-cols-1 gap-x-2 gap-y-10 lg:grid-cols-12 max-w-full h-full flex-grow">
            <div className={`col-span-full lg:col-span-3 h-full ${mobileView === 'profile' ? 'block' : 'hidden lg:block'
              }`}>
              <div className={`z-20 flex bottom-0 top-0 h-full md:top-0 w-full flex-col transition-transform bg-black md:bg-cardBackground rounded-3xl relative min-h-full flex-grow`}>
                <div className="py-4 h-full">
                  <div
                    className='absolute top-0 left-0 w-full h-[112px] z-[-2] rounded-t-3xl'
                    style={{
                      backgroundImage: `url(${coverImage() || '/bg.jpg'})`,
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
                        <Image
                          src={profilePicture()}
                          alt="pfp"
                          width={80}
                          height={80}
                          className="bg-[#ffffff] rounded-[20px]"
                          role="img"
                          aria-label="pfp"
                          unoptimized={true}
                        />
                      </div>
                      <h2 className="mt-[16px] mb-2 font-semibold text-[#ffffff] text-[32px] leading-[1.125]">{displayName()}</h2>
                      <Subtitle>@{userHandle()}</Subtitle>
                      {profileData?.operations?.isFollowingMe && (
                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-sm">
                          <span className="text-xs font-medium text-white">Follows you</span>
                        </div>
                      )}
                      <a href={`${SITE_URL}/profile/${userHandle()}`} target="_blank" rel="noreferrer" className="text-[#ffffff] opacity-60 hover:opacity-50 text-[16px] leading-tight cursor-pointer mt-[2px]">{profile.handle?.suggestedFormatted.localName}</a>
                      <p className="text-[#ffffff] text-[16px] leading-tight font-light mt-8">
                        {userBio()}
                      </p>
                      <div className='mt-5 flex flex-col gap-5'>
                        <div className='flex gap-5'>
                          <div className='flex flex-col gap-[2px] gap-y-2'>
                            <Subtitle>Following</Subtitle>
                            <BodySemiBold>{followingCount() ?? 0}</BodySemiBold>
                          </div>
                          <div className='flex flex-col gap-[2px] gap-y-2'>
                            <Subtitle>Followers</Subtitle>
                            <BodySemiBold>{followerCount() ?? 0}</BodySemiBold>
                          </div>
                        </div>

                        {/* Add the FollowersYouKnow component */}
                        {!isLoadingFollowers && followersYouKnow.length > 0 && (
                          <FollowersYouKnow
                            followers={followersYouKnow}
                            className="mt-2"
                          />
                        )}
                      </div>
                      {/* {isProfileAdmin && hasBenefits && !isLoadingBalance && (
                        <div className="rounded-xl p-3 pt-2 w-full bg-card mt-8">
                          <BodySemiBold>Active Bonsai NFT Perks</BodySemiBold>
                          <span className="text-base gap-[6px] flex flex-col mt-2 flex-grow w-full">
                            <ListItemCard items={[
                              "0% fees on bonding curves",
                              "0% fees on Uni v4 pools",
                              <>
                                Access to the{" "}<Link href="https://orb.club/c/bonsairooftop" passHref target="_blank">
                                  <span className="link link-hover">Rooftop Club</span>
                                </Link>{" "}on Orb
                              </>
                            ]} />
                          </span>
                        </div>
                      )} */}
                      {/* Show follow button if not admin */}
                      {!isProfileAdmin && (
                        <FollowButton
                          isFollowing={!!profileData?.operations?.isFollowedByMe}
                          onFollowClick={handleFollowClick}
                          disabled={!isConnected || !isAuthenticated || isLoadingProfile}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              {/* <CreatorsTabs
                  type={type}
                  setOpenTab={setOpenTab}
                  openTab={openTab}
                  rewardsEnabled={rewardsEnabled}
                  hasTrades={!!moneyClub?.trades?.length}
                /> */}

              <div className="flex flex-col flex-grow min-h-0">
                <div className={`lg:col-span-3 ${mobileView === 'feed' ? 'mx-auto block' : 'hidden lg:block'}`}>
                  <div className="mb-4">
                    <Tabs openTab={openTab} setOpenTab={setOpenTab} />
                  </div>
                  <PublicationFeed
                    openTab={openTab}
                    creatorProfile={profile}
                    isProfileAdmin={isProfileAdmin}
                    returnToPage={`u/${profile.handle?.localName || profile.profileHandle}`}
                  />
                </div>
              </div>
            </div>

            <div className={`lg:col-span-3 h-full ${mobileView === 'holdings' ? 'block' : 'hidden lg:block'
              }`}>
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
