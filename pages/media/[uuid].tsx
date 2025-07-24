import { GetServerSideProps, NextPage } from "next";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic';
import { useAccount, useWalletClient } from "wagmi";
import { useEffect, useMemo, useState, useContext } from "react";
import Link from "next/link";
import { omit } from "lodash/object";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { Button } from "@src/components/Button";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import useIsMounted from "@src/hooks/useIsMounted";
import { SmartMedia, Preview, ELIZA_API_URL } from "@src/services/madfi/studio";
import { useRegisteredClubByToken } from "@src/hooks/useMoneyClubs";
import { TokenInfoExternal } from "@pagesComponents/Post/TokenInfoExternal";
import ChatWindowButton from "@pagesComponents/ChatWindow/components/ChatWindowButton";
import Chat from "@pagesComponents/ChatWindow/components/Chat";
import { useGetAgentInfo } from "@src/services/madfi/terminal";
import { ChatSidebarContext } from "@src/components/Layouts/Layout/Layout";
import { generateSeededUUID, generateUUID } from "@pagesComponents/ChatWindow/utils";
import useIsMobile from "@src/hooks/useIsMobile";
import { fetchFarcasterUser, FarcasterProfile } from "@src/services/neynar/api";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { TokenInfoComponent } from "@pagesComponents/Post/TokenInfoComponent";
import { RemixPreviews } from "@pagesComponents/Post/RemixPreviews";

// Lazy load the PublicationContainer component
const PublicationContainer = dynamic(
  () => import("@src/components/Publication/PublicationContainer"),
  { ssr: false }
);

interface MediaPageProps {
  media: SmartMedia;
  creatorProfile: FarcasterProfile;
  uuid: string;
  preview: Preview;
}

// Lazy load the Publications component
const Publications = dynamic(
  () => import("@madfi/widgets-react").then(mod => mod.Publications),
  { ssr: false }
);

