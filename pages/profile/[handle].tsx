import { logout as lensLogout } from "@src/hooks/useLensLogin";
import { Subtitle, BodySemiBold } from "@src/styles/text";
import { MADFI_CLUBS_URL } from "@src/constants/constants";
import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-hot-toast";
import { getAddress } from "viem";
import { ProfileFragment } from "@lens-protocol/client";
import dynamic from "next/dynamic";
import { usePrivy } from "@privy-io/react-auth";
import { last } from "lodash/array";
import { useLogout } from '@privy-io/react-auth';

import { Modal } from "@src/components/Modal";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { followProfile } from "@src/services/lens/follow";
import { getProfileByHandle } from "@src/services/lens/getProfiles";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { IS_PRODUCTION } from "@src/constants/constants";
import useIsMounted from "@src/hooks/useIsMounted";
import { useGetGatedPosts } from "@src/hooks/useGetGatedPosts";
import { getClientWithCreatorInfo } from "@src/services/mongo/client";
import CreatePost, { LivestreamConfig } from "@src/components/Creators/CreatePost";
import PublicationFeed from "@src/components/Publication/PublicationFeed";
import LoginWithLensModal from "@src/components/Lens/LoginWithLensModal";
import { useRegisteredClub } from "@src/hooks/useMoneyClubs";
import { FarcasterProfile } from "@src/services/farcaster/types";
import useIsFollowed from "@src/hooks/useIsFollowed";
import Image from "next/image";

const CreateSpaceModal = dynamic(() => import("@src/components/Creators/CreateSpaceModal"));

interface CreatorPageProps {
  profile: ProfileFragment | FarcasterProfile;
  type: "lens" | "farcaster" | "ens";
  airdrops: any[];
  creatorInfo: any;
  allSocials?: { data: any[]; commonUserAssociatedAddresses: string[]; error?: any };
}

const profileAddress = (profile, creatorInfoAddress?: string) =>
  creatorInfoAddress ||
  profile?.ownedBy?.address ||
  (profile?.userAssociatedAddresses?.length ? last(profile?.userAssociatedAddresses) : null) ||
  profile?.address;

