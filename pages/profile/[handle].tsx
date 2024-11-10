import { GetServerSideProps, NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-hot-toast";
import { getAddress } from "viem";
import { ProfileLarge, Theme } from "@madfi/widgets-react";
import { ProfileFragment } from "@lens-protocol/client";
import dynamic from "next/dynamic";
import { VideoCameraIcon } from "@heroicons/react/solid";
import { usePrivy } from "@privy-io/react-auth";
import { last } from "lodash/array";

import { Modal } from "@src/components/Modal";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { getIsFollowedBy } from "@src/services/lens/getProfiles";
import { followProfile } from "@src/services/lens/follow";
import { getProfileByHandle } from "@src/services/lens/getProfiles";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { IS_PRODUCTION } from "@src/constants/constants";
import useIsMounted from "@src/hooks/useIsMounted";
import { useGetGatedPosts } from "@src/hooks/useGetGatedPosts";
import { getClientWithCreatorInfo } from "@src/services/mongo/client";
import CreatePost, { LivestreamConfig } from "@src/components/Creators/CreatePost";
import PublicationFeed from "@src/components/Publication/PublicationFeed";
import LoginWithLensModal from "@src/components/Lens/LoginWithLensModal";
import { useRegisteredClub } from "@src/hooks/useMoneyClubs";
import { FarcasterProfile } from "@src/services/farcaster/types";
import { Holdings } from "@src/pagesComponents/Dashboard";

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

  const [createSpaceModal, setCreateSpaceModal] = useState(false);
  const [openSignInModal, setOpenSignInModal] = useState(false);
  const [openTab, setOpenTab] = useState<number>(type === "lens" ? 1 : 5);
  const [livestreamConfig, setLivestreamConfig] = useState<LivestreamConfig | undefined>();
  const [canFollow, setCanFollow] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [welcomeToast, setWelcomeToast] = useState(false);

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

  useMemo(async () => {
    if (!(authenticatedProfileId && profile)) return;

    if (profile.id) {
      const { isFollowedByMe, canFollow } = await getIsFollowedBy(profile.id);

      setIsFollowed(isFollowedByMe!.value);
      setCanFollow(canFollow!);
    }
  }, [isAuthenticated, authenticatedProfileId, profile]);

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

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <div>
        <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between border-b border-dark-grey pt-12 pb-4">
            <h1 className="text-3xl md:text-5xl font-bold font-owners tracking-wide mb-4 md:mb-0">
              {profile?.metadata?.displayName}
            </h1>

            {/* {isConnected && (
              <div className="flex flex-col md:flex-row items-start md:items-center md:justify-end md:w-auto">
                {isProfileAdmin && (
                  <Button
                    variant="accent"
                    className="w-full mb-2 mr-4 md:mb-0 text-base"
                    onClick={() => setCreateSpaceModal(true)}
                  >
                    <VideoCameraIcon width={20} height={20} className="text-white inline-block mr-2" />
                    Go live
                  </Button>
                )}
              </div>
            )} */}
          </div>

          <section aria-labelledby="dashboard-heading" className="pt-8 pb-24 max-w-full">
            <h2 id="dashboard-heading" className="sr-only">
              {profile?.metadata?.displayName}
            </h2>

            <div className="grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-6 max-w-full">
              <div className="lg:col-span-3 p-4">
                <ProfileLarge
                  profileData={profile}
                  profileType={type}
                  theme={Theme.dark}
                  onClick={() => { }}
                  environment={LENS_ENVIRONMENT}
                  containerStyle={{ cursor: "default" }}
                  hideFollowButton={!(isConnected && isAuthenticated) || isProfileAdmin}
                  onFollowPress={onFollowClick}
                  followButtonBackgroundColor={isFollowed ? "transparent" : "#EEEDED"}
                  followButtonDisabled={!isConnected}
                  isFollowed={isFollowed}
                  renderMadFiBadge={true}
                  allSocials={allSocials?.data}
                />

                <div className="mt-8">
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-y-4">
                    <h2 className="text-2xl font-owners tracking-wide leading-6">Holdings</h2>
                  </div>
                  <div className="rounded-md p-6 md:w-[500px] w-full border-dark-grey border-2 shadow-lg space-y-4 mt-4">
                    <Holdings address={profileAddress(profile, creatorInfo?.address)} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3">
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
      </div>

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
          destination: "/dashboard",
        },
      };
    } catch (error) {
      console.log(error);
    }
  }

  return { props: {} };
};
