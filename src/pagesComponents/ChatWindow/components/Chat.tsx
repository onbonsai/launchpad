import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseEther } from "viem";
import useIsMounted from "@src/hooks/useIsMounted";
import clsx from 'clsx';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';
import useChat from '../hooks/useChat';
import type { AgentMessage, StreamEntry } from '../types';
import { markdownToPlainText } from '../utils';
import ChatInput from './ChatInput';
import StreamItem from './StreamItem';
import { pinFile, storjGatewayURL } from "@src/utils/storj";
import sendTokens from '../helpers/sendTokens';
import { base } from 'viem/chains';
import { BONSAI_TOKEN_BASE } from '../constants';
import { useGetMessages } from '@src/services/madfi/terminal';
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { format } from 'date-fns';
import useRegisteredTemplates from '@src/hooks/useRegisteredTemplates';
import { ELIZA_API_URL, Preview, SmartMedia } from '@src/services/madfi/studio';
import { useAuthenticatedLensProfile } from '@src/hooks/useLensProfile';
import { useRouter } from 'next/router';
import { BigDecimal, blockchainData, Post, SessionClient } from '@lens-protocol/client';
import { createSmartMedia } from '@src/services/madfi/studio';
import { createPost, uploadImageBase64, uploadVideo, Action } from "@src/services/lens/createPost";
import { resumeSession } from '@src/hooks/useLensLogin';
import { EvmAddress, toEvmAddress } from "@lens-protocol/metadata";
import { PROTOCOL_DEPLOYMENT } from '@src/services/madfi/utils';
import axios from 'axios';
import { encodeAbi } from '@src/utils/viem';
import { cloneDeep } from "lodash/lang";
import { Publication, Theme } from "@madfi/widgets-react";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, previewProfileContainerStyleOverride } from "@src/components/Publication/PublicationStyleOverrides";
import AnimatedBonsaiGrid from '@src/components/LoadingSpinner/AnimatedBonsaiGrid';
import { DownloadIcon } from '@heroicons/react/outline';
import { FastForwardIcon, FilmIcon } from '@heroicons/react/solid';
import { SparklesIcon } from '@heroicons/react/solid';
import { type StoryboardClip } from "@src/services/madfi/studio";
import { mapTemplateNameToTemplate } from "@src/utils/utils";

type ChatProps = {
  agentId: string;
  className?: string;
  agentName: string;
  agentWallet: `0x${string}`;
  media?: SmartMedia;
  conversationId?: string;
  post: Post;
  remixVersionQuery?: string;
  isRemixing?: boolean;
};

