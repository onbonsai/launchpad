import { useEffect, useRef, useMemo, useState } from 'react';
import { Publication, Theme } from "@madfi/widgets-react";
import { uniqBy } from "lodash/array";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, previewProfileContainerStyleOverride } from "@src/components/Publication/PublicationStyleOverrides";
import { Preview, useGetPreviews, Template } from "@src/services/madfi/studio";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { GLOBAL_AGENT_ID, Memory } from '@src/services/madfi/terminal';
import { AnimatedText } from '@src/components/LoadingSpinner/AnimatedText';
import useIsMounted from "@src/hooks/useIsMounted";
import AnimatedBonsaiGrid from '@src/components/LoadingSpinner/AnimatedBonsaiGrid';
import useRegisteredTemplates from "@src/hooks/useRegisteredTemplates";
import { DownloadIcon } from '@heroicons/react/outline';
import { RefreshIcon } from '@heroicons/react/outline';
import Spinner from '@src/components/LoadingSpinner/LoadingSpinner';

type PreviewHistoryProps = {
  currentPreview?: Preview;
  setCurrentPreview: (c: Preview) => void;
  setSelectedTemplate?: (template: Template) => void;
  isGeneratingPreview: boolean;
  templateUrl?: string;
  roomId?: string;
  postContent?: string;
  setFinalTemplateData: (t: any) => void;
  setPrompt: (s: string) => void;
  localPreviews: Array<{
    agentId?: string;
    isAgent: boolean;
    createdAt: string;
    content: {
      text?: string;
      preview?: Preview;
      templateData?: string;
      prompt?: string;
    };
  }>;
  isFinalize: boolean;
  postImage?: any[];
  setPostContent: (c: string) => void;
};

