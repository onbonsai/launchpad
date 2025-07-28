import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseEther } from "viem";
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
import useRegisteredTemplates from '@src/hooks/useRegisteredTemplates';
import { ELIZA_API_URL, Embeds, Preview, SmartMedia } from '@src/services/madfi/studio';
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
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { textContainerStyleOverrides } from "@src/components/Publication/PublicationStyleOverrides";
import AnimatedBonsaiGrid from '@src/components/LoadingSpinner/AnimatedBonsaiGrid';
import { DownloadIcon } from '@heroicons/react/outline';

import { getImageTypeFromUrl, mapTemplateNameToTemplate } from "@src/utils/utils";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { SITE_URL } from "@src/constants/constants";
import { sdk } from '@farcaster/miniapp-sdk';
import { useAuth } from "@src/hooks/useAuth";
import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { Publication } from "@src/components/Publication/Publication";

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
  publicationAuthor,
  onUseThis,
  isPending = false,
  onAnimateImage,
  onExtendVideo,
  onDownload,
  isProcessingVideo = false,
  isPosting = false,
  isMiniApp = false,
}: {
  preview?: Preview;
  isAgent: boolean;
  timestamp: Date;
  publicationAuthor: any;
  onUseThis?: (preview: Preview) => void;
  isPending?: boolean;
  onAnimateImage?: (preview: Preview) => void;
  onExtendVideo?: (preview: Preview) => void;
  onDownload?: (preview: Preview) => void;
  isProcessingVideo?: boolean;
  isPosting?: boolean;
  isMiniApp?: boolean;
}) => {
  if (isPending) {
    return (
      <div className={`${isAgent ? 'max-w-[80%]' : 'ml-auto max-w-[80%]'}`}>
        <AnimatedBonsaiGrid
          width="100%"
          height={250}
          gridSize={30}
        />
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const hasVideo = !!preview.video;
  const hasImage = !!preview.image;

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
              author: publicationAuthor,
              timestamp: timestamp.getTime(),
              metadata: {
                __typename: preview.text ? "TextOnlyMetadata" : (preview.image && !hasVideo ? "ImageMetadata" : "TextOnlyMetadata"),
                content: preview.text || '',
                image: !hasVideo && (preview.imagePreview || preview.image)
                  ? { item: preview.imagePreview || preview.image }
                  : undefined
              }
            }}
            environment={LENS_ENVIRONMENT}
            containerBorderRadius={hasVideo ? '0' : '16px'}
            containerPadding={'10px'}
            profilePadding={'0 0 0 0'}
            textContainerStyleOverride={textContainerStyleOverrides}
            backgroundColorOverride={'transparent'}
            markdownStyleBottomMargin={'0'}
            fullVideoHeight={false}
            hideProfile
          />
        </div>

        {/* Action buttons */}
        {(() => {
          Sentry.addBreadcrumb({
            message: 'PreviewMessage rendering action buttons',
            category: 'ui',
            level: 'info',
            data: {
              isAgent,
              hasOnUseThis: !!onUseThis,
              isPosting,
              isMiniApp,
              previewId: preview?.agentId,
              hasVideo: !!hasVideo,
              hasImage: !!hasImage
            }
          });
          return null;
        })()}
        {isAgent && (
          <div className={`flex flex-row gap-3 p-4 bg-[#141414] ${hasVideo ? '-mt-12' : '-mt-4'} justify-end`}>
            {/* Primary action button - Use this button */}
            {onUseThis && !isPosting && (
              <button
                onClick={() => {
                  Sentry.addBreadcrumb({
                    message: 'Cast/Post button clicked',
                    category: 'ui',
                    level: 'info',
                    data: {
                      isAgent,
                      isPosting,
                      hasOnUseThis: !!onUseThis,
                      isMiniApp,
                      previewId: preview?.agentId,
                      buttonText: isMiniApp ? "Cast this" : "Post this"
                    }
                  });
                  onUseThis(preview);
                }}
                className={`flex items-center justify-center gap-2 bg-brand-highlight rounded-lg px-4 py-2 hover:bg-brand-highlight/80 transition-colors text-black font-medium text-sm md:text-base h-10 ${
                  isMiniApp ? 'w-full max-w-none' : 'w-full max-w-[160px]'
                }`}
              >
                {isMiniApp ? "Cast this" : "Post this"}
              </button>
            )}

            {/* Download button - only show if there's media to download and not in the miniapp */}
            {(hasImage || hasVideo) && onDownload && !isPosting && !isMiniApp && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(preview);
                }}
                disabled={hasVideo && isProcessingVideo}
                className={`relative bg-transparent hover:bg-brand-highlight/60 rounded-xl py-2 px-4 backdrop-blur-sm ${preview?.video && isProcessingVideo[preview.agentId as string] ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={`Download media${hasVideo ? ' (with branding)' : ''}`}
              >
                {hasVideo && isProcessingVideo ? (
                  <Spinner customClasses="h-5 w-5" color="#ffffff" />
                ) : (
                  <DownloadIcon className="w-5 h-5 text-white" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Chat({ className, agentId, agentWallet, media, conversationId, post, remixVersionQuery, isRemixing }: ChatProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { isMiniApp, isCoinbaseMiniApp, context, isLoading: isMiniAppLoading } = useIsMiniApp();

  // Debug miniapp state
  useEffect(() => {
    Sentry.addBreadcrumb({
      message: 'Miniapp state changed',
      category: 'miniapp',
      level: 'info',
      data: {
        isMiniApp,
        isCoinbaseMiniApp,
        isMiniAppLoading,
        hasContext: !!context,
        contextUserFid: context?.user?.fid,
        contextUsername: context?.user?.username
      }
    });
  }, [isMiniApp, isCoinbaseMiniApp, isMiniAppLoading, context]);
  const { getAuthHeaders } = useAuth();

  // Track if we've loaded messages to prevent refetching duplicates
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false);
  const { data: messageData, isLoading: isLoadingMessageHistory } = useGetMessages(address, agentId, conversationId, isMiniApp, !hasLoadedMessages);

  // Mark messages as loaded when we get data for the first time
  useEffect(() => {
    if (messageData?.messages && messageData.messages.length > 0 && !hasLoadedMessages) {
      messageData.messages.forEach((msg, i) => {
        console.log(`Message ${i}: ID=${msg.id}, source=${msg.content?.source}, hasPreview=${!!msg.content?.preview}`);
      });
      setHasLoadedMessages(true);
    }
  }, [messageData, hasLoadedMessages]);

  // Reset hasLoadedMessages when conversation or agent changes
  useEffect(() => {
    setHasLoadedMessages(false);
  }, [conversationId, agentId]);

  // Create author object that handles both Lens profile and Farcaster miniapp context
  const publicationAuthor = useMemo(() => {
    if (authenticatedProfile) {
      return authenticatedProfile;
    }

    if (isMiniApp && context?.user) {
      // Create a mock profile object for Farcaster users
      return {
        username: {
          localName: context.user.username
        },
        metadata: {
          name: context.user.displayName || context.user.username,
          picture: context.user.pfpUrl
        },
        // Add other required fields with fallbacks
        id: `farcaster:${context.user.fid}`,
        address: address || '',
        __typename: 'Profile' as const
      };
    }

    return authenticatedProfile;
  }, [authenticatedProfile, isMiniApp, context, address]);
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

  // Debug isPosting state changes
  useEffect(() => {
    Sentry.addBreadcrumb({
      message: 'isPosting state changed',
      category: 'chat',
      level: 'info',
      data: {
        isPosting,
        hasPostingPreview: !!postingPreview,
        postingPreviewId: postingPreview?.agentId
      }
    });
  }, [isPosting, postingPreview]);
  const [imageToExtend, setImageToExtend] = useState<string | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState<Record<string, boolean>>({});

  const { composeCast } = useComposeCast();

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
    Sentry.addBreadcrumb({
      message: 'handlePostButtonClick called',
      category: 'chat',
      level: 'info',
      data: {
        previewId: preview.agentId,
        hasText: !!preview.text,
        hasImage: !!preview.image,
        hasVideo: !!preview.video,
        isPosting: isPosting,
        isMiniApp: isMiniApp,
        isCoinbaseMiniApp: isCoinbaseMiniApp
      }
    });

    setPostingPreview(preview);
    setIsPosting(true);
    if (preview.text) {
      setUserInput(preview.text);
    }

    Sentry.addBreadcrumb({
      message: 'handlePostButtonClick state updated',
      category: 'chat',
      level: 'info',
      data: {
        postingPreviewSet: true,
        isPostingSet: true,
        userInputSet: !!preview.text
      }
    });
  }, [setUserInput, isPosting, isMiniApp, isCoinbaseMiniApp]);

  const handleCancelPost = useCallback(() => {
    Sentry.addBreadcrumb({
      message: 'handleCancelPost called',
      category: 'chat',
      level: 'info',
      data: {
        previousIsPosting: isPosting,
        hadPostingPreview: !!postingPreview
      }
    });

    setIsPosting(false);
    setPostingPreview(undefined);
  }, [isPosting, postingPreview]);

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

  const handleCast = useCallback(async (text: string) => {
    if (!postingPreview) {
      Sentry.addBreadcrumb({
        message: 'handleCast called but no postingPreview',
        category: 'chat',
        level: 'warning',
        data: {
          hasPostingPreview: false,
          isPosting
        }
      });
      return;
    }

    Sentry.addBreadcrumb({
      message: 'handleCast called',
      category: 'chat',
      level: 'info',
      data: {
        postingPreviewId: postingPreview.agentId,
        textLength: text?.length || 0,
        hasTemplate: !!media?.template,
        registeredTemplatesCount: registeredTemplates?.length || 0
      }
    });

    let toastId: string | undefined;
    try {
      const template = media ? mapTemplateNameToTemplate(media?.template, registeredTemplates || []) : undefined;
      if (!template) {
        Sentry.addBreadcrumb({
          message: 'Template not found in handleCast',
          category: 'chat',
          level: 'error',
          data: {
            mediaTemplate: media?.template,
            registeredTemplatesCount: registeredTemplates?.length || 0
          }
        });
        throw new Error("template not found");
      }

      setIsPosting(true);
      toastId = toast.loading("Creating your cast...", { id: toastId });

      // Process audio helper function
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

      // Create smart media without postId (for miniapp users)
      toastId = toast.loading("Finalizing...", { id: toastId });

      // Wait for miniapp detection to complete
      if (isMiniAppLoading) {
        toast.error("Miniapp detection in progress, please try again", { duration: 5000, id: toastId });
        return;
      }

      const authHeaders = await getAuthHeaders({ isWrite: true });
      const result = await createSmartMedia(template.apiUrl, authHeaders, JSON.stringify({
        roomId: conversationId,
        agentId: postingPreview.agentId,
        agentMessageId: postingPreview.agentMessageId,
        // No postId for miniapp users
        parentCast: context?.location?.cast?.hash,
        creatorFid: context?.user?.fid,
        token: media?.token,
        params: {
          templateName: template.name,
          category: template.category,
          templateData: postingPreview.templateData,
        }
      }));

      if (!result) throw new Error(`failed to send request to ${template.apiUrl}/post/create`);

      // Handle composeCast for miniapp users
      toastId = toast.loading("Creating cast...", { id: toastId });

      // Prepare cast content
      const imageUrl = postingPreview.imageUrl || postingPreview.image;
      const videoUrl = postingPreview.video?.url;

      // Create embeds array
      const embeds: string[] = [];
      if (imageUrl) embeds.push(imageUrl);
      if (videoUrl) embeds.push(videoUrl);

      // Add the media page URL
      if (postingPreview.agentMessageId) {
        embeds.push(`${SITE_URL}/media/${postingPreview.agentMessageId}`);
      }

      const castData: any = {
        text: `${text ? text.substring(0, 200) + (text.length > 200 ? '...' : '') : postingPreview.text || template.displayName}\n\nvia @onbonsai.eth`,
        embeds: embeds as Embeds,
        parent: context?.location?.cast?.hash ? { type: "cast", hash: context?.location?.cast?.hash } : undefined,
        close: true
      }

      if (isCoinbaseMiniApp) {
        await composeCast(castData);
      } else {
        await sdk.actions.composeCast(castData);
      }

      toast.success("Cast created successfully!", { duration: 5000, id: toastId });

      // Reset state
      setIsPosting(false);
      setPostingPreview(undefined);
      setUserInput('');

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === "not enough credits") {
        toast.error("Not enough credits to create cast", { id: toastId, duration: 5000 });
      } else {
        Sentry.captureException(error);
        toast.error("Failed to create cast", { id: toastId });
      }
      setIsPosting(false);
    }
  }, [postingPreview, conversationId, context, sdk, media, registeredTemplates, isMiniApp, isMiniAppLoading, address]);

  const handlePost = useCallback(async (text: string) => {
    if (!postingPreview) {
      Sentry.addBreadcrumb({
        message: 'handlePost called but no postingPreview',
        category: 'chat',
        level: 'warning',
        data: {
          hasPostingPreview: false,
          isPosting,
          isMiniApp
        }
      });
      return;
    }

    Sentry.addBreadcrumb({
      message: 'handlePost called',
      category: 'chat',
      level: 'info',
      data: {
        isMiniApp,
        sdkAvailable: !!sdk,
        postingPreviewId: postingPreview.agentId,
        textLength: text?.length || 0
      }
    });

    // Use cast flow for miniapp users
    if (isMiniApp && sdk) {
      return handleCast(text);
    }

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

      const template = media ? mapTemplateNameToTemplate(postingPreview.video ? 'video' : media?.template, registeredTemplates || []) : undefined;
      if (!template) throw new Error("template not found")

      if (postingPreview.video && !postingPreview.video.url?.startsWith("https://")) {
        const { uri: videoUri, type } = await uploadVideo(postingPreview.video.blob, postingPreview.video.mimeType);
        video = { url: videoUri, type };
      } else if (postingPreview.video) {
        const url = typeof postingPreview.video === "string" ? postingPreview.video : postingPreview.video?.url;
        video = { url, type: "video/mp4" };
      }

      if (postingPreview.image && postingPreview.image.startsWith("https://")) {
        const imageType = getImageTypeFromUrl(postingPreview.image);
        image = { url: postingPreview.image, type: imageType };
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
      // const processAudio = async (audio: any) => {
      //   if (!audio) return undefined;
      //   if (typeof audio === 'string') return { data: audio };
      //   if ('url'in audio && audio.url) return { name: audio.name, data: audio.url };
      //   if (audio instanceof File) {
      //     const data = await new Promise<string>((resolve, reject) => {
      //       const reader = new FileReader();
      //       reader.onload = () => resolve(reader.result as string);
      //       reader.onerror = reject;
      //       reader.readAsDataURL(audio);
      //     });
      //     return { name: audio.name, data };
      //   }
      //   return audio;
      // };

      const smartMediaResult = await createSmartMedia(
        template.apiUrl,
        { "Authorization": `Bearer ${idToken}` },
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
          }
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
  }, [postingPreview, authenticatedProfile, walletClient, conversationId, address, media, post, registeredTemplates, remixVersionQuery, isMiniApp, isMiniAppLoading, sdk, handleCast]);

  // Handler for animating image (extending video) - removed since remix is simplified
  const handleAnimateImage = useCallback(async (preview: Preview) => {
    // This functionality is now removed as per the simplified remix design
    toast("Use the remix button to remix this post", { icon: 'ℹ️' });
  }, []);

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

  return (
    <div className={clsx("relative flex h-full w-full flex-col", className)}>
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
                      {isRemixing ? "Remix History" : "Conversation"} ({allMessages.length} messages)
                    </div>
                    <div className="space-y-4">
                      {allMessages
                        .filter((item, index, array) => {
                          // For message type, deduplicate based on actual message ID
                          if (item.type === 'message') {
                            const messageId = item.data.id;
                            const firstIndex = array.findIndex(m => m.type === 'message' && m.data.id === messageId);
                            return firstIndex === index;
                          }
                          // Keep all other types as they have different deduplication logic
                          return true;
                        })
                        .map((item, index) => {
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
                                  {(() => {
                                    const isAgent = message.content.source !== "bonsai-terminal";
                                    Sentry.addBreadcrumb({
                                      message: 'Rendering PreviewMessage for message',
                                      category: 'ui',
                                      level: 'info',
                                      data: {
                                        messageSource: message.content.source,
                                        isAgent,
                                        hasPreview: !!message.content.preview,
                                        previewId: (message.content.preview as Preview)?.agentId,
                                        isMiniApp
                                      }
                                    });
                                    return null;
                                  })()}
                                  <PreviewMessage
                                    preview={{
                                      ...(message.content.preview as Preview),
                                      text: message.content.text,
                                    }}
                                    isAgent={message.content.source !== "bonsai-terminal"}
                                    timestamp={item.timestamp}
                                    publicationAuthor={publicationAuthor}
                                    onUseThis={handlePostButtonClick}
                                    onAnimateImage={handleAnimateImage}
                                    onExtendVideo={handleExtendVideo}
                                    onDownload={handleDownload}
                                    isProcessingVideo={isProcessingVideo[(message.content.preview as Preview)?.agentId || 'unknown']}
                                    isPosting={isPosting}
                                    isMiniApp={isMiniApp}
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
                                {(() => {
                                  Sentry.addBreadcrumb({
                                    message: 'Rendering local PreviewMessage',
                                    category: 'ui',
                                    level: 'info',
                                    data: {
                                      isAgent: true,
                                      isPending: (preview as any).pending,
                                      hasPreview: !!preview.content.preview,
                                      previewId: (preview.content.preview as Preview)?.agentId,
                                      isMiniApp
                                    }
                                  });
                                  return null;
                                })()}
                                <PreviewMessage
                                  preview={preview.content.preview}
                                  isAgent={true} // Force to true for agent messages
                                  timestamp={item.timestamp}
                                  publicationAuthor={publicationAuthor}
                                  onUseThis={handlePostButtonClick}
                                  isPending={(preview as any).pending}
                                  onAnimateImage={handleAnimateImage}
                                  onExtendVideo={handleExtendVideo}
                                  onDownload={handleDownload}
                                  isProcessingVideo={isProcessingVideo?.[(preview.content.preview as Preview)?.agentId || 'unknown']}
                                  isPosting={isPosting}
                                  isMiniApp={isMiniApp}
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
              publicationAuthor={publicationAuthor}
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
        // disabled={isLoading || !isConnected || (!canMessage && !isLoadingMessageHistory) || !canMessageAgain}
        disabled={isLoading || !isConnected}
        attachment={attachment}
        setAttachment={setAttachment}
        requireBonsaiPayment={requireBonsaiPayment}
        setRequireBonsaiPayment={setRequireBonsaiPayment}
        // showSuggestions={canMessage && canMessageAgain}
        showSuggestions={!isPosting}
        placeholder={
          isPosting
            ? "Write your post content here"
            : undefined
        }
        // placeholder={
        //   isPosting
        //     ? "Write your post content here"
        //     : !(canMessageAgain && canMessage)
        //     ? "Insufficient credits"
        //     : undefined
        // }
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
        post={post}
        imageToExtend={imageToExtend}
        setImageToExtend={setImageToExtend}
      />
    </div>
  );
}