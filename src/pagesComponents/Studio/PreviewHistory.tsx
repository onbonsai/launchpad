import { useEffect, useRef, useMemo } from 'react';
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
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: messages, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetPreviews(templateUrl, roomId);
  const { data: registeredTemplates } = useRegisteredTemplates();
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedPublicationRef = useRef<HTMLDivElement>(null);

  // Add logging for debugging
  useEffect(() => {
    console.log('PreviewHistory: localPreviews changed', {
      count: localPreviews.length,
      previews: localPreviews.map(p => ({
        createdAt: p.createdAt,
        isAgent: p.isAgent,
        agentId: p.agentId,
        hasText: !!p.content.text,
        hasPreview: !!p.content.preview
      }))
    });
  }, [localPreviews]);

  useEffect(() => {
    console.log('PreviewHistory: messages changed', {
      totalPages: messages?.pages?.length || 0,
      totalMessages: messages?.pages?.flatMap(page => page.messages).length || 0
    });
  }, [messages]);

  // Combine and sort all previews
  const sortedMessages: MemoryPreview[] = useMemo(() => {
    const _messages = messages?.pages.flatMap(page =>
      page.messages.map(msg => ({
        ...msg,
        createdAtDate: new Date(msg.createdAt),
        isAgent: msg.userId === GLOBAL_AGENT_ID,
        agentId: msg.content.preview?.agentId,
      }))
    ) || [];

    // Convert local previews to the same format
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

    // Log the combination for debugging
    console.log('PreviewHistory: sortedMessages computed', {
      serverMessages: _messages.length,
      localPreviews: _localPreviews.length,
      combined: combined.length,
      duplicateIds: combined.length !== new Set(combined.map(m => m.id)).size,
      ids: combined.map(m => m.id)
    });

    return combined;
  }, [messages, localPreviews]);

  // Scroll to bottom when generating
  useEffect(() => {
    if (isGeneratingPreview && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isGeneratingPreview]);

  // Scroll to bottom when done generating and sorted messages changed
  useEffect(() => {
    if (!isGeneratingPreview && bottomRef.current && sortedMessages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [sortedMessages.length, isGeneratingPreview]);

  // Center the selected publication when it changes
  useEffect(() => {
    if (selectedPublicationRef.current && currentPreview && !isGeneratingPreview) {
      setTimeout(() => {
        selectedPublicationRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
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
      <div className="space-y-8 p-2 sm:p-4" role="log" aria-live="polite">
        {sortedMessages.map((message: MemoryPreview, index) => {
          if (!message.isAgent) return null; // not showing the user inputs, only previews
          if (index > 1 && message.agentId === sortedMessages[index - 2].agentId) return null; // HACK: when messages are fetched on the first try
          const templateData = JSON.parse(sortedMessages[index - 1].content.templateData as string);
          const content = message.content.text || currentPreview?.text;
          const preview = message.isAgent ? {
            ...message.content.preview as unknown as MessageContentPreview,
            text: content,
            templateName: (message.content.preview as any)?.templateName,
          } : undefined;
          const selected = preview?.agentId === currentPreview?.agentId;
          return (
            <div
              key={`message-${index}`}
              ref={selected ? selectedPublicationRef : null}
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
                    setPrompt(content || '');
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
          <div className="flex flex-col items-center mt-4">
            <AnimatedBonsaiGrid />
          </div>
        )}
      </div>

      <div ref={bottomRef} />
    </div>
  );
}