type MemoryPreview = Memory & {
  isAgent: boolean;
  createdAtDate: Date;
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
  isGeneratingPreview,
  roomId,
  templateUrl,
  setFinalTemplateData,
  setPrompt,
  postContent,
  localPreviews,
  isFinalize,
  postImage,
  setPostContent,
}: PreviewHistoryProps) {
  const isMounted = useIsMounted();
  const [shouldFetchMessages, setShouldFetchMessages] = useState(true); // Always fetch to check if messages exist
  const [shouldShowMessages, setShouldShowMessages] = useState(false); // Control whether to display messages
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: messages, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useGetPreviews(templateUrl, roomId, shouldFetchMessages);
  const { data: registeredTemplates } = useRegisteredTemplates();
  const selectedPublicationRef = useRef<HTMLDivElement>(null);
  const generatingRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

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
    }));

    const combined = [..._messages, ..._localPreviews].sort((a, b) =>
      a.createdAtDate.getTime() - b.createdAtDate.getTime()
    );

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

  // Scroll to bottom when done generating and sorted messages changed
  useEffect(() => {
    // Only scroll when done generating new content, not when loading more messages via pagination
    if (!isGeneratingPreview && lastMessageRef.current && sortedMessages.length > 0 && !isFetchingNextPage) {
      // Only scroll if it's local content (new generation) or initial load, not pagination
      const hasOnlyLocalPreviews = sortedMessages.every(msg => msg.userId === 'local' || msg.userId === GLOBAL_AGENT_ID);
      if (hasOnlyLocalPreviews || (!shouldShowMessages || (messages?.pages?.length && messages?.pages?.length <= 1))) {
        setTimeout(() => {
          lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);
      }
    }
  }, [sortedMessages.length, isGeneratingPreview]);

  // Scroll to bottom when messages are first rendered after clicking the button
  useEffect(() => {
    // Only scroll on initial load (when shouldShowMessages becomes true), not on pagination
    if (shouldShowMessages && !isGeneratingPreview && lastMessageRef.current && sortedMessages.length > 0 && !isFetchingNextPage && messages?.pages?.length === 1) {
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 200);
    }
  }, [shouldShowMessages, sortedMessages.length, isGeneratingPreview]);

  // Scroll to top of the selected publication when it changes
  useEffect(() => {
    if (selectedPublicationRef.current && currentPreview && !isGeneratingPreview) {
      setTimeout(() => {
        selectedPublicationRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 200); // Slightly longer delay for better positioning
    }
  }, [currentPreview?.agentId, isGeneratingPreview]);

  // Helper function to download media
  const downloadMedia = async (preview: any, filename: string) => {
    try {
      let url: string;
      let shouldRevoke = false;

      if (preview?.video) {
        // Handle video download
        if (preview.video.blob) {
          // For blob videos, create object URL
          url = URL.createObjectURL(preview.video.blob);
          shouldRevoke = true;
          filename = filename.replace(/\.[^/.]+$/, '.mp4'); // Ensure video extension
        } else if (typeof preview.video === 'string') {
          url = preview.video;
        } else if (preview.video.url) {
          url = preview.video.url;
        } else {
          throw new Error('No video URL available');
        }
      } else if (preview?.image) {
        // Handle image download
        if (preview.image.startsWith('data:')) {
          // For base64 images
          url = preview.image;
        } else {
          url = preview.image;
        }
        filename = filename.replace(/\.[^/.]+$/, '.png'); // Ensure image extension
      } else {
        throw new Error('No media to download');
      }

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke object URL if it was created
      if (shouldRevoke) {
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (isFinalize) {
    return (
      <div className="w-full">
        <div className="space-y-8 p-4" role="log" aria-live="polite">
          <Publication
            key={`preview-finalize-${postContent?.length || 0}-${currentPreview?.agentId || 'none'}`}
            publicationData={{
              author: authenticatedProfile,
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
            theme={Theme.dark}
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
        <div className="flex justify-center p-4 animate-fade-in-down">
          <button
            onClick={() => {
              if (!shouldShowMessages) {
                setShouldShowMessages(true);
              } else if (hasNextPage) {
                fetchNextPage();
              }
            }}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-all duration-300 ease-in-out bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 hover:scale-105 transform group disabled:opacity-50 disabled:scale-100"
          >
            {isFetchingNextPage ? (
              <>
                <Spinner customClasses="h-4 w-4" color="#9CA3AF" />
                Loading...
              </>
            ) : (
              <>
                <RefreshIcon className="w-4 h-4 transition-transform duration-200 ease-in-out group-hover:rotate-45" />
                {!shouldShowMessages ? "Load previous messages" : "Load more messages"}
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

          // Safely get the previous message and template data
          const previousMessage = index > 0 ? sortedMessages[index - 1] : null;
          const templateData = previousMessage?.content?.templateData
            ? JSON.parse(previousMessage.content.templateData as string)
            : {};

          const content = message.content.text || message.content.prompt || currentPreview?.text;
          const preview = message.isAgent ? {
            ...message.content.preview as unknown as MessageContentPreview,
            text: content,
            templateName: (message.content.preview as any)?.templateName,
          } : undefined;
          const selected = preview?.agentId === currentPreview?.agentId;
          const isLastMessage = index === sortedMessages.length - 1;

          return (
            <div
              key={`message-${index}`}
              ref={selected ? selectedPublicationRef : (isLastMessage ? lastMessageRef : null)}
              className={`relative space-y-2 ${!message.isAgent ? 'ml-auto max-w-[80%]' : ''} ${selected && !isGeneratingPreview ? "border-[1px] border-brand-highlight rounded-[24px]" : ""} group`}
            >
              <div className="relative">
                {/* Download button - only show if there's media to download */}
                {(preview?.image || preview?.video) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const filename = `bonsai-${preview?.agentId || 'preview'}-${Date.now()}`;
                      downloadMedia(preview, filename);
                    }}
                    className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/70 hover:bg-brand-highlight/60 rounded-xl p-2 backdrop-blur-sm"
                    title="Download media"
                  >
                    <DownloadIcon className="w-5 h-5 text-white" />
                  </button>
                )}

                <Publication
                  key={`preview-${message.id}`}
                  publicationData={{
                    author: authenticatedProfile,
                    timestamp: message.createdAt,
                    metadata: {
                      __typename: preview?.video
                        ? "VideoMetadata"
                        : (preview?.image ? "ImageMetadata" : "TextOnlyMetadata"),
                      content,
                      video: preview?.video
                        ? {
                            item: typeof preview.video === "string" ? preview.video : (preview.video as any)?.url,
                            cover: preview.image
                          }
                        : undefined,
                      image: preview?.image
                        ? { item: preview.image }
                        : undefined
                    }
                  }}
                  theme={Theme.dark}
                  followButtonDisabled={true}
                  environment={LENS_ENVIRONMENT}
                  profileContainerStyleOverride={previewProfileContainerStyleOverride}
                  containerBorderRadius={'24px'}
                  containerPadding={'10px'}
                  profilePadding={'0 0 0 0'}
                  textContainerStyleOverride={textContainerStyleOverrides}
                  backgroundColorOverride={message.isAgent ? 'rgba(255,255,255, 0.08)' : 'rgba(255,255,255, 0.04)'}
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
                    const promptToSet = String(message.content.prompt || content || '');
                    setPrompt(promptToSet);
                    setPostContent('');

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
        {isGeneratingPreview && (
          <div ref={generatingRef} className="flex flex-col items-center mt-4">
            <AnimatedBonsaiGrid />
          </div>
        )}
      </div>
    </div>
  );
}