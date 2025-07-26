import { useEffect, useRef, useMemo, useState } from 'react';
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import {
  shareContainerStyleOverride,
  imageContainerStyleOverride,
  mediaImageStyleOverride,
  publicationProfilePictureStyle,
  reactionContainerStyleOverride,
  reactionsContainerStyleOverride,
  textContainerStyleOverrides,
  previewProfileContainerStyleOverride,
} from "@src/components/Publication/PublicationStyleOverrides";
import { Preview, useGetPreviews, Template, ELIZA_API_URL } from "@src/services/madfi/studio";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { GLOBAL_AGENT_ID, Memory } from '@src/services/madfi/terminal';
import { AnimatedText } from '@src/components/LoadingSpinner/AnimatedText';
import AnimatedBonsaiGrid from '@src/components/LoadingSpinner/AnimatedBonsaiGrid';
import useRegisteredTemplates from "@src/hooks/useRegisteredTemplates";
import { DownloadIcon } from '@heroicons/react/outline';
import { RefreshIcon } from '@heroicons/react/outline';
import Spinner from '@src/components/LoadingSpinner/LoadingSpinner';
import { FilmIcon } from '@heroicons/react/solid';
import { FastForwardIcon } from '@heroicons/react/solid';
import { toast } from 'react-hot-toast';
import { SparklesIcon } from '@heroicons/react/solid';
import { ANIMATED_HINT_LINES } from '@src/constants/constants';
import { NFTMetadata, type StoryboardClip } from '@src/services/madfi/studio';
import { useIsMiniApp } from '@src/hooks/useIsMiniApp';
import { useAccount } from 'wagmi';
import { Publication } from '@src/components/Publication/Publication';

export type LocalPreview = {
  agentId?: string;
  isAgent: boolean;
  createdAt: string;
  content: {
    text?: string;
    preview?: Preview;
    templateData?: string;
    prompt?: string;
  };
  pending?: boolean;
  tempId?: string;
};

type PreviewHistoryProps = {
  currentPreview?: Preview;
  setCurrentPreview: (c: Preview) => void;
  setSelectedTemplate?: (template: Template) => void;
  templateUrl?: string;
  roomId?: string;
  postContent?: string;
  setFinalTemplateData: (t: any) => void;
  setPrompt: (s: string) => void;
  localPreviews: LocalPreview[];
  setLocalPreviews: React.Dispatch<React.SetStateAction<LocalPreview[]>>;
  isFinalize: boolean;
  postImage?: any[];
  setPostContent: (c: string) => void;
  storyboardClips: StoryboardClip[];
  setStoryboardClips: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  onAnimateImage: (p: any) => void;
  onExtendVideo: (p: any) => void;
  generatePreview: (prompt: string, templateData: any, image?: File, aspectRatio?: string, nft?: NFTMetadata, audio?: { file: File; startTime: number; }) => void;
};

type MemoryPreview = Memory & {
  isAgent: boolean;
  createdAtDate: Date;
  pending?: boolean;
}

type MessageContentPreview = {
  image?: string;
  video?: string | { url?: string; blob?: Blob; mimeType?: string };
  agentId?: string;
  templateName?: string;
}