// Component to display preview messages using Publication
const PreviewMessage = ({
  preview,
  isAgent,
  timestamp,
  authenticatedProfile,
  onUseThis,
  isPending = false,
  onAddToStoryboard,
  isInStoryboard = false,
  storyboardCount = 0,
  onAnimateImage,
  onExtendVideo,
  onDownload,
  isProcessingVideo = false,
  isPosting = false
}: {
  preview?: Preview;
  isAgent: boolean;
  timestamp: Date;
  authenticatedProfile: any;
  onUseThis?: (preview: Preview) => void;
  isPending?: boolean;
  onAddToStoryboard?: (preview: Preview) => void;
  isInStoryboard?: boolean;
  storyboardCount?: number;
  onAnimateImage?: (preview: Preview) => void;
  onExtendVideo?: (preview: Preview) => void;
  onDownload?: (preview: Preview) => void;
  isProcessingVideo?: boolean;
  isPosting?: boolean;
}) => {
  if (isPending) {
    return (
      <div className={`${isAgent ? 'max-w-[80%]' : 'ml-auto max-w-[80%]'}`}>
        <div className="relative group">
          <AnimatedBonsaiGrid />
        </div>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const hasVideo = !!preview.video;
  const hasImage = !!preview.image;
  const canAddToStoryboard = hasVideo && onAddToStoryboard && storyboardCount < 10;

  return (
    <div className={`${isPosting ? '' : isAgent ? 'max-w-[80%]' : 'ml-auto max-w-[80%]'}`}>
      <div className="rounded-2xl bg-[#141414] relative overflow-hidden group">
        {/* Custom video container with max height */}
        {hasVideo && (
          <div className="relative max-h-[400px] overflow-hidden rounded-t-2xl">
            <video
              src={typeof preview.video === "string" ? preview.video : preview.video?.url}
              controls
              className="w-full h-full object-contain bg-black"
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}

        {/* Use Publication for the rest of the content */}
        <div className={hasVideo ? 'pt-0' : ''}>
          <Publication
            publicationData={{
              author: authenticatedProfile,
              timestamp: timestamp.getTime(),
              metadata: {
                __typename: preview.text ? "TextOnlyMetadata" : (preview.image && !hasVideo ? "ImageMetadata" : "TextOnlyMetadata"),
                content: preview.text || '',
                image: !hasVideo && (preview.imagePreview || preview.image)
                  ? { item: preview.imagePreview || preview.image }
                  : undefined
              }
            }}
            theme={Theme.dark}
            followButtonDisabled={true}
            environment={LENS_ENVIRONMENT}
            profileContainerStyleOverride={previewProfileContainerStyleOverride}
            containerBorderRadius={hasVideo ? '0' : '16px'}
            containerPadding={'10px'}
            profilePadding={'0 0 0 0'}
            textContainerStyleOverride={textContainerStyleOverrides}
            backgroundColorOverride={'transparent'}
            mediaImageStyleOverride={mediaImageStyleOverride}
            imageContainerStyleOverride={imageContainerStyleOverride}
            reactionsContainerStyleOverride={reactionsContainerStyleOverride}
            reactionContainerStyleOverride={reactionContainerStyleOverride}
            shareContainerStyleOverride={shareContainerStyleOverride}
            markdownStyleBottomMargin={'0'}
            heartIconOverride={true}
            messageIconOverride={true}
            shareIconOverride={true}
            fullVideoHeight={false}
          />
        </div>

        {/* Action buttons */}
        {isAgent && (
          <div className="flex justify-end gap-2 p-4 bg-[#141414] -mt-14">
            {/* Animate image button - only for images */}
            {hasImage && !hasVideo && onAnimateImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAnimateImage(preview);
                }}
                className="flex items-center bg-transparent gap-1 rounded-lg px-2 py-1 text-lg backdrop-blur-sm hover:bg-brand-highlight/60 transition-colors"
                title="Animate this image"
              >
                <SparklesIcon className="w-4 h-4 text-white" />
                Use in video
              </button>
            )}

            {/* Add to Storyboard button - only for videos */}
            {canAddToStoryboard && (
              <button
                onClick={() => !isInStoryboard && onAddToStoryboard(preview)}
                disabled={isInStoryboard || storyboardCount >= 10}
                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-lg transition-colors ${
                  isInStoryboard || storyboardCount >= 10
                    ? ' text-gray-400 cursor-not-allowed'
                    : 'bg-transparent hover:bg-brand-highlight/60 text-white'
                }`}
                title={isInStoryboard ? "Already in storyboard" : storyboardCount >= 10 ? "Storyboard full" : "Add to storyboard"}
              >
                <FilmIcon className={`w-5 h-5 ${isInStoryboard || storyboardCount >= 10 ? 'text-gray-400' : 'text-white'}`} />
                {isInStoryboard ? "In storyboard" : storyboardCount >= 10 ? "Storyboard full" : "Add to storyboard"}
              </button>
            )}

            {/* Extend Video button - only for videos */}
            {hasVideo && onExtendVideo && !isPosting && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExtendVideo(preview);
                }}
                className="flex items-center bg-transparent gap-1 rounded-lg px-2 py-1 text-lg hover:bg-brand-highlight/60 transition-colors"
                title="Extend this video"
              >
                <FastForwardIcon className="w-5 h-5 text-white" />
                Extend
              </button>
            )}

            {/* Download button - only show if there's media to download */}
            {(hasImage || hasVideo) && onDownload && !isPosting && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(preview);
                }}
                disabled={hasVideo && isProcessingVideo}
                className={`relative bg-transparent hover:bg-brand-highlight/60 rounded-lg px-2 py-1 text-lg transition-colors ${hasVideo && isProcessingVideo ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={`Download media${hasVideo ? ' (with branding)' : ''}`}
              >
                <DownloadIcon className="w-5 h-5 text-white" />
                {hasVideo && isProcessingVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner customClasses="h-4 w-4" color="#ffffff" />
                  </div>
                )}
              </button>
            )}

            {/* Use this button */}
            {onUseThis && !isPosting && (
              <button
                onClick={() => onUseThis(preview)}
                className="flex items-center gap-1 bg-brand-highlight rounded-lg px-2 py-1 hover:bg-brand-highlight/80 transition-colors text-black font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Use this
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Chat({ className, agentId, agentWallet, media, conversationId, post, remixVersionQuery, isRemixing }: ChatProps) {
  const isMounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: messageData, isLoading: isLoadingMessageHistory, error } = useGetMessages(agentId, conversationId);
  const { data: registeredTemplates } = useRegisteredTemplates();
  const { messages: messageHistory, canMessage } = messageData || {};
  const [userInput, setUserInput] = useState('');
  const [attachment, setAttachment] = useState<File | undefined>();
  const [requestPayload, setRequestPayload] = useState<any|undefined>();
  const [isThinking, setIsThinking] = useState(false);
  const [currentAction, setCurrentAction] = useState<string|undefined>();
  const [loadingDots, setLoadingDots] = useState('');
  const [streamEntries, setStreamEntries] = useState<StreamEntry[]>([]);
  const [requireBonsaiPayment, setRequireBonsaiPayment] = useState<number | undefined>();
  const [currentPreview, setCurrentPreview] = useState<Preview | undefined>();
  const [localPreviews, setLocalPreviews] = useState<Array<{
    isAgent: boolean;
    createdAt: string;
    agentId?: string;
    pending?: boolean;
    tempId?: string;
    content: {
      preview?: Preview;
      templateData?: string;
      text?: string;
    };
  }>>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postingPreview, setPostingPreview] = useState<Preview | undefined>();
  const [imageToExtend, setImageToExtend] = useState<string | null>(null);

  const storyboardKey = `storyboard-${post?.slug || 'default'}`;
  const [storyboardClips, setStoryboardClips] = useState<StoryboardClip[]>([]);
  const [storyboardAudio, setStoryboardAudio] = useState<File | string | null>(null);
  const [storyboardAudioStartTime, setStoryboardAudioStartTime] = useState<number>(0);
  const [isStoryboardInitialized, setIsStoryboardInitialized] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState<Record<string, boolean>>({});

  // Helper to get video duration, needed for initializing from original post
  const getVideoDuration = (videoUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.addEventListener('loadedmetadata', () => {
        resolve(video.duration || 6);
      });
      video.addEventListener('error', () => {
        resolve(6); // Default duration on error
      });
      video.src = videoUrl;
      video.load();
    });
  };

  // 1. Refactor: extract the 'initialize from original post media' logic to a function
  const initializeStoryboardFromOriginal = useCallback(async () => {
    const templateData = media?.templateData as any;
    if (templateData?.clips && Array.isArray(templateData.clips)) {
      const initialClips: StoryboardClip[] = await Promise.all(
        templateData.clips.map(async (clip: any, index: number) => {
          const duration = await getVideoDuration(clip.video?.url).catch(() => 6);
          return {
            id: clip.agentId || `clip-${index}`,
            preview: {
              video: clip.video?.url ? { url: clip.video.url } : clip.video,
              image: clip.image || clip.thumbnail,
              imagePreview: clip.imagePreview || clip.thumbnail,
              text: clip.sceneDescription || clip.text || '',
              agentId: clip.agentId || `clip-${index}`,
              templateName: media?.template || 'unknown',
              templateData: {
                prompt: clip.prompt || clip.sceneDescription || '',
                sceneDescription: clip.sceneDescription || '',
                elevenLabsVoiceId: clip.elevenLabsVoiceId,
                narration: clip.narration,
                stylePreset: clip.stylePreset,
                subjectReference: clip.subjectReference,
                aspectRatio: clip.aspectRatio,
                ...clip.templateData
              },
            },
            startTime: 0,
            endTime: duration,
            duration: duration,
          };
        })
      );
      setStoryboardClips(initialClips);
    } else if (media?.template === 'video' && templateData) {
      const videoData = (templateData as any).video ||
        ((post.metadata as any)?.video?.item ? { url: (post.metadata as any).video.item } : undefined);
      const imageData = (templateData as any).image ||
        (templateData as any).imagePreview ||
        (post.metadata as any)?.video?.cover ||
        null;
      const videoUrl = videoData?.url || videoData;
      const duration = videoUrl ? await getVideoDuration(videoUrl).catch(() => 6) : 6;
      setStoryboardClips([
        {
          id: media.agentId || 'single-clip',
          preview: {
            video: videoData,
            image: imageData,
            imagePreview: imageData,
            text: templateData.sceneDescription || templateData.prompt || '',
            agentId: media.agentId || 'single-clip',
            templateName: media.template,
            templateData: {
              prompt: templateData.prompt || '',
              sceneDescription: templateData.sceneDescription || '',
              elevenLabsVoiceId: templateData.elevenLabsVoiceId,
              narration: templateData.narration,
              stylePreset: templateData.stylePreset,
              subjectReference: templateData.subjectReference,
              aspectRatio: templateData.aspectRatio || '9:16',
              subTemplateId: templateData.subTemplateId,
              enableMaxMode: templateData.enableMaxMode,
              ...templateData
            },
          },
          startTime: 0,
          endTime: duration,
          duration: duration,
        },
      ]);
    } else {
      setStoryboardClips([]);
    }
    if (templateData?.audioData) {
      setStoryboardAudio(templateData.audioData);
    } else {
      setStoryboardAudio(null);
    }
    if (templateData?.audioStartTime) {
      setStoryboardAudioStartTime(templateData.audioStartTime);
    } else {
      setStoryboardAudioStartTime(0);
    }
    setIsStoryboardInitialized(true);
  }, [media, post, getVideoDuration]);

  // 2. Update useEffect to use the new function
  useEffect(() => {
    const storyboardKey = `storyboard-${post?.slug || 'default'}`;
    if (isStoryboardInitialized || !post?.slug) return;
    // Try to load from localStorage first
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storyboardKey);
      if (saved) {
        try {
          const storyboardData = JSON.parse(saved);
          setStoryboardClips(storyboardData.clips.map((c: any) => ({
            id: c.id,
            preview: c.preview,
            startTime: c.startTime,
            endTime: c.endTime,
            duration: c.duration
          })));
          setStoryboardAudio(storyboardData.audio);
          setStoryboardAudioStartTime(storyboardData.audioStartTime);
          setIsStoryboardInitialized(true);
          return;
        } catch (e) {
          console.error('Failed to parse saved storyboard:', e);
        }
      }
    }
    // If nothing in localStorage, initialize from original post media
    initializeStoryboardFromOriginal();
  }, [post?.slug, media, isStoryboardInitialized, initializeStoryboardFromOriginal]);

  // Save storyboard to localStorage whenever it changes
  useEffect(() => {
    if (isStoryboardInitialized) {
      const storyboardData = {
        clips: storyboardClips.map(c => ({
          id: c.id,
          preview: c.preview,
          startTime: c.startTime,
          endTime: c.endTime,
          duration: c.duration
        })),
        audio: storyboardAudio,
        audioStartTime: storyboardAudioStartTime
      };
      localStorage.setItem(storyboardKey, JSON.stringify(storyboardData));
    }
  }, [storyboardClips, storyboardAudio, storyboardAudioStartTime, post?.id, isStoryboardInitialized]);

  const router = useRouter();

  // --- Worker Management Logic ---
  const workerRef = useRef<Worker | undefined>(undefined);
  const workerMessageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const [pendingGenerations, setPendingGenerations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!workerRef.current) {
      const worker = new Worker(new URL('../../../services/preview.worker.ts', import.meta.url));

      worker.onmessage = (event) => {
        if (workerMessageHandlerRef.current) {
          workerMessageHandlerRef.current(event);
        }
      };

      worker.onerror = (error) => {
        console.error('[Chat] Worker error:', error);
        toast.error('Generation worker encountered an error');
      };

      workerRef.current = worker;
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    workerMessageHandlerRef.current = async (event: MessageEvent) => {
      const { success, error, tempId } = event.data;

      if (success) {
        const result = cloneDeep(event.data.result);

        if (result.preview?.video?.buffer) {
          const videoBlob = new Blob([result.preview.video.buffer], { type: result.preview.video.mimeType });
          result.preview.video.url = URL.createObjectURL(videoBlob);
          result.preview.video.blob = videoBlob;
          delete result.preview.video.buffer;
        }

        if (result.preview?.image?.buffer && result.preview?.image?.isLargeImage) {
          const imageBlob = new Blob([result.preview.image.buffer], { type: result.preview.image.mimeType });
          const imageDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(imageBlob);
          });
          result.preview.image = imageDataUrl;
        }

        const previewWithMetadata = {
          ...result.preview,
          agentId: result.agentId,
          roomId: result.roomId,
          agentMessageId: result.agentMessageId,
        };

        setPendingGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        setLocalPreviews(prev => {
          const newPreviews = prev.map(p => {
            if ((p as any).tempId === tempId) {
              return {
                ...p,
                pending: false,
                agentId: result.agentId,
                content: {
                  ...p.content,
                  preview: previewWithMetadata,
                  text: p.content.text || result.preview.text, // Keep the original prompt
                }
              } as any;
            }
            return p;
          });

          if (!newPreviews.some((p: any) => p.agentId === result.agentId)) {
            newPreviews.push({
              isAgent: true,
              createdAt: new Date().toISOString(),
              agentId: result.agentId,
              content: {
                preview: previewWithMetadata,
                text: result.preview.text,
              }
            });
          }

          return newPreviews;
        });

      } else {
        console.error(`[Chat] Worker failed for tempId: ${tempId}`, error);
        toast.error(`Generation failed: ${error}`);

        setPendingGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        setLocalPreviews(prev => prev.filter((p: any) => p.tempId !== tempId));
      }
    };
  }, [localPreviews]);
  // --- End Worker Management ---

  const handlePostButtonClick = useCallback((preview: Preview) => {
    setPostingPreview(preview);
    setIsPosting(true);
    if (preview.text) {
      setUserInput(preview.text);
    }
  }, [setUserInput]);

  const handleCancelPost = useCallback(() => {
    setIsPosting(false);
    setPostingPreview(undefined);
  }, []);

  useEffect(() => {
    if (!isThinking) return;

    const dotsInterval = setInterval(() => {
      setLoadingDots((prev) => (prev.length >= 3 ? '' : `${prev}.`));
    }, 500);

    return () => clearInterval(dotsInterval);
  }, [isThinking]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSuccess = useCallback((messages: AgentMessage[]) => {
    let message = messages.find((res) => res.event === 'agent');
    if (!message) {
      message = messages.find((res) => res.event === 'tools');
    }
    if (!message) {
      message = messages.find((res) => res.event === 'error');
    }
    const streamEntry: StreamEntry = {
      timestamp: new Date(),
      content: markdownToPlainText(message?.data || ''),
      type: 'agent',
      attachments: message?.attachments,
    };
    setStreamEntries((prev) => [...prev, streamEntry]);

    // Ensure thinking state is cleared when we get a response
    setIsThinking(false);
    setCurrentAction(undefined);
  }, [setIsThinking, setCurrentAction]);

  const { postChat, isLoading, canMessageAgain } = useChat({
    onSuccess: handleSuccess,
    conversationId: conversationId || '',
    agentId,
    userId: address,
    setIsThinking,
    setCurrentAction
  });

  // Clean up temporary messages when they appear in messageHistory
  useEffect(() => {
    if (messageHistory && messageHistory.length > 0) {
      setStreamEntries(prev => prev.filter(entry => {
        // Keep all non-temporary entries
        if (!entry.isTemporary) return true;

        // Check if this temporary message now exists in messageHistory
        const existsInHistory = messageHistory.some(msg =>
          msg.content.source === "bonsai-terminal" &&
          msg.content.text === entry.content.split('\n')[0]
        );

        // Keep temporary messages that aren't in history yet
        return !existsInHistory;
      }));
    }
  }, [messageHistory]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userInput.trim()) {
        return;
      }

      let _requestPayload = {};
      if (requireBonsaiPayment && requireBonsaiPayment > 0) {
        let toastId;
        try {
          toastId = toast.loading("Sending tokens...");
          const amount = parseEther(requireBonsaiPayment.toString());
          const hash = await sendTokens(
            walletClient,
            agentWallet,
            amount,
            base,
            BONSAI_TOKEN_BASE
          );
          toast.success("Tokens sent", { id: toastId });
          _requestPayload = { verifyTransfer: {
            hash,
            chainId: base.id,
            amount: amount.toString(),
            to: agentWallet,
            token: BONSAI_TOKEN_BASE
          }};
        } catch (error) {
          console.log(error);
          toast.dismiss(toastId)
          toast.error("Failed to send tokens");
          return;
        }
      }

      let imageURL;
      if (attachment) {
        imageURL = storjGatewayURL(await pinFile(attachment));
        console.log(`imageURL: ${imageURL}`);
      }

      // Store the user input before clearing it
      const messageContent = userInput.trim() + (imageURL ? `\n${imageURL}` : '');
      const originalUserInput = userInput.trim();

      setUserInput('');
      setAttachment(undefined);
      setRequireBonsaiPayment(undefined);

      // Add a temporary local message that will be replaced when the backend confirms
      const tempUserMessage: StreamEntry = {
        timestamp: new Date(),
        type: 'user',
        content: messageContent,
        isTemporary: true, // Mark it as temporary
      };

      setStreamEntries((prev) => [...prev, tempUserMessage]);

      // Call postChat but don't rely on its onSuccess callback since it might be unreliable
      try {
        await postChat(originalUserInput, { ...requestPayload, ..._requestPayload }, imageURL);
      } catch (error) {
        console.error('Error in postChat:', error);
        // Remove the temporary message on error
        setStreamEntries((prev) => prev.filter(entry => entry !== tempUserMessage));
        setIsThinking(false);
        toast.error("Failed to send message");
      }

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    [postChat, userInput, requestPayload, attachment, requireBonsaiPayment, agentWallet, walletClient],
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isPosting && postingPreview) {
          handlePost(userInput);
        } else {
          handleSubmit(e);
        }
      }
    },
    [handleSubmit, isPosting, postingPreview, userInput],
  );

  useEffect(() => {
    if (!isLoadingMessageHistory && messageHistory) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [streamEntries, isLoadingMessageHistory, messageHistory]);

  const checkReferralStatus = async (address: string) => {
    try {
      const response = await axios.get(`/api/referrals/status?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('Error checking referral status:', error);
      return null;
    }
  };

  const handlePost = useCallback(async (text: string) => {
    if (!postingPreview) return;

    let toastId;
    try {
      const sessionClient = await resumeSession(true);
      let idToken;
      if (!sessionClient && !authenticatedProfile) {
        toast.error("Not authenticated");
        return;
      } else {
        const creds = await (sessionClient as SessionClient).getCredentials();
        if (creds.isOk()) {
          idToken = creds.value?.idToken;
        } else {
          toast.error("Failed to get credentials");
          return;
        }
      }

      let image;
      let video;

      toastId = toast.loading("Creating your post...", { id: toastId });

      const template = media ? mapTemplateNameToTemplate(media?.template, registeredTemplates || []) : undefined;
      if (!template) throw new Error("template not found")

      if (postingPreview.video && !postingPreview.video.url?.startsWith("https://")) {
        const { uri: videoUri, type } = await uploadVideo(postingPreview.video.blob, postingPreview.video.mimeType);
        video = { url: videoUri, type };
      } else if (postingPreview.video) {
        const url = typeof postingPreview.video === "string" ? postingPreview.video : postingPreview.video?.url;
        video = { url, type: "video/mp4" };
      }

      if (postingPreview.image && postingPreview.image.startsWith("https://")) {
        image = { url: postingPreview.image, type: "image/png" };
      } else if (postingPreview.image) {
        const { uri: imageUri, type } = await uploadImageBase64(postingPreview.image);
        image = { url: imageUri, type };
      }

      const referralStatus = await checkReferralStatus(address as string);

      let recipients: { address: EvmAddress; percent: number }[] = [];
      if (referralStatus?.hasReferrer && !referralStatus?.firstPostUsed) {
        recipients = [
          {
            address: toEvmAddress(address as string),
            percent: 40
          },
          {
            address: toEvmAddress(referralStatus.referrer),
            percent: 40
          },
          {
            address: toEvmAddress(template.protocolFeeRecipient),
            percent: 20,
          }
        ];
      } else {
        recipients = [
          {
            address: toEvmAddress(address as string),
            percent: 80
          },
          {
            address: toEvmAddress(template.protocolFeeRecipient),
            percent: 20,
          }
        ];
      }

      const { payToCollect } = post?.actions?.find(action => action.__typename === "SimpleCollectAction") || {};

      let collectValue;
      if (payToCollect && payToCollect.amount?.asset.contract.address === PROTOCOL_DEPLOYMENT.lens.Bonsai) {
        collectValue = payToCollect.amount?.value;
      }
      let actions: Action[] = []
      if (!!collectValue) {
        actions.push({
          simpleCollect: {
            payToCollect: {
              amount: {
                currency: toEvmAddress(PROTOCOL_DEPLOYMENT.lens.Bonsai),
                value: collectValue as BigDecimal
              },
              recipients,
              referralShare: 5,
            }
          }
        });
      }
      if (media?.token?.address && media?.token?.chain === "lens") {
        actions.push({
          unknown: {
            address: toEvmAddress(PROTOCOL_DEPLOYMENT.lens.RewardSwap),
            params: [{
              raw: {
                key: blockchainData("0xee737c77be2981e91c179485406e6d793521b20aca5e2137b6c497949a74bc94"),
                data: blockchainData(encodeAbi(['address'], [media?.token.address]))
              }
            }],
          }
        })
      }

      const result = await createPost(
        sessionClient as SessionClient,
        walletClient,
        {
          text,
          image,
          video,
          template,
          tokenAddress: media?.token?.address,
          remix: media?.postId ? {
            postId: media.postId,
            version: remixVersionQuery ? parseInt(remixVersionQuery as string) : media.versions?.length ?? 0
          } : undefined,
          actions
        }
      );

      if (!result?.postId) throw new Error("No result from createPost");

      toastId = toast.loading("Finalizing...", { id: toastId });

      // Process audio helper function (same as in studio create)
      const processAudio = async (audio: any) => {
        if (!audio) return undefined;
        if (typeof audio === 'string') return { data: audio };
        if ('url'in audio && audio.url) return { name: audio.name, data: audio.url };
        if (audio instanceof File) {
          const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(audio);
          });
          return { name: audio.name, data };
        }
        return audio;
      };

      const smartMediaResult = await createSmartMedia(
        template.apiUrl,
        idToken,
        JSON.stringify({
          roomId: conversationId,
          agentId: postingPreview.agentId,
          postId: result.postId,
          uri: result.uri,
          token: media?.token,
          params: {
            templateName: template.name,
            category: template.category,
            templateData: postingPreview.templateData,
          },
          storyboard: storyboardClips.length > 0 ? {
            clips: storyboardClips.map(clip => ({
              id: clip.id,
              startTime: clip.startTime,
              endTime: clip.endTime,
              templateData: {
                video: clip.preview.video,
                image: clip.preview.image,
                ...clip.templateData,
              },
            })),
            audioData: await processAudio(storyboardAudio),
            audioStartTime: storyboardAudioStartTime,
            roomId: conversationId as string
          } : undefined
        })
      );

      if (!smartMediaResult) throw new Error(`failed to send request to ${template.apiUrl}/post/create`);

      // Delete the storyboard from localStorage
      localStorage.removeItem(storyboardKey);

      toast.success("Done! Going to post...", { duration: 5000, id: toastId });
      setTimeout(() => router.push(`/post/${result.postId}`), 2000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create post", { id: toastId });
      Sentry.captureException(error);
    } finally {
      setIsPosting(false);
      setPostingPreview(undefined);
      setUserInput('');

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [postingPreview, authenticatedProfile, walletClient, conversationId, address, media, post, registeredTemplates, remixVersionQuery]);

  // Handler for adding to storyboard
  const handleAddToStoryboard = useCallback((preview: Preview) => {
    if (storyboardClips.length >= 10) {
      toast.error("You can add a maximum of 10 clips to the storyboard");
      return;
    }

    if (storyboardClips.some(c => c.id === preview.agentId)) {
      toast("This clip is already in your storyboard", { icon: 'ℹ️' });
      return;
    }

    // Add the new clip to the storyboard
    const newClip: StoryboardClip = {
      id: preview.agentId as string,
      preview: preview,
      startTime: 0,
      endTime: 6, // Default duration, will be updated
      duration: 6,
    };
    setStoryboardClips(prev => [...prev, newClip]);
    toast.success("Added to storyboard!");
  }, [storyboardClips]);

  // Handler for animating image (extending video)
  const handleAnimateImage = useCallback(async (preview: Preview) => {
    if (!registeredTemplates) {
      toast.error("Templates not loaded yet.");
      return;
    }
    // find a template with "video" in the name (case-insensitive)
    const videoTemplate = registeredTemplates.find(t => t.name.toLowerCase().includes('video'));
    if (!videoTemplate) {
      toast.error("Video template not found");
      return;
    }

    try {
      let imageToUse: string | undefined;
      // For extend video, we need to extract the last frame
      if (preview.video) {
        imageToUse = await extractLastFrameFromVideo(preview.video);
        toast.success("Last frame extracted! Opening remix form...", { duration: 3000 });
      } else if (preview.image) { // This is for "Animate image"
        imageToUse = preview.image;
        toast.success("Image ready for animation! Opening remix form...", { duration: 3000 });
      }

      if (imageToUse) {
        setImageToExtend(imageToUse);
      } else {
        toast.error("No image found to extend or animate.");
      }
    } catch (error) {
      console.error('Failed to process image/video:', error);
      toast.error("Failed to process media for animation");
    }
  }, [registeredTemplates, setImageToExtend]);

  // Helper function to extract the last frame from a video
  const extractLastFrameFromVideo = (video: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check if we actually have video data
      if (!video) {
        reject(new Error('No video data provided'));
        return;
      }

      // If the video is already an image (data URL), return it directly
      if (typeof video === 'string' && video.startsWith('data:image/')) {
        resolve(video);
        return;
      }

      const videoElement = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      videoElement.crossOrigin = 'anonymous';
      videoElement.muted = true;

      videoElement.onloadedmetadata = () => {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        videoElement.currentTime = videoElement.duration;
      };

      videoElement.onseeked = () => {
        try {
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (error) {
          reject(error);
        }
      };

      videoElement.onerror = (e) => {
        reject(new Error(`Failed to load video: ${e}`));
      };

      // Handle different video source types
      try {
        if (typeof video === 'string') {
          // Check if it's a data URL for an image - this should not happen for video
          if (video.startsWith('data:image/')) {
            resolve(video);
            return;
          }
          videoElement.src = video;
        } else if (video.url) {
          videoElement.src = video.url;
        } else if (video.blob) {
          videoElement.src = URL.createObjectURL(video.blob);
        } else {
          reject(new Error('Invalid video source'));
          return;
        }
      } catch (error) {
        reject(new Error(`Failed to set video source: ${error}`));
      }
    });
  };

  // Download functionality
  const downloadVideoWithOutro = async (preview: any, filename: string) => {
    const agentId = preview.agentId || 'unknown';

    if (isProcessingVideo?.[agentId]) {
      return;
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
          isBlob
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

  // Enhanced download function
  const downloadMedia = async (preview: any, filename: string) => {
    try {
      // Handle video download with outro
      if (preview?.video) {
        return downloadVideoWithOutro(preview, filename);
      }

      // Handle image download
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

  // Wrapper function for download handler to match expected signature
  const handleDownload = useCallback((preview: Preview) => {
    const filename = `bonsai-${preview.agentId || 'preview'}-${Date.now()}`;
    downloadMedia(preview, filename);
  }, []);

  // Wrapper function for extend video handler to match expected signature
  const handleExtendVideo = useCallback((preview: Preview) => {
    handleAnimateImage(preview);
  }, [handleAnimateImage]);

    // Combine and sort all messages chronologically
  const allMessages = useMemo(() => {
    const messages: Array<{
      type: 'message' | 'stream' | 'local';
      timestamp: Date;
      data: any;
      id: string;
    }> = [];

    // Track user message IDs from backend to filter out temporary ones
    const backendUserMessageContents = new Set<string>();

    // Add message history
    if (messageHistory && messageHistory.length > 0) {
      messageHistory.forEach((message) => {
        // Track user messages from backend
        if (message.content.source === "bonsai-terminal") {
          backendUserMessageContents.add(message.content.text);
        }

        messages.push({
          type: 'message',
          timestamp: new Date(message.createdAt as number),
          data: message,
          id: `message-${message.id}`
        });
      });
    }

    // Add stream entries - include temporary user messages until they appear in messageHistory
    streamEntries.forEach((entry, index) => {
      // Skip temporary user messages if they're already in messageHistory
      if (entry.type === 'user' && entry.isTemporary && backendUserMessageContents.has(entry.content)) {
        return;
      }

      // Add all agent messages and temporary user messages not yet in backend
      if (entry.type === 'agent' || (entry.type === 'user' && entry.isTemporary)) {
        messages.push({
          type: 'stream',
          timestamp: entry.timestamp,
          data: entry,
          id: `stream-${entry.timestamp.toISOString()}-${index}`
        });
      }
    });

    // Add local previews
    localPreviews.forEach((preview, index) => {
      // Handle both string and numeric timestamps
      let timestamp: Date;
      if (typeof preview.createdAt === 'string') {
        // Try parsing as ISO string first, then as unix timestamp
        if (preview.createdAt.includes('-') || preview.createdAt.includes('T')) {
          timestamp = new Date(preview.createdAt);
        } else {
          timestamp = new Date(parseInt(preview.createdAt));
        }
      } else {
        timestamp = new Date(preview.createdAt);
      }

      messages.push({
        type: 'local',
        timestamp,
        data: preview,
        id: `local-${preview.createdAt}-${index}`
      });
    });

    // Sort by timestamp (oldest first)
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messageHistory, streamEntries, localPreviews]);

  // 3. Add reset handler
  const handleResetStoryboard = useCallback(() => {
    const storyboardKey = `storyboard-${post?.slug || 'default'}`;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storyboardKey);
    }
    initializeStoryboardFromOriginal();
  }, [post?.slug, initializeStoryboardFromOriginal]);

  return (
    <div className={clsx("relative flex h-full w-full flex-col", className)}>
      {/* Storyboard indicator - always show when remixing */}
      {isRemixing ? (
        <div className="bg-brand-highlight/10 border-b border-brand-highlight/20 px-4 py-2 flex items-center justify-between mb-4 -mt-2">
          <div className="flex items-center gap-2">
            <FilmIcon className="w-4 h-4" />
            <span className="text-xs text-white">
              Storyboard: {storyboardClips.length} clip{storyboardClips.length !== 1 ? 's' : ''}
            </span>
            {/* Reset button, small and subtle */}
            <button
              onClick={handleResetStoryboard}
              className="ml-3 text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600 transition-colors"
              style={{ fontSize: '11px', lineHeight: '1.1' }}
              type="button"
            >
              Reset
            </button>
          </div>
          {/* If no clips, show 'Nothing added yet' */}
          {storyboardClips.length === 0 && (
            <span className="text-xs text-zinc-400 ml-4">Nothing added yet</span>
          )}
        </div>
      ) : (
        storyboardClips.length > 0 && (
          <div className="bg-brand-highlight/10 border-b border-brand-highlight/20 px-4 py-2 flex items-center justify-between mb-4 -mt-2">
            <div className="flex items-center gap-2">
              <FilmIcon className="w-4 h-4" />
              <span className="text-xs text-white">
                Storyboard: {storyboardClips.length} clip{storyboardClips.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )
      )}

      <div className="relative flex grow flex-col overflow-y-auto pr-2 pl-2 pb-2 overscroll-contain">
        {isLoadingMessageHistory ? (
          <div className="flex justify-center my-6">
            <Spinner customClasses="h-6 w-6" color="#5be39d" />
          </div>
        ) : (
          <>
            {!isPosting && (
              <>
                {allMessages.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-zinc-500 mb-2 text-center">
                      Conversation ({allMessages.length} messages)
                    </div>
                    <div className="space-y-4">
                      {allMessages.map((item, index) => {
                        if (item.type === 'message') {
                          const message = item.data;
                          return (
                            <div key={item.id} className="space-y-2">
                              {message.content.preview ? (
                                <div className="mb-4">
                                  {/* Show user prompt if this is an agent message with preview */}
                                  {message.content.source !== "bonsai-terminal" && message.content.text && (
                                    <div className="flex justify-end mb-2">
                                      <div className="bg-dark-grey px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%]">
                                        <span className="text-white text-[16px]">{message.content.text}</span>
                                      </div>
                                    </div>
                                  )}
                                  <PreviewMessage
                                    preview={{
                                      ...(message.content.preview as Preview),
                                      text: message.content.text,
                                    }}
                                    isAgent={message.content.source !== "bonsai-terminal"}
                                    timestamp={item.timestamp}
                                    authenticatedProfile={authenticatedProfile}
                                    onUseThis={handlePostButtonClick}
                                    onAddToStoryboard={handleAddToStoryboard}
                                    isInStoryboard={storyboardClips.some(c => c.id === (message.content.preview as Preview).agentId)}
                                    storyboardCount={storyboardClips.length}
                                    onAnimateImage={handleAnimateImage}
                                    onExtendVideo={handleExtendVideo}
                                    onDownload={handleDownload}
                                    isProcessingVideo={isProcessingVideo[(message.content.preview as Preview)?.agentId || 'unknown']}
                                    isPosting={isPosting}
                                  />
                                </div>
                              ) : (
                                <StreamItem
                                  entry={{
                                    timestamp: item.timestamp,
                                    type: message.content.source === "bonsai-terminal" ? "user" : "agent",
                                    content: markdownToPlainText(message.content.text),
                                  }}
                                  setUserInput={setUserInput}
                                  setRequestPayload={setRequestPayload}
                                />
                              )}
                            </div>
                          );
                        } else if (item.type === 'stream') {
                          const entry = item.data;
                          return (
                            <StreamItem
                              key={item.id}
                              entry={entry}
                              setUserInput={setUserInput}
                              setRequestPayload={setRequestPayload}
                            />
                          );
                        } else if (item.type === 'local') {
                          const preview = item.data;

                          // Determine if this is a user message (no preview) or agent message (has preview or pending)
                          const isUserMessage = !preview.content.preview && !(preview as any).pending;
                          const isAgentMessage = preview.content.preview || (preview as any).pending;

                          if (isUserMessage) {
                            // User messages go on the right side
                            return (
                              <div key={item.id} className="flex justify-end mb-2">
                                <div className="bg-dark-grey px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%]">
                                  <span className="text-white text-[16px]">{preview.content.text}</span>
                                </div>
                              </div>
                            );
                          }

                          if (isAgentMessage) {
                            // Agent messages go on the left side with extra bottom margin
                            return (
                              <div key={item.id} className="mb-4">
                                <PreviewMessage
                                  preview={preview.content.preview}
                                  isAgent={true} // Force to true for agent messages
                                  timestamp={item.timestamp}
                                  authenticatedProfile={authenticatedProfile}
                                  onUseThis={preview.content.preview ? handlePostButtonClick : undefined}
                                  isPending={(preview as any).pending}
                                  onAddToStoryboard={preview.content.preview ? handleAddToStoryboard : undefined}
                                  isInStoryboard={preview.content.preview ? storyboardClips.some(c => c.id === preview.content.preview?.agentId) : false}
                                  storyboardCount={storyboardClips.length}
                                  onAnimateImage={handleAnimateImage}
                                  onExtendVideo={handleExtendVideo}
                                  onDownload={handleDownload}
                                  isProcessingVideo={isProcessingVideo?.[(preview.content.preview as Preview)?.agentId || 'unknown']}
                                  isPosting={isPosting}
                                />
                              </div>
                            );
                          }
                        }

                        return null;
                      })}
                    </div>
                  </div>
                )}

                <div
                  className={`mt-4 flex items-center text-[#ffffff] opacity-70 ${
                    !isPosting ? "flex-grow min-h-6" : "h-6"
                  }`}
                >
                  {isThinking && (
                    <span className="max-w-full font-mono">
                      {currentAction ? `${currentAction} ${loadingDots}` : loadingDots}
                    </span>
                  )}
                </div>
              </>
            )}
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {isPosting && postingPreview && (
        <div className="px-2 mb-4 relative">
          <button
            onClick={handleCancelPost}
            className="absolute top-2 right-2 p-1 rounded-full bg-dark-grey/80 hover:bg-dark-grey text-white z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="ring-2 ring-brand-highlight rounded-2xl">
            <PreviewMessage
            preview={postingPreview}
              isAgent={true}
              timestamp={new Date()}
              authenticatedProfile={authenticatedProfile}
              onAnimateImage={handleAnimateImage}
              onExtendVideo={handleExtendVideo}
              onDownload={handleDownload}
              isPosting={isPosting}
            />
          </div>
        </div>
      )}

      <ChatInput
        userInput={userInput}
        handleKeyPress={handleKeyPress}
        handleSubmit={handleSubmit}
        setUserInput={setUserInput}
        disabled={isLoading || !isConnected || !canMessage || !canMessageAgain}
        attachment={attachment}
        setAttachment={setAttachment}
        requireBonsaiPayment={requireBonsaiPayment}
        setRequireBonsaiPayment={setRequireBonsaiPayment}
        showSuggestions={canMessage && canMessageAgain}
        placeholder={
          isPosting
            ? "Write your post content here"
            : !(canMessageAgain && canMessage)
            ? "Insufficient credits"
            : undefined
        }
        templates={registeredTemplates}
        remixMedia={media}
        roomId={conversationId}
        currentPreview={currentPreview}
        setCurrentPreview={setCurrentPreview}
        localPreviews={localPreviews}
        setLocalPreviews={setLocalPreviews}
        isPosting={isPosting}
        onPost={handlePost}
        isRemixing={isRemixing}
        worker={workerRef.current}
        pendingGenerations={pendingGenerations}
        setPendingGenerations={setPendingGenerations}
        postId={post?.slug || post?.id || undefined}
        storyboardClips={storyboardClips}
        storyboardAudio={storyboardAudio}
        storyboardAudioStartTime={storyboardAudioStartTime}
        setStoryboardClips={setStoryboardClips}
        setStoryboardAudio={setStoryboardAudio}
        setStoryboardAudioStartTime={setStoryboardAudioStartTime}
        imageToExtend={imageToExtend}
        setImageToExtend={setImageToExtend}
      />
    </div>
  );
}