const SingleMediaPage: NextPage<MediaPageProps> = ({ media, creatorProfile, uuid, preview }) => {
  const isMounted = useIsMounted();
  const isMobile = useIsMobile();
  const router = useRouter();
  const { data: club } = useRegisteredClubByToken({ ...media?.token });
  const { isConnected, address } = useAccount();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: agentInfoSage, isLoading: isLoadingAgentInfo } = useGetAgentInfo();
  const { isChatOpen, setIsChatOpen } = useContext(ChatSidebarContext);
  const { context } = useIsMiniApp();

  const [isLoading, setIsLoading] = useState(false);

  const conversationId = useMemo(() => {
    if (isMounted && !isLoading)
      return (context?.user?.fid || address)
        ? generateSeededUUID(`${uuid}-${context?.user?.fid || address}`)
        : generateUUID();
  }, [isMounted, isLoading, authenticatedProfile, media, context]);

    // Create a publication-like object from the preview for the Publication component
  const publicationData = useMemo(() => {
    if (!preview || !creatorProfile) return null;

    return {
      id: uuid,
      author: {
        id: creatorProfile.fid.toString(),
        username: {
          localName: creatorProfile.username,
        },
        metadata: {
          name: creatorProfile.displayName,
          bio: creatorProfile.bio,
          picture: creatorProfile.pfpUrl,
        },
      },
      timestamp: new Date(media.createdAt * 1000).toISOString(),
      metadata: {
        __typename: preview.video
          ? "VideoMetadata"
          : (preview.imagePreview || preview.image)
            ? "ImageMetadata"
            : "TextOnlyMetadata",
        content: preview.text || '',
        video: preview.video
          ? {
              item: typeof preview.video === "string" ? preview.video : preview.video.url,
              cover: preview.image || preview.imagePreview
            }
          : undefined,
        image: preview.imagePreview || preview.image
          ? { item: preview.imagePreview || preview.image }
          : undefined
      }
    };
  }, [preview, creatorProfile, uuid]);

  if (!isMounted) return null;

  if (isLoading) {
    return (
      <div className="bg-background text-secondary min-h-[50vh]">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-28 pb-4">
          <div className="flex justify-center">
            <Spinner customClasses="h-6 w-6" color="#5be39d" />
          </div>
        </main>
      </div>
    );
  }

  if (!preview || !creatorProfile) {
    return (
      <div className="bg-background text-secondary min-h-[50vh]">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-4 sm:px-6 lg:px-8 pt-28 pb-4">
          <div className="flex justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Media not found</h1>
              <p className="text-gray-400">The requested media could not be found.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const safeMedia = (media: SmartMedia | null | undefined): SmartMedia | undefined => {
    return media || undefined;
  };

  return (
    <div className="bg-background text-secondary min-h-[50vh] max-h-[100%] overflow-hidden h-full relative">
      {/* Chat Sidebar */}
      {!isLoadingAgentInfo && !!agentInfoSage?.agentId && (
        <ChatWindowButton agentInfo={agentInfoSage} isOpen={isChatOpen} setIsOpen={setIsChatOpen}>
          <Chat
            agentId={uuid}
            agentWallet={agentInfoSage.info.wallets[0]}
            agentName={`${agentInfoSage?.account?.metadata?.name} (${agentInfoSage?.account?.username?.localName})`}
            media={safeMedia(media)}
            conversationId={conversationId}
            post={publicationData as any}
            isRemixing={false}
          />
        </ChatWindowButton>
      )}

      <div className="h-full">
        <main className="mx-auto max-w-full md:max-w-[92rem] px-2 sm:px-6 lg:px-8 md:pt-8 md:pb-4 h-full relative">
          <section aria-labelledby="media-heading" className="max-w-full items-start justify-center h-full gap-4">
            <div className="flex flex-col md:gap-2 h-full relative pt-4">

              {/* Token Info */}
              {!!club?.tokenAddress
                ? <TokenInfoComponent club={club} media={safeMedia(media)} remixPostId={media.parentCast} />
                : <TokenInfoExternal token={{ ...media.token }} />
              }

              <div className="overflow-y-hidden h-full">
                {publicationData && (
                  <>
                    <div className="hidden sm:block animate-fade-in-down">
                      <PublicationContainer
                        key={`pub-${publicationData.id}`}
                        publication={publicationData}
                        onCommentButtonClick={() => {}}
                        shouldGoToPublicationPage={false}
                        isProfileAdmin={false}
                        media={safeMedia(media)}
                        onCollectCallback={() => {}}
                        sideBySideMode={true}
                        token={{
                          address: club?.tokenAddress,
                          ticker: club?.symbol,
                        }}
                        enoughActivity={true}
                        isPresenceConnected={false}
                        connectedAccounts={[]}
                        version={0}
                        showDownload
                      />
                    </div>
                    <div className="sm:hidden">
                      <PublicationContainer
                        key={`pub-mobile-${publicationData.id}`}
                        publication={publicationData}
                        onCommentButtonClick={() => {}}
                        shouldGoToPublicationPage={false}
                        isProfileAdmin={false}
                        media={safeMedia(media)}
                        onCollectCallback={() => {}}
                        enoughActivity={true}
                        isPresenceConnected={false}
                        connectedAccounts={[]}
                        version={0}
                        showDownload
                      />
                    </div>
                  </>
                )}

                {/* Remixes Section */}
                <div className="min-w-0">
                  <RemixPreviews parentCast={uuid} />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const uuid = context.query.uuid!.toString();

  try {
    // Fetch from eliza server /memory/:uuid endpoint
    const response = await fetch(`${ELIZA_API_URL}/memories/bulk?ids=${uuid}`);

    if (!response.ok) {
      return { notFound: true };
    }

    const _data = await response.json();
    const data = _data ? _data[0] : {};
    const { preview, creatorFid }: { preview: Preview, creatorFid: number } = data;

    if (!preview || !creatorFid) {
      return { notFound: true };
    }

    // Fetch creator profile using creatorFid
    let creatorProfile;
    try {
      creatorProfile = await fetchFarcasterUser(creatorFid);
    } catch (error) {
      console.error("Error fetching creator profile:", error);
      // Continue without creator profile for now
    }

    // Set cache-control header for 1 minute
    if (context.res) {
      context.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=59');
    }

    return {
      props: {
        handle: creatorProfile.username,
        profileImage: creatorProfile.pfpUrl,
        content: preview.text || "",
        pageName: "singlePublication",
        media: omit(data, 'preview', 'creatorFid'),
        creatorProfile,
        uuid,
        image: preview.image,
        preview,
      },
    };
  } catch (error) {
    console.error("Error fetching media:", error);
    return { notFound: true };
  }
};

export default SingleMediaPage;