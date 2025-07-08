import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseEther } from "viem";
import useIsMounted from "@src/hooks/useIsMounted";
import clsx from 'clsx';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';
import useChat from '../hooks/useChat';
import type { AgentMessage, StreamEntry } from '../types';
import { generateSeededUUID, generateUUID, markdownToPlainText } from '../utils';
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
import { Preview, SmartMedia } from '@src/services/madfi/studio';
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
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides, previewProfileContainerStyleOverride } from "@src/components/Publication/PublicationStyleOverrides";
import { AnimatedText } from '@src/components/LoadingSpinner/AnimatedText';
import AnimatedBonsaiGrid from '@src/components/LoadingSpinner/AnimatedBonsaiGrid';
import { ANIMATED_HINT_LINES } from '@src/constants/constants';
import { Button } from '@src/components/Button';
import { DownloadIcon } from '@heroicons/react/outline';
import { FastForwardIcon, FilmIcon } from '@heroicons/react/solid';
import { SparklesIcon } from '@heroicons/react/solid';
import { parseBase64Image } from '@src/utils/utils';

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
  isProcessingVideo = false
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
}) => {
  if (isPending) {
    return (
      <div className="flex flex-col items-center space-y-2 py-4">
        <AnimatedBonsaiGrid />
        <AnimatedText lines={ANIMATED_HINT_LINES} className="w-full text-sm" />
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
    <div className={`${isAgent ? 'max-w-[80%]' : 'ml-auto max-w-[80%]'}`}>
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
            {hasVideo && onExtendVideo && (
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
            {(hasImage || hasVideo) && onDownload && (
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
            {onUseThis && (
              <button
                onClick={() => onUseThis(preview)}
                className="flex items-center gap-1 bg-brand-highlight rounded-lg px-2 py-1 hover:bg-brand-highlight/80 transition-colors text-black font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Post
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
  
  const storyboardKey = `storyboard-${post?.id || 'default'}`;
  const [storyboardPreviews, setStoryboardPreviews] = useState<Preview[]>([]);
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

  useEffect(() => {
    const storyboardKey = `storyboard-${post?.id || 'default'}`;
    // This effect runs once per post to initialize the storyboard state
    if (isStoryboardInitialized || !post?.id) return;

    const initializeStoryboard = async () => {
      // 1. Try to load from localStorage first
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(storyboardKey);
        if (saved) {
          try {
            setStoryboardPreviews(JSON.parse(saved));
            setIsStoryboardInitialized(true);
            return;
          } catch (e) {
            console.error('Failed to parse saved storyboard:', e);
            // If parsing fails, proceed to initialize from media
          }
        }
      }

      // 2. If nothing in localStorage, initialize from the original post media if it's a storyboard
      const templateData = media?.templateData as any;
      if (templateData?.clips && Array.isArray(templateData.clips)) {
        const initialPreviews: Preview[] = await Promise.all(
          templateData.clips.map(async (clip: any, index: number) => {
            const duration = await getVideoDuration(clip.video?.url).catch(() => 6);
            
            const clipPreview: Preview = {
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
            };
            return clipPreview;
          })
        );
        setStoryboardPreviews(initialPreviews);
      }
      setIsStoryboardInitialized(true);
    };

    initializeStoryboard();
  }, [post?.id, media, isStoryboardInitialized]);

  // Save storyboard to localStorage whenever it changes
  useEffect(() => {
    // Only save to localStorage after initialization is complete
    if (isStoryboardInitialized) {
      const storyboardKey = `storyboard-${post?.id || 'default'}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(storyboardKey, JSON.stringify(storyboardPreviews));
      }
    }
  }, [storyboardPreviews, post?.id, isStoryboardInitialized]);
  
  const router = useRouter();

  console.log('[Chat] messageData', messageData);
  console.log('[Chat] localPreviews', localPreviews);
  console.log('[Chat] storyboardPreviews', storyboardPreviews);
  console.log('[Chat] localPreviews length:', localPreviews.length);

  // --- Worker Management Logic ---
  const workerRef = useRef<Worker | undefined>(undefined);
  const workerMessageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const [pendingGenerations, setPendingGenerations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!workerRef.current) {
      console.log('[Chat] Creating preview worker...');
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
        console.log('[Chat] Unmounting, terminating worker');
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
        
        console.log(`[Chat] Worker successfully generated preview for tempId: ${tempId}`, result);

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
    console.log('handlePostButtonClick called with preview:', preview);
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
  }, []);

  const { postChat, isLoading, canMessageAgain } = useChat({
    onSuccess: handleSuccess,
    conversationId: conversationId || '',
    agentId,
    userId: address,
    setIsThinking,
    setCurrentAction
  });

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

      setUserInput('');
      setAttachment(undefined);
      setRequireBonsaiPayment(undefined);

      const userMessage: StreamEntry = {
        timestamp: new Date(),
        type: 'user',
        content: userInput.trim() + (imageURL ? `\n${imageURL}` : ''),
      };

      setStreamEntries((prev) => [...prev, userMessage]);
      postChat(userInput, { ...requestPayload, ..._requestPayload }, imageURL);

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
    if (!isLoadingMessageHistory) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [streamEntries, isLoadingMessageHistory, messageHistory]);

  useEffect(() => {
    if (!isLoadingMessageHistory && messageHistory) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isLoadingMessageHistory, messageHistory]);

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

      const template = media ? registeredTemplates?.find((t) => t.name === media?.template) : undefined;
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
        })
      );

      if (!smartMediaResult) throw new Error(`failed to send request to ${template.apiUrl}/post/create`);

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
    if (storyboardPreviews.length >= 10) {
      toast.error("You can add a maximum of 10 clips to the storyboard");
      return;
    }
    
    if (storyboardPreviews.some(p => p.agentId === preview.agentId)) {
      toast("This clip is already in your storyboard", { icon: 'ℹ️' });
      return;
    }
    
    setStoryboardPreviews(prev => [...prev, preview]);
    toast.success("Added to storyboard!");
  }, [storyboardPreviews]);

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
        
        // Set time to near the end (90% of duration to avoid potential issues at the very end)
        videoElement.currentTime = videoElement.duration * 0.9;
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

      videoElement.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      // Handle different video source types
      if (typeof video === 'string') {
        videoElement.src = video;
      } else if (video.url) {
        videoElement.src = video.url;
      } else if (video.blob) {
        videoElement.src = URL.createObjectURL(video.blob);
      } else {
        reject(new Error('Invalid video source'));
      }
    });
  };

  // Download functionality
  const downloadVideoWithOutro = async (preview: any, filename: string) => {
    const agentId = preview.agentId || 'unknown';
    
    if (isProcessingVideo[agentId]) {
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

      const response = await fetch('/api/media/add-outro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          filename: filename.replace(/\.[^/.]+$/, '.mp4'),
          aspectRatio: '9:16', // Default aspect ratio
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

      toast.success('Video downloaded!', { id: `processing-${agentId}` });

    } catch (error) {
      console.error('Video processing failed:', error);
      toast.error('Video processing failed, downloading original video instead');
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

  return (
    <div className={clsx("relative flex h-full w-full flex-col", className)}>
      {/* Storyboard indicator */}
      {storyboardPreviews.length > 0 && (
        <div className="bg-brand-highlight/10 border-b border-brand-highlight/20 px-4 py-2 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FilmIcon className="w-4 h-4" />
            <span className="text-sm text-white">
              Storyboard: {storyboardPreviews.length} clip{storyboardPreviews.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStoryboardPreviews([])}
              className="text-xs text-white/60 hover:text-white transition-colors"
            >
              Clear
            </button>
            <span className="text-xs text-white/40">•</span>
            <span className="text-xs text-white/60">
              {10 - storyboardPreviews.length} slots remaining
            </span>
          </div>
        </div>
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
                {messageHistory && messageHistory.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-zinc-500 mb-2 text-center">Last {messageHistory.length} messages</div>
                    <div className="space-y-8">
                      {[...messageHistory].reverse().map((message, index) => {
                        console.log('[Chat] Rendering messageHistory', index, message);
                        return (
                          <div key={message.id} className="space-y-2">
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
                                  timestamp={new Date(message.createdAt as number)}
                                  authenticatedProfile={authenticatedProfile}
                                  onUseThis={handlePostButtonClick}
                                  onAddToStoryboard={handleAddToStoryboard}
                                  isInStoryboard={storyboardPreviews.some(p => p.agentId === (message.content.preview as Preview).agentId)}
                                  storyboardCount={storyboardPreviews.length}
                                  onAnimateImage={handleAnimateImage}
                                  onExtendVideo={handleExtendVideo}
                                  onDownload={handleDownload}
                                  isProcessingVideo={isProcessingVideo[(message.content.preview as Preview).agentId || 'unknown']}
                                />
                              </div>
                            ) : (
                              <StreamItem
                                entry={{
                                  timestamp: new Date(message.createdAt as number),
                                  type: message.content.source === "bonsai-terminal" ? "user" : "agent",
                                  content: markdownToPlainText(message.content.text),
                                }}
                                setUserInput={setUserInput}
                                setRequestPayload={setRequestPayload}
                              />
                            )}
                            {index === messageHistory.length - 1 && (
                              <div className="text-xs text-zinc-500 text-center">
                                {format(new Date(message.createdAt as number), "EEEE, MMMM do h:mmaaa")}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-8 flex-grow" role="log" aria-live="polite">
                  {/* Render stream entries without previews */}
                  {streamEntries.filter(entry => !entry.preview).map((entry, index) => (
                    <StreamItem
                      key={`stream-${entry.timestamp.toISOString()}-${index}`}
                      entry={entry}
                      setUserInput={setUserInput}
                      setRequestPayload={setRequestPayload}
                    />
                  ))}
                  
                                    {/* Render local previews in chronological order */}
                  {[...localPreviews].reverse().map((preview, index) => {
                    console.log(`[Chat] Rendering localPreview ${index}:`, preview);
                    
                    // Determine if this is a user message (no preview) or agent message (has preview or pending)
                    const isUserMessage = !preview.content.preview && !(preview as any).pending;
                    const isAgentMessage = preview.content.preview || (preview as any).pending;
                    
                    if (isUserMessage) {
                      // User messages go on the right side
                      return (
                        <div key={`local-user-${preview.createdAt}-${index}`} className="flex justify-end mb-2">
                          <div className="bg-dark-grey px-3 py-2 rounded-2xl rounded-br-sm max-w-[80%]">
                            <span className="text-white text-[16px]">{preview.content.text}</span>
                          </div>
                        </div>
                      );
                    }
                    
                    if (isAgentMessage) {
                      // Agent messages go on the left side with extra bottom margin
                      return (
                        <div key={`local-agent-${preview.createdAt}-${index}`} className="mb-4">
                          <PreviewMessage
                            preview={preview.content.preview}
                            isAgent={true} // Force to true for agent messages
                            timestamp={new Date(preview.createdAt)}
                            authenticatedProfile={authenticatedProfile}
                            onUseThis={preview.content.preview ? handlePostButtonClick : undefined}
                            isPending={(preview as any).pending}
                            onAddToStoryboard={preview.content.preview ? handleAddToStoryboard : undefined}
                            isInStoryboard={preview.content.preview ? storyboardPreviews.some(p => p.agentId === preview.content.preview?.agentId) : false}
                            storyboardCount={storyboardPreviews.length}
                            onAnimateImage={handleAnimateImage}
                            onExtendVideo={handleExtendVideo}
                            onDownload={handleDownload}
                            isProcessingVideo={isProcessingVideo[(preview.content.preview as Preview).agentId || 'unknown']}
                        />
                        </div>
                      );
                    }
                    
                    // If it doesn't match either pattern, don't render
                    return null;
                    })}
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
        postId={post?.id || undefined}
        storyboardPreviews={storyboardPreviews}
        setStoryboardPreviews={setStoryboardPreviews}
        imageToExtend={imageToExtend}
        setImageToExtend={setImageToExtend}
      />
    </div>
  );
}