export default function PreviewHistory({
  currentPreview,
  setCurrentPreview,
  setSelectedTemplate,
  roomId,
  templateUrl,
  setFinalTemplateData,
  setPrompt,
  postContent,
  localPreviews,
  setLocalPreviews,
  isFinalize,
  postImage,
  setPostContent,
  storyboardClips,
  setStoryboardClips,
  onAnimateImage,
  onExtendVideo,
}: PreviewHistoryProps) {
  const { address } = useAccount();
  const { isMiniApp, context: farcasterContext } = useIsMiniApp();
  const [shouldFetchMessages, setShouldFetchMessages] = useState(true); // Always fetch to check if messages exist
  const [shouldShowMessages, setShouldShowMessages] = useState(false); // Control whether to display messages
  const [videoAspectRatios, setVideoAspectRatios] = useState<Record<string, number>>({});
  const [isProcessingVideo, setIsProcessingVideo] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement>>({});
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: messages, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useGetPreviews(templateUrl, roomId, shouldFetchMessages, isMiniApp, address);
  const { data: registeredTemplates } = useRegisteredTemplates();
  const selectedPublicationRef = useRef<HTMLDivElement>(null);
  const generatingRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const isGeneratingPreview = useMemo(() => localPreviews.some(p => p.pending), [localPreviews]);

  // Create author object that handles both Lens profile and Farcaster miniapp context
  const publicationAuthor = useMemo(() => {
    if (authenticatedProfile) {
      return authenticatedProfile;
    }

    if (isMiniApp && farcasterContext?.user) {
      // Create a mock profile object for Farcaster users
      return {
        username: {
          localName: farcasterContext.user.username
        },
        metadata: {
          name: farcasterContext.user.displayName || farcasterContext.user.username,
          picture: farcasterContext.user.pfpUrl
        },
        // Add other required fields with fallbacks
        id: `farcaster:${farcasterContext.user.fid}`,
        address: address || '',
        __typename: 'Profile' as const
      };
    }

    return authenticatedProfile;
  }, [authenticatedProfile, isMiniApp, farcasterContext, address]);

  // Check if there are any messages available to load
  const hasMessagesToLoad = messages?.pages?.some(page =>
    page.messages?.some(msg => msg.userId === GLOBAL_AGENT_ID)
  ) ?? false;

  // Combine and sort all previews
  const sortedMessages: MemoryPreview[] = useMemo(() => {
    // Always include remote messages if we should show them, otherwise empty array
    const _messages = shouldShowMessages ? (messages?.pages.flatMap(page =>
      page.messages.map(msg => ({
        ...msg,
        createdAtDate: new Date(msg.createdAt),
        isAgent: msg.userId === GLOBAL_AGENT_ID,
        agentId: msg.content.preview?.agentId,
      }))
    ) || []) : [];

    // Always include local previews regardless of shouldShowMessages
    const _localPreviews = localPreviews.map(local => ({
      agentId: local.agentId,
      id: local.createdAt, // Use timestamp as ID
      createdAt: local.createdAt,
      createdAtDate: new Date(local.createdAt),
      isAgent: local.isAgent,
      content: local.content,
      userId: local.isAgent ? GLOBAL_AGENT_ID : 'local',
      pending: local.pending,
    }));

    const combined = [..._messages, ..._localPreviews].sort((a, b) => {
      const aIsPending = !!a.pending;
      const bIsPending = !!b.pending;
      if (aIsPending !== bIsPending) {
        return aIsPending ? 1 : -1;
      }
      return a.createdAtDate.getTime() - b.createdAtDate.getTime();
    });

    // Extract prompts from previous non-agent messages and add them to agent messages
    const enrichedMessages = combined.map((message, index) => {
      if (message.isAgent && message.content.preview) {
        // Find the previous non-agent message to get the prompt
        const previousMessage = combined[index - 1];
        if (previousMessage && !previousMessage.isAgent && previousMessage.content.text) {
          return {
            ...message,
            content: {
              ...message.content,
              prompt: previousMessage.content.text
            }
          };
        }
      }
      return message;
    });

    return enrichedMessages;
  }, [messages, localPreviews, shouldShowMessages]);

  // Scroll to bottom when generating
  useEffect(() => {
    if (isGeneratingPreview && generatingRef.current) {
      generatingRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isGeneratingPreview]);

  // Unified scroll handling effect
  useEffect(() => {
    if (isFinalize) return; // Don't run scroll logic in finalize view

    const timer = setTimeout(() => {
      // Priority 1: Scroll to the selected preview if it exists and we're not generating.
      if (currentPreview && selectedPublicationRef.current && !isGeneratingPreview) {
        selectedPublicationRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
        return; // Prioritize selected preview, so we don't scroll elsewhere
      }

      // Priority 2: Scroll to the last message on initial load or for new local previews.
      // This avoids scrolling on pagination.
      if (!isGeneratingPreview && lastMessageRef.current && !isFetchingNextPage) {
        // Condition for initial load of remote messages or when only local previews exist.
        if (shouldShowMessages && messages?.pages.length === 1 || localPreviews.length > 0 && !shouldShowMessages) {
          lastMessageRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    }, 200); // Delay to allow refs to be set and DOM to update

    return () => clearTimeout(timer);
  }, [sortedMessages.length, currentPreview, isGeneratingPreview, isFetchingNextPage, shouldShowMessages, isFinalize]);

  // Server-side video processing with outro
  const downloadVideoWithOutro = async (preview: any, filename: string) => {
    const agentId = preview.agentId;
    if (!agentId) {
      toast.error('Unable to process video: missing ID');
      return downloadVideoSimple(preview, filename);
    }

    // Check if we have the aspect ratio
    const aspectRatio = videoAspectRatios[agentId];
    if (!aspectRatio) {
      toast.error('Video aspect ratio not available. Please wait a moment and try again.');
      return downloadVideoSimple(preview, filename);
    }

    try {
      setIsProcessingVideo(prev => ({ ...prev, [agentId]: true }));
      toast.loading('Downloading video...', { id: `processing-${agentId}` });

      // Get video URL or convert blob to base64
      let videoUrl: string;
      let isBlob = false;

      if (preview.video.blob) {
        // Convert blob to base64 data URL
        const reader = new FileReader();
        videoUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read blob'));
          reader.readAsDataURL(preview.video.blob);
        });
        isBlob = true;
      } else if (typeof preview.video === 'string') {
        videoUrl = preview.video;
      } else if (preview.video.url) {
        videoUrl = preview.video.url;
      } else {
        throw new Error('No video URL available');
      }

      const response = await fetch(ELIZA_API_URL + '/video/add-outro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          filename: filename.replace(/\.[^/.]+$/, '.mp4'),
          isBlob // Flag to indicate this is blob data
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to process video');
      }

      // Get the processed video as blob
      const blob = await response.blob();

      // Download the processed video
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.replace(/\.[^/.]+$/, '.mp4');
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Video downloaded!', { id: `processing-${agentId}`, duration: 3000 });

    } catch (error) {
      console.error('Video processing failed:', error);
      toast.dismiss(`processing-${agentId}`);
      downloadVideoSimple(preview, filename);
    } finally {
      setIsProcessingVideo(prev => ({ ...prev, [agentId]: false }));
    }
  };

  // Enhanced download function
  const downloadMedia = async (preview: any, filename: string) => {
    try {
      // Handle video download with outro
      if (preview?.video) {
        return downloadVideoWithOutro(preview, filename);
      }

      // Handle image download (unchanged)
      if (preview?.image) {
        let url: string;
        if (preview.image.startsWith('data:')) {
          url = preview.image;
        } else {
          url = preview.image;
        }
        filename = filename.replace(/\.[^/.]+$/, '.png');

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      throw new Error('No media to download');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  // Simple video download fallback function
  const downloadVideoSimple = async (preview: any, filename: string) => {
    try {
      let url: string;
      let shouldRevoke = false;

      if (preview.video.blob) {
        url = URL.createObjectURL(preview.video.blob);
        shouldRevoke = true;
      } else if (typeof preview.video === 'string') {
        url = preview.video;
      } else if (preview.video.url) {
        url = preview.video.url;
      } else {
        throw new Error('No video URL available');
      }

      filename = filename.replace(/\.[^/.]+$/, '.mp4');

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (shouldRevoke) {
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      console.error('Simple video download failed:', error);
      toast.error('Download failed');
    }
  };

  if (isFinalize) {
    return (
      <div className="w-full">
        <div className="space-y-8 p-4" role="log" aria-live="polite">
          <Publication
            key={`preview-finalize-${postContent?.length || 0}-${currentPreview?.agentId || 'none'}`}
            publicationData={{
              author: publicationAuthor,
              timestamp: Date.now(),
              metadata: {
                __typename: currentPreview?.video
                  ? "VideoMetadata"
                  : ((currentPreview?.image || currentPreview?.imagePreview || postImage?.length) ? "ImageMetadata" : "TextOnlyMetadata"),
                content: postContent || currentPreview?.text || '',
                video: currentPreview?.video
                  ? {
                      item: typeof currentPreview.video === "string" ? currentPreview.video : (currentPreview.video as any)?.url,
                      cover: currentPreview.image
                    }
                  : undefined,
                image: currentPreview?.imagePreview || currentPreview?.image
                  ? { item: currentPreview?.imagePreview || currentPreview.image }
                  : postImage?.length
                  ? postImage[0].preview
                  : undefined
              }
            }}
            followButtonDisabled={true}
            environment={LENS_ENVIRONMENT}
            profilePictureStyleOverride={publicationProfilePictureStyle}
            containerBorderRadius={'24px'}
            containerPadding={'10px'}
            profilePadding={'0 0 0 0'}
            textContainerStyleOverride={textContainerStyleOverrides}
            backgroundColorOverride={'rgba(255,255,255, 0.08)'}
            mediaImageStyleOverride={mediaImageStyleOverride}
            imageContainerStyleOverride={imageContainerStyleOverride}
            reactionsContainerStyleOverride={reactionsContainerStyleOverride}
            reactionContainerStyleOverride={reactionContainerStyleOverride}
            shareContainerStyleOverride={shareContainerStyleOverride}
            markdownStyleBottomMargin={'0'}
            heartIconOverride={true}
            messageIconOverride={true}
            shareIconOverride={true}
            fullVideoHeight
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Load Previous Messages Button */}
      {!isFinalize && (
        (!shouldShowMessages && hasMessagesToLoad) || (shouldShowMessages && hasNextPage)
      ) && (
        <div className="flex justify-center pr-4 pl-4 animate-fade-in-down">
          <button
            onClick={() => {
              if (!shouldShowMessages) {
                setShouldShowMessages(true);
              } else if (hasNextPage) {
                fetchNextPage();
              }
            }}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500 transition-colors duration-200 enabled:hover:text-brand-highlight disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <>
                <Spinner customClasses="h-4 w-4" color="#9CA3AF" />
                Loading...
              </>
            ) : (
              <>
                <RefreshIcon className="w-4 h-4" />
                {!shouldShowMessages ? "Load previous generations" : "Load more"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {shouldShowMessages && (isFetching || isFetchingNextPage) && !sortedMessages.length && (
        <div className="flex justify-center p-4">
          <Spinner customClasses="h-6 w-6" color="#5be39d" />
        </div>
      )}

      <div className="space-y-8 p-2 sm:p-4" role="log" aria-live="polite">
        {sortedMessages.map((message: MemoryPreview, index) => {
          if (!message.isAgent) return null; // not showing the user inputs, only previews
          if (index > 1 && message.agentId === sortedMessages[index - 2].agentId) return null; // HACK: when messages are fetched on the first try

          if (message.pending) {
            return (
              <div key={`pending-${index}`} ref={generatingRef} className="flex flex-col items-center space-y-4 pb-4">
                <AnimatedBonsaiGrid />
                <AnimatedText lines={ANIMATED_HINT_LINES} className="md:w-[400px] w-full md:text-lg" />
              </div>
            );
          }

          // Find the template data message that corresponds to this preview
          const templateDataMessage = sortedMessages.find(msg =>
            !msg.isAgent &&
            msg.agentId === `templateData-${message.agentId}` &&
            msg.content?.templateData
          );
          const templateData = templateDataMessage?.content?.templateData
            ? JSON.parse(templateDataMessage.content.templateData as string)
            : {};

          // Prioritize preview text over prompt for display
          const previewText = (message.content.preview as any)?.text;
          const content = previewText || message.content.text || message.content.prompt || currentPreview?.text || "";
          const preview = message.isAgent ? {
            ...message.content.preview as unknown as MessageContentPreview,
            agentId: message.agentId,
            text: previewText || (message.content.preview as any)?.text || content,
            templateName: (message.content.preview as any)?.templateName,
          } : undefined;

          const selected = preview?.agentId === currentPreview?.agentId;
          const isLastMessage = index === sortedMessages.length - 1;
          const isClipInStoryboard = storyboardClips.some(clip => clip.id === preview?.agentId);

          let isAspectRatioMismatch = false;
          if (storyboardClips.length > 0 && preview?.video && preview.agentId) {
            const firstClipAgentId = storyboardClips[0].id;
            const firstClipAspectRatio = videoAspectRatios[firstClipAgentId];
            const currentClipAspectRatio = videoAspectRatios[preview.agentId];

            if (firstClipAspectRatio && currentClipAspectRatio) {
              if (Math.abs(firstClipAspectRatio - currentClipAspectRatio) > 0.01) {
                isAspectRatioMismatch = true;
              }
            }
          }

          // Safely check for videoUrl and video.url properties
          const previewContent = message.content.preview as { videoUrl?: string; video?: { url?: string } } | undefined;
          const isComposition =
            !(previewContent?.videoUrl?.startsWith("https://link.storjshare")) &&
            !(previewContent?.video?.url?.startsWith("https://link.storjshare"));

          const isAddButtonDisabled = isClipInStoryboard || storyboardClips.length >= 10 || isAspectRatioMismatch;
          const addButtonTitle = isAspectRatioMismatch
            ? "Aspect ratio must match first clip"
            : isClipInStoryboard
            ? "Already in storyboard"
            : "Add to storyboard";

          return (
            <div
              key={`message-${index}`}
              ref={selected ? selectedPublicationRef : (isLastMessage ? lastMessageRef : null)}
              className={`pb-10 bg-[#141414] rounded-3xl relative space-y-2 ${!message.isAgent ? 'ml-auto max-w-[80%]' : ''} ${selected && !isGeneratingPreview ? "border-[1px] border-brand-highlight rounded-[24px]" : ""} group animate-fade-in-down`}
            >
              <div className="relative">
                {/* Hidden video element to get duration */}
                {preview?.video && (
                  <video
                    ref={el => {
                      if (el && preview.agentId) {
                        videoRefs.current[preview.agentId] = el;
                      }
                    }}
                    src={typeof preview.video === 'string' ? preview.video : preview.video.url}
                    preload="metadata"
                    className="hidden"
                    onLoadedMetadata={(e) => {
                      const videoEl = e.currentTarget;
                      if (preview.agentId && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                        setVideoAspectRatios(prev => ({
                          ...prev,
                          [preview.agentId as string]: videoEl.videoWidth / videoEl.videoHeight
                        }));
                      }
                    }}
                  />
                )}
                {/* Action buttons */}
                <div className="absolute -bottom-7 right-3 z-10 flex gap-2 transition-opacity duration-200">
                  {/* Animate image button - only for images */}
                  {preview?.image && !preview.video && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnimateImage(preview);
                      }}
                      className="flex items-center bg-transparent gap-2 rounded-xl p-2 backdrop-blur-sm hover:bg-brand-highlight/60"
                      title="Animate this image"
                    >
                      <SparklesIcon className="w-5 h-5 text-white" /> Use in video
                    </button>
                  )}

                  {/* Add to Storyboard button - only for videos */}
                  {preview?.video && !isComposition && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        // Final aspect ratio check on click
                        if (storyboardClips.length > 0) {
                          const firstClip = storyboardClips[0];
                          const firstVideoEl = firstClip.id ? videoRefs.current[firstClip.id] : null;
                          const currentVideoEl = preview.agentId ? videoRefs.current[preview.agentId] : null;

                          if (firstVideoEl && currentVideoEl && firstVideoEl.videoWidth > 0 && currentVideoEl.videoWidth > 0) {
                            const firstAspectRatio = firstVideoEl.videoWidth / firstVideoEl.videoHeight;
                            const currentAspectRatio = currentVideoEl.videoWidth / currentVideoEl.videoHeight;

                            if (Math.abs(firstAspectRatio - currentAspectRatio) > 0.01) {
                              toast.error("Video aspect ratio must match the first clip in the storyboard.");
                              return;
                            }
                          } else {
                            toast.error("Cannot determine video aspect ratio. Please wait a moment and try again.");
                            return;
                          }
                        }

                        if (storyboardClips.length >= 10) {
                          toast.error("You can add a maximum of 10 clips to the storyboard.");
                          return;
                        }
                        if (isClipInStoryboard) return;

                        const videoEl = preview.agentId ? videoRefs.current[preview.agentId] : null;
                        const duration = videoEl ? videoEl.duration : 0;

                        if (duration === 0) {
                          toast.error("Could not determine video duration. Please try again.");
                          return;
                        }

                        setStoryboardClips(prev => [...prev, {
                          id: preview.agentId as string,
                          preview: preview as Preview,
                          startTime: 0,
                          endTime: duration,
                          duration,
                          templateData,
                        }]);
                        toast.success("Added to storyboard!");
                      }}
                      className={`flex items-center gap-2 bg-transparent rounded-xl p-2 backdrop-blur-sm ${isAddButtonDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-brand-highlight/60'}`}
                      title={addButtonTitle}
                      disabled={isAddButtonDisabled}
                    >
                      <FilmIcon className="w-5 h-5 text-white" />
                      {isAspectRatioMismatch
                        ? "Incompatible aspect ratio"
                        : `Add${isClipInStoryboard ? "ed" : ""} to storyboard`}
                    </button>
                  )}

                  {/* Extend Video button - only for videos */}
                  {preview?.video && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExtendVideo(preview);
                      }}
                      className="flex items-center bg-transparent gap-2 rounded-xl p-2 backdrop-blur-sm hover:bg-brand-highlight/60"
                      title="Extend this video"
                    >
                      <FastForwardIcon className="w-5 h-5 text-white" /> Extend
                    </button>
                  )}

                  {/* Download button - only show if there's media to download */}
                  {(preview?.image || preview?.video) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const filename = `bonsai-${preview?.agentId || 'preview'}-${Date.now()}`;
                        downloadMedia(preview, filename);
                      }}
                      disabled={!!preview?.video && isProcessingVideo[preview.agentId as string]}
                      className={`relative bg-transparent hover:bg-brand-highlight/60 rounded-xl p-2 backdrop-blur-sm ${preview?.video && isProcessingVideo[preview.agentId as string] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={`Download media${preview?.video ? ' (with branding)' : ''}`}
                    >
                      <DownloadIcon className="w-5 h-5 text-white" />
                      {preview?.video && isProcessingVideo[preview.agentId as string] && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Spinner customClasses="h-4 w-4" color="#ffffff" />
                        </div>
                      )}
                    </button>
                  )}
                </div>

                <Publication
                  key={`preview-${message.id}`}
                  publicationData={{
                    author: publicationAuthor,
                    timestamp: message.createdAt,
                    metadata: {
                      __typename: preview?.video
                        ? "VideoMetadata"
                        : (((preview as any)?.imagePreview || preview?.image) ? "ImageMetadata" : "TextOnlyMetadata"),
                      content,
                      video: preview?.video
                        ? {
                            item: typeof preview.video === "string" ? preview.video : (preview.video as any)?.url,
                            cover: preview.image
                          }
                        : undefined,
                      image: (preview as any)?.imagePreview || preview?.image
                        ? { item: (preview as any)?.imagePreview || preview?.image }
                        : undefined
                    }
                  }}
                  followButtonDisabled={true}
                  environment={LENS_ENVIRONMENT}
                  profileContainerStyleOverride={previewProfileContainerStyleOverride}
                  containerBorderRadius={'24px'}
                  containerPadding={'10px'}
                  profilePadding={'0 0 0 0'}
                  textContainerStyleOverride={textContainerStyleOverrides}
                  backgroundColorOverride={message.isAgent ? '#141414' : '#141414'}
                  mediaImageStyleOverride={mediaImageStyleOverride}
                  imageContainerStyleOverride={imageContainerStyleOverride}
                  reactionsContainerStyleOverride={reactionsContainerStyleOverride}
                  reactionContainerStyleOverride={reactionContainerStyleOverride}
                  shareContainerStyleOverride={shareContainerStyleOverride}
                  markdownStyleBottomMargin={'0'}
                  heartIconOverride={true}
                  messageIconOverride={true}
                  shareIconOverride={true}
                  fullVideoHeight
                  onClick={message.isAgent ? () => {
                    setFinalTemplateData(templateData);
                    setCurrentPreview(preview as Preview);
                    // Use the stored prompt from the message content, ensure it's a string
                    const promptToSet = String(message.content.prompt || '');
                    setPrompt(promptToSet);
                    // Set post content to the preview text, prioritizing actual preview text
                    const previewTextToSet = previewText || (message.content.preview as any)?.text || '';
                    setPostContent(previewTextToSet);

                    // Find and set the corresponding template
                    if (setSelectedTemplate && preview?.templateName && registeredTemplates) {
                      const matchingTemplate = registeredTemplates.find(
                        template => template.name === preview.templateName
                      );
                      if (matchingTemplate) {
                        setSelectedTemplate(matchingTemplate);
                      }
                    }
                  } : undefined}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}