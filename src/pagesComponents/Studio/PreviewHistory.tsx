import { useEffect, useRef, useMemo } from 'react';
import { Publication, Theme } from "@madfi/widgets-react";
import { uniqBy } from "lodash/array";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, previewProfileContainerStyleOverride } from "@src/components/Publication/PublicationStyleOverrides";
import { Preview, useGetPreviews } from "@src/services/madfi/studio";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { GLOBAL_AGENT_ID, Memory } from '@src/services/madfi/terminal';
import AnimatedBonsai from '@src/components/LoadingSpinner/AnimatedBonsai';
import { AnimatedText } from '@src/components/LoadingSpinner/AnimatedText';
import useIsMounted from "@src/hooks/useIsMounted";

type PreviewHistoryProps = {
  currentPreview?: Preview;
  setCurrentPreview: (c: Preview) => void;
  isGeneratingPreview: boolean;
  templateUrl?: string;
  className?: string;
  roomId?: string;
  setFinalTemplateData: (t: any) => void;
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
};

type MemoryPreview = Memory & {
  isAgent: boolean;
  createdAtDate: Date;
}

type MessageContentPreview = {
  image?: string;
  video?: string;
  agentId?: string;
}

export default function PreviewHistory({
  currentPreview,
  setCurrentPreview,
  isGeneratingPreview,
  className,
  roomId,
  templateUrl,
  setFinalTemplateData,
  localPreviews,
  isFinalize,
  postImage,
}: PreviewHistoryProps) {
  const isMounted = useIsMounted();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: messages, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetPreviews(templateUrl, roomId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    return [..._messages, ..._localPreviews].sort((a, b) =>
      a.createdAtDate.getTime() - b.createdAtDate.getTime()
    );
  }, [messages, localPreviews]);

  // Scroll to bottom when generating
  useEffect(() => {
    if (isGeneratingPreview && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isGeneratingPreview]);

  // Scroll to bottom when mounted
  useEffect(() => {
    if (isMounted && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isMounted]);

  // Scroll to bottom when done generating and sorted messages changed
  useEffect(() => {
    const scrollToBottom = () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    };

    // Scroll immediately
    scrollToBottom();

    // Also scroll after a short delay to ensure all content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timeoutId);
  }, [sortedMessages.length]); // Only depend on length changes

  // Handle scroll containment
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      container.scrollTop += e.deltaY;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  if (isFinalize) {
    return (
      <div className="space-y-8" role="log" aria-live="polite">
        <Publication
          key={`preview`}
          publicationData={{
            author: authenticatedProfile,
            timestamp: Date.now(),
            metadata: {
              __typename: currentPreview?.video
                ? "VideoMetadata"
                : ((currentPreview?.image || currentPreview?.imagePreview || postImage?.length) ? "ImageMetadata" : "TextOnlyMetadata"),
              content: currentPreview?.text,
              video: currentPreview?.video
                ? {
                    item: typeof currentPreview.video === "string" ? currentPreview.video : currentPreview.video?.url,
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
    )
  }

  return (
    <div className={`relative flex h-full w-full flex-col ${className}`}>
      <div
        ref={containerRef}
        className="relative flex grow flex-col overflow-y-auto pt-4 pr-4 pl-4 focus:outline-none isolate"
        tabIndex={0}
        onScroll={(e) => {
          e.stopPropagation();
        }}
        onMouseEnter={() => {
          document.body.style.overflow = 'hidden';
        }}
        onMouseLeave={() => {
          document.body.style.overflow = 'auto';
        }}
        onTouchStart={() => {
          document.body.style.overflow = 'hidden';
        }}
        onTouchEnd={() => {
          document.body.style.overflow = 'auto';
        }}
      >
        <div className="space-y-8" role="log" aria-live="polite">
          {sortedMessages.map((message: MemoryPreview, index) => {
            if (!message.isAgent) return null; // not showing the user inputs, only previews
            if (index > 1 && message.agentId === sortedMessages[index - 2].agentId) return null; // HACK: when messages are fetched on the first try
            const templateData = JSON.parse(sortedMessages[index - 1].content.templateData as string);
            const content = message.content.text || currentPreview?.text;
            const preview = message.isAgent ? {
              ...message.content.preview as unknown as MessageContentPreview,
              text: content,
            } : undefined;
            return (
              <div
                key={`message-${index}`}
                className={`space-y-2 ${!message.isAgent ? 'ml-auto max-w-[80%]' : ''} ${preview?.agentId === currentPreview?.agentId ? "animate-pulse-green" : ""}`}
              >
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
                            item: typeof preview.video === "string" ? preview.video : preview.video?.url,
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
                  } : undefined}
                />
              </div>
            )
          })}
          {isGeneratingPreview && (
            <div className="mt-4">
              <div className="w-full min-w-[350px] bg-[rgba(255,255,255,0.08)] rounded-[24px] p-4">
                <div className="flex flex-col items-center gap-4">
                  <div>
                    <AnimatedBonsai duration={10} />
                  </div>
                  <div className="w-full">
                    <AnimatedText
                      lines={[
                        "Generating preview...",
                        "Sending content prompt to LLM...",
                        "Analyzing context and tone...",
                        "Processing language model response...",
                        "Enhancing semantic structure...",
                        "Refining writing style...",
                        "Optimizing content flow...",
                        "Applying creative improvements...",
                        "Running final quality checks...",
                        "Finalizing your masterpiece..."
                      ]}
                      duration={60}
                      className="text-lg text-white/70"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center text-[#ffffff] opacity-70 h-2">
          {isFetchingNextPage && (
            <span className="max-w-full font-mono ml-2">
              Loading more...
            </span>
          )}
        </div>

        <div className="" ref={bottomRef} />
      </div>
    </div>
  );
}