const CreatorPage: NextPage<CreatorPageProps> = ({
  profile,
  airdrops,
  creatorInfo,
  type,
  allSocials,
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
  const { ready } = usePrivy();
  const {
    // signInWithLens,
    signingIn,
    isAuthenticated,
    authenticatedProfileId,
    authenticatedProfile,
    // authenticatedLensClient,
  } = useLensSignIn(walletClient);
  const { refetch: fetchGatedPosts } = useGetGatedPosts(profile?.id);
  const { data: moneyClub, isLoading: isLoadingMoneyClub } = useRegisteredClub(
    profile?.handle?.localName || profile.profileHandle,
  );
  const { data: isFollowedResponse } = useIsFollowed(authenticatedProfileId, profile?.id)
  const { canFollow, isFollowed: _isFollowed } = isFollowedResponse || {};
  const [isFollowed, setIsFollowed] = useState(_isFollowed);

  const [createSpaceModal, setCreateSpaceModal] = useState(false);
  const [openSignInModal, setOpenSignInModal] = useState(false);
  const [openTab, setOpenTab] = useState<number>(type === "lens" ? 1 : 5);
  const [livestreamConfig, setLivestreamConfig] = useState<LivestreamConfig | undefined>();
  const [welcomeToast, setWelcomeToast] = useState(false);

  const {
    fullRefetch,
  } = useLensSignIn(walletClient);
  
  const { logout } = useLogout({
    onSuccess: () => {
      if ((!!authenticatedProfile?.id)) {
        lensLogout();
        fullRefetch() // invalidate cached query data
      }
    },
  })

  // for admin stuff unrelated to lens (ex: livestreams)
  const isCreatorAdmin = useMemo(() => {
    if (!(profile?.ownedBy && address)) return false;

    return getAddress(profileAddress(profile, creatorInfo?.address)) === getAddress(address);
  }, [profile, address]);

  // for admin stuff directly related to lens (create post, decrypt)
  const isProfileAdmin = useMemo(() => {
    if (!authenticatedProfileId) return false;

    return profile?.id === authenticatedProfileId;
  }, [profile, authenticatedProfileId]);

  const onFollowClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (type === "farcaster") {
      window.open(`https://warpcast.com/${profile.username}`, "_blank");
      return;
    }

    if (!isAuthenticated) return;

    const toastId = toast.loading("Following...");
    try {
      await followProfile(walletClient, (profile as ProfileFragment).id);
      setIsFollowed(true);
      toast.success("Followed", { id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Unable to follow", { id: toastId });
    }
  };

  const isLoadingPage = useMemo(() => {
    return !ready;
  }, [isConnected, ready]);

  useEffect(() => {
    if (isMounted && !isLoadingPage && !welcomeToast) {
      if (referralSource === "p00ls") {
        toast(
          `Welcome! As a P00LS token creator, you can create gated posts so only your token holders can view it.${!isAuthenticated ? " Connect & Login with Lens to get started." : ""
          }`,
          {
            duration: 10000,
            icon: "🚀",
          },
        );
        setWelcomeToast(true);
      }
    }
  }, [isMounted, isLoadingPage]);

  if (!isMounted) return null;

  if (!ready)
    return (
      <div className="bg-background text-secondary min-h-[50vh]">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-28 pb-4">
          <div className="flex justify-center">
            <Spinner customClasses="h-6 w-6" color="#E42101" />
          </div>
        </main>
      </div>
    );

  function isFarcasterProfile(profile: ProfileFragment | FarcasterProfile): profile is FarcasterProfile {
    return (profile as FarcasterProfile).profileHandle !== undefined;
  }

    const profilePicture = () => {
      if (isFarcasterProfile(profile)) {
        return profile.profileImage;
      }
      const lensProfile = profile as ProfileFragment;
      return lensProfile.metadata?.picture?.optimized?.uri;
    };

    const coverImage = () => {
      if (isFarcasterProfile(profile)) {
        return profile.coverImageURI;
      }
      const lensProfile = profile as ProfileFragment;
      return lensProfile.metadata?.coverPicture?.optimized?.uri;
    }

    const userBio = () => {
      if (isFarcasterProfile(profile)) {
        return profile.profileBio;
      }
      const lensProfile = profile as ProfileFragment;
      return lensProfile.metadata?.bio;
    }

    const userHandle = () => {
      if (isFarcasterProfile(profile)) {
        return profile.profileHandle;
      }
      const lensProfile = profile as ProfileFragment;
      return lensProfile.handle?.suggestedFormatted.localName;
    }

    const displayName = () => {
      if (isFarcasterProfile(profile)) {
        return profile.profileDisplayName;
      }
      const lensProfile = profile as ProfileFragment;
      return lensProfile.metadata?.displayName;
    }

    const followingCount = () => {
      if (isFarcasterProfile(profile)) {
        return profile.followingCount;
      }
      const lensProfile = profile as ProfileFragment;
      return lensProfile.followingCount;
    }

    const followerCount = () => {
      if (isFarcasterProfile(profile)) {
        return profile.followerCount;
      }
      const lensProfile = profile as ProfileFragment;
      return lensProfile.followerCount;
    } 

  return (
    <div className="bg-background text-secondary min-h-[87vh]">
        <main className="mx-auto max-w-full md:max-w-[1440px] px-4 sm:px-6 lg:px-8 h-full">
          <section aria-labelledby="dashboard-heading" className="pt-8 max-w-full h-full">
            <div className="grid grid-cols-1 gap-x-2 gap-y-10 lg:grid-cols-10 max-w-full h-full">
              <div className="lg:col-span-3 h-full">
              <div className={`z-20 flex bottom-0 top-[135px] h-full md:top-0 w-full flex-col overflow-y-auto transition-transform bg-black md:bg-cardBackground duration-300 rounded-3xl relative min-h-[87vh]`}> 
                <div className="py-4 pt-2 h-full overflow-y-auto">
                  <div
                    className='absolute top-0 left-0 w-full h-[112px] z-[-2]'
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
                    <div>
                      <div className="flex flex-col">
                        <Image
                          // @ts-expect-error picture.optimized
                          src={profilePicture()}
                          alt="pfp"
                          width={80}
                          height={80}
                          className="bg-[#ffffff] rounded-[20px] mt-2"
                          role="img"
                          aria-label="pfp"
                          unoptimized={true}
                        />
                      </div>
                      <h2 className="mt-[16px] font-semibold text-[#ffffff] text-[32px] leading-[1.125]">{displayName()}</h2>
                      <a href={`${MADFI_CLUBS_URL}/profile/${userHandle()}`} target="_blank" rel="noreferrer" className="text-[#ffffff] opacity-60 hover:opacity-50 text-[16px] leading-tight cursor-pointer mt-[2px]">{profile.handle?.suggestedFormatted.localName}</a>
                      <p className="text-[#ffffff] text-[16px] leading-tight font-light mt-8">
                        {userBio()}
                      </p>
                      <div className='mt-5 flex gap-5'>
                        <div className='flex flex-col gap-[2px]'>
                          <Subtitle>Following</Subtitle>
                          <BodySemiBold>{followingCount() ?? 0}</BodySemiBold>
                        </div>
                        <div className='flex flex-col gap-[2px]'>
                          <Subtitle>Followers</Subtitle>
                          <BodySemiBold>{followerCount() ?? 0}</BodySemiBold>
                        </div>
                      </div>
                    </div>
                     {isProfileAdmin && <Button
                        className="mt-6"
                        size="sm"
                        onClick={() => {
                          logout();
                          router.push(`/`);
                        }}>
                        Log out
                      </Button>}
                  </div>
                </div>
              </div>
                
                {/* <ProfileLarge
                  profileData={profile}
                  profileType={type}
                  theme={Theme.dark}
                  onClick={() => { }}
                  environment={LENS_ENVIRONMENT}
                  containerStyle={{ cursor: "default" }}
                  hideFollowButton={!(isConnected && isAuthenticated) || isProfileAdmin || !canFollow}
                  onFollowPress={onFollowClick}
                  followButtonBackgroundColor={isFollowed ? "transparent" : "#EEEDED"}
                  followButtonDisabled={!isConnected}
                  isFollowed={isFollowed}
                  renderMadFiBadge={true}
                  allSocials={allSocials?.data}
                /> */}

                {/* <div className="mt-8">
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-y-4">
                    <h2 className="text-2xl font-owners tracking-wide leading-6">Holdings</h2>
                  </div>
                  <div className="rounded-md p-6 md:w-[500px] w-full border-dark-grey border-2 shadow-lg space-y-4 mt-4">
                    <Holdings address={profileAddress(profile, creatorInfo?.address)} />
                  </div>
                </div> */}
              </div>

              <div className="lg:col-span-7">
                {/* Create a Post or Login */}
                {isCreatorAdmin && (
                  <>
                    {isAuthenticated && isProfileAdmin ? (
                      <div className="tour__create_post">
                        <CreatePost
                          profile={profile}
                          fetchGatedPosts={fetchGatedPosts}
                          authenticatedProfile={authenticatedProfile}
                          livestreamConfig={livestreamConfig}
                        />
                      </div>
                    ) : (
                      !isAuthenticated && (
                        <div className="mt-8 mb-8">
                          <div className="flex md:flex-col md:items-baseline md:justify-between gap-y-4">
                            <h2 className="text-xl md:text-2xl font-owners tracking-wide leading-6 md:pr-0 pr-8 md:mt-0 mt-8">
                              Log in to create a post
                            </h2>
                            <div className="flex justify-center mt-4 mb-4">
                              <Button
                                className="md:px-12"
                                onClick={() => setOpenSignInModal(true)}
                                disabled={signingIn}
                              >
                                Login with Lens
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </>
                )}

                {/* <CreatorsTabs
                  type={type}
                  setOpenTab={setOpenTab}
                  openTab={openTab}
                  rewardsEnabled={rewardsEnabled}
                  hasTrades={!!moneyClub?.trades?.length}
                /> */}

                <div className="mt-4 mb-2">
                  {/* Feed - only show for Lens profiles atm */}
                  {openTab === 1 && type === "lens" && (
                    <PublicationFeed
                      welcomePostUrl={creatorInfo?.welcomePostUrl}
                      isAuthenticated={isAuthenticated}
                      creatorProfile={profile}
                      isProfileAdmin={isProfileAdmin}
                      returnToPage={`u/${profile.handle?.localName || profile.profileHandle}`}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>

      {/* Create Space Modal */}
      <Modal
        onClose={() => setCreateSpaceModal(false)}
        open={createSpaceModal}
        setOpen={setCreateSpaceModal}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >
        <CreateSpaceModal
          profile={profile}
          livestreamConfig={livestreamConfig}
          setLivestreamConfig={setLivestreamConfig}
          closeModal={() => setCreateSpaceModal(false)}
          moneyClubId={moneyClub?.id}
        />
      </Modal>

      {/* Login Modal */}
      <Modal
        onClose={() => setOpenSignInModal(false)}
        open={openSignInModal}
        setOpen={setOpenSignInModal}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
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
      const namespace = IS_PRODUCTION ? "lens" : "test";
      const fullHandle = `${namespace}/${handle}`;
      const profile = await getProfileByHandle(fullHandle);

      if (profile?.id) {
        const { collection } = await getClientWithCreatorInfo();
        const creatorInfo = await collection.findOne(
          { address: profile.ownedBy.address.toLowerCase() },
          { projection: { _id: 0 } },
        );

        return {
          props: {
            profile,
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
