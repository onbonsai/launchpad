import * as Sentry from "@sentry/nextjs";
import { NextPage } from "next"
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useRef } from "react"
import { useAccount, useBalance, useReadContract, useWalletClient } from "wagmi";
import { switchChain } from "viem/actions";
import { erc20Abi, parseUnits, zeroAddress } from "viem";
import { createSmartMedia, Preview, useResolveSmartMedia, type Template } from "@src/services/madfi/studio";
import CreatePostForm from "@pagesComponents/Studio/CreatePostForm";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import { Subtitle } from "@src/styles/text";
import { Tabs } from "@pagesComponents/Studio/Tabs";
import useIsMobile from "@src/hooks/useIsMobile";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { CreateTokenForm } from "@pagesComponents/Studio/CreateTokenForm";
import { FinalizePost } from "@pagesComponents/Studio/FinalizePost";
import useRegisteredTemplates from "@src/hooks/useRegisteredTemplates";
import { Action, createPost, uploadFile, uploadImageBase64, uploadVideo } from "@src/services/lens/createPost";
import { resumeSession } from "@src/hooks/useLensLogin";
import toast from "react-hot-toast";
import { BigDecimal, blockchainData, SessionClient } from "@lens-protocol/client";
import { IS_PRODUCTION, LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { EvmAddress, toEvmAddress } from "@lens-protocol/metadata";
import { approveToken, NETWORK_CHAIN_IDS, USDC_CONTRACT_ADDRESS, WGHO_CONTRACT_ADDRESS, registerClubTransaction, DECIMALS, WHITELISTED_UNI_HOOKS, PricingTier, setLensData, getRegisteredClubInfoByAddress, WGHO_ABI, publicClient } from "@src/services/madfi/moneyClubs";
import { cacheImageToStorj, parseBase64Image } from "@src/utils/utils";
import axios from "axios";
import { encodeAbi } from "@src/utils/viem";
import RewardSwapAbi from "@src/services/madfi/abi/RewardSwap.json";
import PreviewHistory, { LocalPreview } from "@pagesComponents/Studio/PreviewHistory";
import type { NFTMetadata, TokenData, StoryboardClip } from "@src/services/madfi/studio";
import { sdk } from '@farcaster/miniapp-sdk';
import { getAuthToken } from "@src/utils/auth";
import { SITE_URL } from "@src/constants/constants";
import TemplateSelector from "@pagesComponents/Studio/TemplateSelector";
import { generateSeededUUID } from "@pagesComponents/ChatWindow/utils";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { useGetCredits } from "@src/hooks/useGetCredits";
import useWebNotifications from "@src/hooks/useWebNotifications";
import { cloneDeep } from "lodash/lang";
import { last } from "lodash/array";
import { ImageUploaderRef } from '@src/components/ImageUploader/ImageUploader';
import { useTikTokIntegration } from '@src/hooks/useTikTokIntegration';
import { storageClient } from "@src/services/lens/client";
import { usePWA } from '@src/hooks/usePWA';

type Embeds = [] | [string] | [string, string] | undefined;

const StudioCreatePage: NextPage = () => {
  const router = useRouter();
  const { isMiniApp, context } = useIsMiniApp();
  const { remix: remixPostId, remixSource: encodedRemixSource, remixVersion: remixVersionQuery } = router.query;
  const { chain, address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [openTab, setOpenTab] = useState<number>(1);
  const [currentPreview, setCurrentPreview] = useState<Preview | undefined>();
  const [finalTemplateData, setFinalTemplateData] = useState({});
  const [finalTokenData, setFinalTokenData] = useState<TokenData>();
  const [isCreating, setIsCreating] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [postImage, setPostImage] = useState<any[]>([]);
  const [postAudio, setPostAudio] = useState<File | string | null>(null);
  const [audioStartTime, setAudioStartTime] = useState<number>(0);
  const [addToken, setAddToken] = useState(true);
  const [storyboardClips, setStoryboardClips] = useState<StoryboardClip[]>([]);
  const [storyboardAudio, setStoryboardAudio] = useState<File | string | null>(null);
  const [storyboardAudioStartTime, setStoryboardAudioStartTime] = useState<number>(0);
  const [savedTokenAddress, setSavedTokenAddress] = useState<`0x${string}`>();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: registeredTemplates, isLoading: isLoadingRegisteredTemplates } = useRegisteredTemplates();
  const [template, setTemplate] = useState<Template>();
  const [selectedSubTemplate, setSelectedSubTemplate] = useState<any>();
  const remixSource = useMemo(() => encodedRemixSource ? decodeURIComponent(encodedRemixSource as string) : undefined, [encodedRemixSource]);
  const { data: remixMedia, isLoading: isLoadingRemixMedia } = useResolveSmartMedia(undefined, remixPostId as string | undefined, false, remixSource);
  const isLoading = isLoadingRegisteredTemplates || isLoadingRemixMedia;
  const [localPreviews, setLocalPreviews] = useState<LocalPreview[]>([]);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const isMobile = useIsMobile();
  const workerRef = useRef<Worker | undefined>(undefined);
  const { data: creditBalance, refetch: refetchCredits } = useGetCredits(address as string, isConnected);
  const [optimisticCreditBalance, setOptimisticCreditBalance] = useState<number | undefined>();
  const { subscribeToPush, sendNotification } = useWebNotifications(address, authenticatedProfile?.address);
  const tikTokIntegration = useTikTokIntegration();
  const { isStandalone } = usePWA();

  // Track pending generations to check when tab becomes visible
  const [pendingGenerations, setPendingGenerations] = useState<Set<string>>(new Set());

  // Add a ref for the ImageUploader that will be passed to CreatePostForm
  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  useEffect(() => {
    setOptimisticCreditBalance(creditBalance?.creditsRemaining);
  }, [creditBalance]);

  // Function to check for completed generations
  const checkForCompletedGenerations = async () => {
    if (!roomId || !template?.apiUrl) return;

    try {
      const sessionClient = await resumeSession(true);
      if (!sessionClient) return;

      const creds = await sessionClient.getCredentials();
      if (creds.isErr() || !creds.value) return;

      const idToken = creds.value.idToken;

      // Fetch recent messages
      const queryParams = new URLSearchParams({
        count: '5',
        end: ''
      });

      const response = await fetch(`${template.apiUrl}/previews/${roomId}/messages?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer: ${idToken}`
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      const messages = data.messages || [];

      // Check if any pending generations have completed
      const completedGenerations = new Set<string>();

      for (const msg of messages) {
        if (msg.userId === 'agent' && msg.content?.preview?.agentId) {
          const agentId = msg.content.preview.agentId;

          // Check if this was a pending generation
          const isPending = localPreviews.some(lp =>
            lp.pending && (lp.tempId === agentId || lp.agentId === agentId)
          );

          if (isPending) {
            completedGenerations.add(agentId);

            // Update local previews to mark as completed
            setLocalPreviews(prev => prev.map(p => {
              if (p.pending && (p.tempId === agentId || p.agentId === agentId)) {
                return {
                  ...p,
                  pending: false,
                  agentId: agentId,
                  content: {
                    ...p.content,
                    preview: msg.content.preview,
                    text: msg.content.preview.text,
                  }
                };
              }
              return p;
            }));

            // Set as current preview if none is selected
            if (!currentPreview || currentPreview.agentId !== agentId) {
              setCurrentPreview(msg.content.preview);
            }
          }
        }
      }

      // Remove completed generations from pending set
      if (completedGenerations.size > 0) {
        setPendingGenerations(prev => {
          const newSet = new Set(prev);
          completedGenerations.forEach(id => newSet.delete(id));
          return newSet;
        });
      }

    } catch (error) {
      console.error('[create.tsx] Error checking for completed generations:', error);
    }
  };

  // Handle page visibility changes - check for completed generations when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && pendingGenerations.size > 0) {
        checkForCompletedGenerations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pendingGenerations, roomId, template?.apiUrl, localPreviews, currentPreview]);

  // Listen for messages from service worker (only for PWA)
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RELOAD_MESSAGES') {
        // If roomId matches or no specific roomId, reload messages
        if (!event.data.roomId || event.data.roomId === roomId) {
          checkForCompletedGenerations();
        }
      }
    };

    if (isStandalone && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if (isStandalone && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [roomId, template?.apiUrl, localPreviews, currentPreview, isStandalone]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../src/services/preview.worker.ts', import.meta.url));
    workerRef.current.onmessage = async (event: MessageEvent) => {
      const { success, error, tempId } = event.data;
      if (success) {
        // Deep clone the result to prevent mutation of shared objects in the state
        const result = cloneDeep(event.data.result);

        if (result.preview?.video?.buffer) {
          const videoBlob = new Blob([result.preview.video.buffer], { type: result.preview.video.mimeType });
          result.preview.video.url = URL.createObjectURL(videoBlob);
          result.preview.video.blob = videoBlob;
          delete result.preview.video.buffer;
        }

        // Handle storyboard clips' video buffers
        if (result.preview?.storyboard && result.preview.storyboard.length > 0) {
          result.preview.storyboard = result.preview.storyboard.map((clip: any, index: number) => {
            if (clip.preview?.video?.buffer) {
              const videoBlob = new Blob([clip.preview.video.buffer], { type: clip.preview.video.mimeType });
              const videoUrl = URL.createObjectURL(videoBlob);
              clip.preview.video.url = videoUrl;
              clip.preview.video.blob = videoBlob;
              delete clip.preview.video.buffer;
            }
            return clip;
          });
        }

        // Handle large image ArrayBuffers
        if (result.preview?.image?.buffer && result.preview?.image?.isLargeImage) {
          const imageBlob = new Blob([result.preview.image.buffer], { type: result.preview.image.mimeType });
          const imageDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(imageBlob);
          });
          result.preview.image = imageDataUrl;
        }

        sendNotification("Your generation is ready", {
          body: "Click to view it on Bonsai",
          icon: '/logo.png'
        });

        const previewWithMetadata = {
          ...result.preview,
          agentId: result.agentId,
          roomId: result.roomId,
          agentMessageId: result.agentMessageId || result.agentId,
        };

        handleSetPreview(previewWithMetadata, tempId);

        // Remove from pending generations
        setPendingGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        // Remove from service worker pending list (only for PWA)
        if ('serviceWorker' in navigator && isStandalone) {
          navigator.serviceWorker.ready.then(registration => {
            if (registration.active) {
              registration.active.postMessage({
                type: 'REMOVE_PENDING_GENERATION',
                generationId: tempId
              });
            }
          }).catch(console.error);
        }
      } else {
        console.error(`[create.tsx] Worker failed for tempId: ${tempId}`, error);
        toast.error(`Generation failed: ${error}`);
        setLocalPreviews(prev => prev.filter(p => p.tempId !== tempId));

        // Remove from pending generations
        setPendingGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        // Remove from service worker pending list (only for PWA)
        if ('serviceWorker' in navigator && isStandalone) {
          navigator.serviceWorker.ready.then(registration => {
            if (registration.active) {
              registration.active.postMessage({
                type: 'REMOVE_PENDING_GENERATION',
                generationId: tempId
              });
            }
          }).catch(console.error);
        }
      }
    };

    // Handle worker errors
    workerRef.current.onerror = (error) => {
      console.error('[create.tsx] Worker error:', error);
      toast.error('Generation worker encountered an error');
    };

    return () => {
      workerRef.current?.terminate();
    }
  }, []);

  const generatePreview = async (
    prompt: string,
    templateData: any,
    image?: File,
    aspectRatio?: string,
    nft?: NFTMetadata,
    audio?: { file: File, startTime: number }
  ) => {
    if (!template) return;

    // Calculate cost before doing anything else
    let credits = template.estimatedCost || 0;
    if (!!templateData.enableVideo) {
      credits += 50;
    }

    if ((optimisticCreditBalance || 0) < credits) {
      toast.error("You don't have enough credits to generate this preview.");
      return;
    }

    const authResult = await getAuthToken({ isMiniApp, address });
    if (!authResult.success) {
      return;
    }

    const tempId = generateSeededUUID(`${address}-${Date.now() / 1000}`);

    // Request notification permission and subscribe to push notifications when first generation is fired
    subscribeToPush();

    setOptimisticCreditBalance((prev) => (prev !== undefined ? prev - credits : undefined));
    setLocalPreviews(prev => [...prev, {
      tempId,
      isAgent: true,
      pending: true,
      createdAt: new Date().toISOString(),
      content: { prompt }
    }]);

    // Track this generation as pending
    setPendingGenerations(prev => new Set(prev).add(tempId));

    // Register with service worker for background checking (only for PWA)
    if ('serviceWorker' in navigator && isStandalone) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'REGISTER_PENDING_GENERATION',
            generation: {
              id: tempId,
              roomId,
              apiUrl: template.apiUrl,
              expectedAgentId: tempId,
              timestamp: Date.now()
            }
          });
        }
      }).catch(console.error);
    }

    workerRef.current?.postMessage({
      url: template.apiUrl,
      authHeaders: authResult.headers,
      category: template.category,
      templateName: template.name,
      templateData: templateData,
      prompt,
      image,
      aspectRatio: aspectRatio || last(storyboardClips)?.templateData?.aspectRatio || "9:16",
      nft,
      roomId,
      audio,
      tempId
    });
  }

  // GHO Balance
  const { data: ghoBalance } = useBalance({
    address,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: finalTokenData?.selectedNetwork === "lens",
      refetchInterval: 10000,
    }
  })

  // stablecoin balance (WGHO on lens, USDC on base)
  const { data: tokenBalance } = useReadContract({
    address: finalTokenData?.selectedNetwork === "base" ? USDC_CONTRACT_ADDRESS : WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: NETWORK_CHAIN_IDS[finalTokenData?.selectedNetwork as string],
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  const checkReferralStatus = async (address: string) => {
    try {
      const response = await axios.get(`/api/referrals/status?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('Error checking referral status:', error);
      return null;
    }
  };

  const postToTikTok = async (videoUrl: string, title: string, description?: string) => {
    if (!address || !tikTokIntegration.isConnected) {
      throw new Error('User not connected or TikTok integration not available');
    }

    const response = await fetch('/api/integrations/tiktok/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: address,
        videoUrl,
        title,
        description
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to post to TikTok');
    }

    return data.result;
  };

  // set the default form data to use the remixed version
  useEffect(() => {
    if (!isLoading && !!remixMedia) {
      // @ts-expect-error templateData is unknown
      setFinalTemplateData(remixMedia.templateData);
      // @ts-expect-error templateData is unknown
      if (remixMedia.templateData?.audioData) {
        // @ts-expect-error templateData is unknown
        setPostAudio(remixMedia.templateData.audioData);
        // @ts-expect-error templateData is unknown
        setAudioStartTime(remixMedia.templateData.audioStartTime);
      }
      if (remixMedia.token?.address) {
        getRegisteredClubInfoByAddress(remixMedia.token.address, remixMedia.token.chain).then((token) => {
          setFinalTokenData({
            tokenName: token.name,
            tokenSymbol: token.symbol,
            tokenImage: [{ preview: token.image }],
            selectedNetwork: remixMedia.token.chain,
            initialSupply: 0,
          });
        });
      }
    }
  }, [isLoading, remixMedia]);

  useEffect(() => {
    if (!isLoadingRegisteredTemplates && registeredTemplates) {
      setTemplate(registeredTemplates[0]);
    }
  }, [isLoadingRegisteredTemplates]);

  useEffect(() => {
    if (isConnected && address) {
      setRoomId(
        typeof router.query.roomId === 'string'
          ? router.query.roomId
          : generateSeededUUID(`studio-${address.toLowerCase()}`)
      );
    }
  }, [isConnected, address, router.query.roomId]);

  useEffect(() => {
    if (currentPreview && !localPreviews.some(p => p.agentId === currentPreview.agentId || p.content.preview?.agentId === currentPreview.agentId)) {
      handleSetPreview(currentPreview);
    }
  }, [currentPreview]);

  const handleSetPreview = (preview: Preview, tempId?: string) => {
    // Prevent duplicate processing of the same preview
    if (preview.agentId && preview.agentId === currentPreview?.agentId && !tempId) {
      const isExisting = localPreviews.some(lp =>
        lp.agentId === preview.agentId ||
        (lp.content.preview && lp.content.preview.agentId === preview.agentId)
      );
      if (isExisting) {
        return;
      }
    }

    // Prevent duplicate storyboard processing - if this agentId already exists in localPreviews
    if (preview.storyboard && preview.storyboard.length > 0) {
      const hasStoryboardClipsAlready = preview.storyboard.some(clip =>
        localPreviews.some(lp => lp.agentId === clip.id)
      );
      if (hasStoryboardClipsAlready) {
        return;
      }
    }

    setCurrentPreview(preview);
    if (preview.roomId && preview.roomId !== roomId) {
      setRoomId(preview.roomId);
    }

            // If preview contains storyboard, populate storyboard state
    if (preview.storyboard && preview.storyboard.length > 0) {


      setStoryboardClips(prevClips => {
        // Filter out clips that already exist in the storyboard
        const existingClipIds = new Set(prevClips.map(clip => clip.id));
        const newClips = preview.storyboard!.filter(clip => !existingClipIds.has(clip.id));

        if (newClips.length === 0) {
          // No new clips to add
          return prevClips;
        }



        // Use clips as-is with their original timing from the server
        return [...prevClips, ...newClips];
      });
    }

    // If preview contains storyboard audio, populate storyboard audio state
    if (preview.templateData && preview.templateData.storyboard) {
      const storyboardData = preview.templateData.storyboard;
      if (storyboardData.audioData) {
        setStoryboardAudio(storyboardData.audioData);
      }
      if (storyboardData.audioStartTime !== undefined) {
        setStoryboardAudioStartTime(storyboardData.audioStartTime);
      }
    }

        if (tempId) {
      setLocalPreviews(prev => {
        const updatedPreviews = prev.map(p => {
          if (p.tempId === tempId) {
            return {
              ...p,
              pending: false,
              agentId: preview.agentId,
              agentMessageId: preview.agentMessageId || preview.agentId,
              content: {
                ...p.content,
                preview: cloneDeep(preview), // Deep copy to avoid shared references
                text: preview.text,
              }
            };
          }
          return p;
        });

        // If preview contains storyboard, also add individual clips as local previews
        if (preview.storyboard && preview.storyboard.length > 0) {
          const now = new Date().toISOString();
          const storyboardPreviews: LocalPreview[] = [];



                    preview.storyboard.forEach((clip, index) => {
            const clipTimestamp = new Date(Date.parse(now) + index).toISOString();

            // Try to find clip-specific prompt first, then fall back to original prompt
            const clipPrompt = clip.templateData?.sceneDescription || clip.preview.text || "";



          // Add template data for the clip
          storyboardPreviews.push({
            agentId: `templateData-${clip.id}`,
            isAgent: false,
            createdAt: clipTimestamp,
            content: {
              templateData: JSON.stringify(clip.templateData || {}),
              text: clipPrompt,
              prompt: clipPrompt
            }
          });

          // Add the clip preview
          storyboardPreviews.push({
            agentId: clip.id,
            isAgent: true,
            createdAt: new Date(Date.parse(clipTimestamp) + 1).toISOString(),
            content: {
              preview: cloneDeep(clip.preview),
              text: clip.preview.text,
              prompt: clipPrompt
            }
          });
          });

          // Only return storyboard previews, don't add main preview for storyboard compositions
          // Failsafe: Filter out any preview with the main agentId
          const filteredUpdatedPreviews = updatedPreviews.filter(p =>
            p.agentId !== preview.agentId && p.agentId !== `templateData-${preview.agentId}`
          );



          return [...filteredUpdatedPreviews, ...storyboardPreviews];
        }

        return updatedPreviews;
      });

            // Also handle storyboard state update for tempId case
      if (preview.storyboard && preview.storyboard.length > 0) {
        setStoryboardClips(prevClips => {
          // Filter out clips that already exist in the storyboard
          const existingClipIds = new Set(prevClips.map(clip => clip.id));
          const newClips = preview.storyboard!.filter(clip => !existingClipIds.has(clip.id));

          if (newClips.length === 0) {
            // No new clips to add
            return prevClips;
          }

          // Use clips as-is with their original timing from the server
          return [...prevClips, ...newClips];
        });
      }

      return;
    }

    // Add both template data and preview messages in a single state update
    const now = new Date().toISOString();

    setLocalPreviews(prev => {
      // Check if this preview already exists in localPreviews
      const existingPreview = prev.find(lp =>
        lp.agentId === preview.agentId ||
        (lp.content.preview && lp.content.preview.agentId === preview.agentId)
      );

      if (existingPreview) {
        return prev;
      }

      const newPreviews: LocalPreview[] = [];

      // If preview contains storyboard, add individual clips as local previews
      if (preview.storyboard && preview.storyboard.length > 0) {


                preview.storyboard.forEach((clip, index) => {
          const clipTimestamp = new Date(Date.parse(now) + index).toISOString();

          // Try to find clip-specific prompt first, then fall back to original prompt
          const clipPrompt = clip.templateData?.clipPrompt ||
                           clip.templateData?.scene ||
                           clip.templateData?.description ||
                           clip.templateData?.prompt ||
                           clip.templateData?.text ||
                           clip.preview.text ||
                           "";



          // Add template data for the clip
          newPreviews.push({
            agentId: `templateData-${clip.id}`,
            isAgent: false,
            createdAt: clipTimestamp,
            content: {
              templateData: JSON.stringify(clip.templateData || {}),
              text: clipPrompt,
              prompt: clipPrompt
            }
          });

          // Add the clip preview
          newPreviews.push({
            agentId: clip.id,
            isAgent: true,
            createdAt: new Date(Date.parse(clipTimestamp) + 1).toISOString(),
            content: {
              preview: cloneDeep(clip.preview),
              text: clip.preview.text,
              prompt: clipPrompt
            }
          });
        });
      }

            // Only add the main preview if there's no storyboard at all
      // When there's a storyboard, we only show the individual clips
      const shouldAddMainPreview = !preview.storyboard || preview.storyboard.length === 0;



      if (shouldAddMainPreview) {
        newPreviews.push(
          // First add the template data message
          {
            agentId: `templateData-${preview.agentId}`,
            isAgent: false,
            createdAt: new Date(Date.parse(now) + (preview.storyboard ? preview.storyboard.length * 2 : 0)).toISOString(),
            content: {
              templateData: JSON.stringify(preview.templateData || {}),
              text: prompt || "",
              prompt: prompt
            }
          },
          // Then add the preview message
          {
            agentId: preview.agentId,
            isAgent: true,
            createdAt: new Date(Date.parse(now) + (preview.storyboard ? preview.storyboard.length * 2 : 0) + 1).toISOString(),
            content: {
              preview: cloneDeep(preview), // Deep copy to avoid shared references
              text: preview.text,
              prompt: prompt
            }
          }
        );
      }

            // Failsafe: If there's a storyboard, filter out any preview with the main agentId
      const filteredPreviews = preview.storyboard && preview.storyboard.length > 0
        ? newPreviews.filter(p => p.agentId !== preview.agentId && p.agentId !== `templateData-${preview.agentId}`)
        : newPreviews;



      return [...prev, ...filteredPreviews];
    });
  };

  const handleTemplateSelect = (newTemplate: Template) => {
    if (openTab === 1) {
      setTemplate(newTemplate);
      setSelectedSubTemplate(undefined); // Reset subtemplate when template changes
      setFinalTemplateData({});
    }
  };

  const handleAnimateImage = async (preview: Preview) => {
    if (!preview?.image || !registeredTemplates) return;

    // find a template with "video" in the name (case-insensitive)
    const videoTemplate = registeredTemplates.find(t => t.name.toLowerCase().includes('video'));
    if (!videoTemplate) {
      toast.error("Video template not found");
      return;
    }

    // Preserve current template data before switching templates
    const previousTemplateData = { ...finalTemplateData };

    handleTemplateSelect(videoTemplate);

    // Restore and merge previous template data with new template
    setFinalTemplateData(prev => ({ ...previousTemplateData, ...prev }));

    // scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Clear existing images before opening crop modal for replacement
    setPostImage([]);

    // Use the ImageUploader ref to open crop modal for proper aspect ratio cropping
    if (imageUploaderRef.current) {
      try {
        await imageUploaderRef.current.openCropModal(preview.image, `bonsai-${preview.agentId || 'preview'}.png`);
        toast.success("Image loaded for cropping! Please crop and confirm to use in video.");
      } catch (error) {
        console.error('Failed to open crop modal:', error);
        // Fallback to the old behavior if crop modal fails
        const imageFile = parseBase64Image(preview.image);
        setPostImage([imageFile]);
        toast.success("Image added to video template!");
      }
    } else {
      // Fallback to the old behavior if ref is not available
      const imageFile = parseBase64Image(preview.image);
      setPostImage([imageFile]);
      toast.success("Image added to video template!");
    }
  };

  const handleExtendVideo = async (preview: Preview) => {
    if (!preview?.video || !registeredTemplates) return;

    // Find a template with "video" in the name (case-insensitive)
    const videoTemplate = registeredTemplates.find(t => t.name.toLowerCase().includes('video'));
    if (!videoTemplate) {
      toast.error("Video template not found");
      return;
    }

    try {
      // Extract last frame from video
      const lastFrame = await extractLastFrameFromVideo(preview.video);

      // Preserve current template data before switching templates
      const previousTemplateData = { ...finalTemplateData };

      handleTemplateSelect(videoTemplate);

      // Restore and merge previous template data with new template
      setFinalTemplateData(prev => ({ ...previousTemplateData, ...prev }));

      // scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Clear existing images before opening crop modal for replacement
      setPostImage([]);

      // Use the ImageUploader ref to open crop modal with the extracted frame
      if (imageUploaderRef.current) {
        try {
          await imageUploaderRef.current.openCropModal(lastFrame, `bonsai-extend-${preview.agentId || 'preview'}.png`);
          toast.success("Last frame extracted! Please crop and confirm to extend the video.", {duration: 10000});
        } catch (error) {
          console.error('Failed to open crop modal:', error);
          // Fallback to the old behavior if crop modal fails
          const imageFile = parseBase64Image(lastFrame);
          setPostImage([imageFile]);
          toast.success("Last frame extracted and added to video template!");
        }
      } else {
        // Fallback to the old behavior if ref is not available
        const imageFile = parseBase64Image(lastFrame);
        setPostImage([imageFile]);
        toast.success("Last frame extracted and added to video template!");
      }
    } catch (error) {
      console.error('Failed to extract last frame:', error);
      toast.error("Failed to extract last frame from video");
    }
  };

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

  const handleSubTemplateChange = (subTemplate: any) => {
    setSelectedSubTemplate(subTemplate);
  };

  const onCast = async (collectAmount: number) => {
    let toastId: string | undefined;
    if (!template) {
      toast.error("No template data found");
      return;
    }

    if (!currentPreview) {
      toast.error("No preview available to cast");
      return;
    }

    setIsCreating(true);
    toastId = toast.loading("Creating your cast...", { id: toastId });

    try {
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
      const authResult = await getAuthToken({ isMiniApp, address });
      if (!authResult.success) {
        toast.error("Failed to authenticate", { duration: 5000, id: toastId });
        return;
      }
      // Determine token address and data for base chain
      let tokenAddress: string | undefined;
      let tokenData: any;
      
      if (savedTokenAddress) {
        // Use saved token address from token creation
        tokenAddress = savedTokenAddress;
        tokenData = {
          chain: finalTokenData?.selectedNetwork || "base",
          address: tokenAddress,
          metadata: finalTokenData ? {
            name: finalTokenData.tokenName,
            symbol: finalTokenData.tokenSymbol,
            image: finalTokenData.tokenImage?.length ? finalTokenData.tokenImage[0].preview : null
          } : undefined
        };
      } else if (remixMedia?.token?.address) {
        // Use token from remix
        tokenAddress = remixMedia.token.address;
        tokenData = {
          chain: remixMedia.token.chain || "base",
          address: tokenAddress,
          // Metadata should already be in remixMedia
        };
      } else {
        // Default to Bonsai on base
        tokenData = {
          chain: "base",
          address: PROTOCOL_DEPLOYMENT.base.Bonsai,
          metadata: {
            name: "Bonsai",
            symbol: "BONSAI",
            image: "https://app.onbons.ai/logo-spaced.png"
          }
        };
      }

      const result = await createSmartMedia(template.apiUrl, authResult.headers, JSON.stringify({
        roomId,
        agentId: currentPreview?.agentId,
        agentMessageId: currentPreview?.agentMessageId || currentPreview?.agentId,
        // No postId for miniapp users
        parentCast: context?.location?.cast?.hash,
        creatorFid: context?.user?.fid,
        token: tokenData,
        params: {
          templateName: template.name,
          category: template.category,
          templateData: {
            ...finalTemplateData,
            audioData: await processAudio((finalTemplateData as any)?.audioData),
          },
        },
        storyboard: storyboardClips.length > 0 ? {
          clips: storyboardClips.map(clip => ({
            id: clip.id,
            startTime: clip.startTime,
            endTime: clip.endTime,
            templateData: {
              video: { url: clip.preview.video?.url?.startsWith("https://") ? clip.preview.video.url : clip.preview.videoUrl },
              image: clip.preview.image?.startsWith("https://") ? clip.preview.image : clip.preview.imageUrl,
              prompt: clip.preview.text,
              ...clip.templateData,
            },
          })),
          audioData: await processAudio(storyboardAudio),
          audioStartTime: storyboardAudioStartTime,
          roomId: roomId as string
        } : undefined
      }));

      if (!result) throw new Error(`failed to send request to ${template.apiUrl}/post/create`);

      // Handle composeCast for miniapp users
      toastId = toast.loading("Creating cast...", { id: toastId });

      // Prepare cast content
      const imageUrl = currentPreview?.imageUrl;
      const videoUrl = currentPreview?.video?.url;

      // Create embeds array
      const embeds: string[] = [];
      if (videoUrl) embeds.push(videoUrl);
      else if (imageUrl) embeds.push(imageUrl);

      embeds.push(`${SITE_URL}/media/${currentPreview?.agentMessageId || currentPreview?.agentId}`);

      await sdk.actions.composeCast({
        text: `${currentPreview?.text ? currentPreview.text.substring(0, 200) + '...' : postContent || template?.displayName}\n\nvia @onbonsai.eth`,
        embeds: embeds as Embeds,
        parent: context?.location?.cast?.hash ? { type: "cast", hash: context?.location?.cast?.hash } : undefined,
        close: true
      });

      toast.success("Cast created successfully!", { duration: 5000, id: toastId });

      // Reset form state
      setIsCreating(false);
      setCurrentPreview(undefined);
      setPostContent("");
      setFinalTemplateData({});
      setStoryboardClips([]);
      setStoryboardAudio(null);
      setStoryboardAudioStartTime(0);

    } catch (error) {
      console.log(error);
      if (error instanceof Error && error.message === "not enough credits") {
        toast.error("Not enough credits to create cast", { id: toastId, duration: 5000 });
      } else {
        Sentry.captureException(error);
        toast.error("Failed to create cast", { id: toastId });
      }
      setIsCreating(false);
      return;
    }
  };

  const onCreate = async (collectAmount: number) => {
    let toastId: string | undefined;
    if (!template) {
      toast.error("No template data found");
      return;
    }

    setIsCreating(true);

    // 1. create token (if not remixing and not importing a token)
    let tokenAddress: any;
    let txHash: any;
    let _finalTokenData = finalTokenData;
    if (!!savedTokenAddress) {
      tokenAddress = savedTokenAddress;
    } else if (addToken && finalTokenData && finalTokenData.tokenName && finalTokenData.tokenSymbol && finalTokenData.tokenImage && !remixMedia?.agentId) {
      try {
        const targetChainId = NETWORK_CHAIN_IDS[finalTokenData.selectedNetwork];
        if (chain?.id !== targetChainId && walletClient) {
          try {
            await switchChain(walletClient, { id: targetChainId });
            // HACK: require lens chain for the whole thing
            setIsCreating(false);
            return;
          } catch (error) {
            console.log(error);
            Sentry.captureException(error);
            toast.error(`Please switch to ${finalTokenData.selectedNetwork}`, { id: toastId });
            toast.error(`Please switch to ${finalTokenData.selectedNetwork}`, { id: toastId });
            setIsCreating(false);
            return;
          }
        }
        toastId = toast.loading(`Creating your token on ${finalTokenData.selectedNetwork.toUpperCase()}`);

        if (finalTokenData.totalRegistrationFee && finalTokenData.totalRegistrationFee > 0n) {
          if (finalTokenData.selectedNetwork === "lens") {
            // Calculate how much WGHO we need for the transaction
            const requiredAmount = finalTokenData.totalRegistrationFee;
            const currentWGHOBalance = tokenBalance || 0n;

            // If we don't have enough WGHO
            if (currentWGHOBalance < requiredAmount) {
              // Calculate how much more WGHO we need
              const additionalWGHONeeded = requiredAmount - currentWGHOBalance;

              // Check if user has enough GHO to wrap
              const ghoBalanceInWei = ghoBalance?.value || 0n;
              if (ghoBalanceInWei < additionalWGHONeeded) {
                throw new Error("Insufficient WGHO");
              }

              // Wrap the required amount
              toastId = toast.loading("Wrapping GHO...", { id: toastId });
              // Call the deposit function on the WGHO contract
              const hash = await walletClient!.writeContract({
                address: WGHO_CONTRACT_ADDRESS,
                abi: WGHO_ABI,
                functionName: 'deposit',
                args: [],
                value: additionalWGHONeeded,
              });

              await publicClient("lens").waitForTransactionReceipt({ hash });
            }
          }

          const token = finalTokenData.selectedNetwork === "base" ? USDC_CONTRACT_ADDRESS : WGHO_CONTRACT_ADDRESS;
          await approveToken(token, finalTokenData.totalRegistrationFee, walletClient, toastId, undefined, finalTokenData.selectedNetwork);
        }

        toastId = toast.loading("Registering your token...", { id: toastId });
        const tokenImageUrl = await cacheImageToStorj(
          finalTokenData.tokenImage[0],
          `${finalTokenData.tokenSymbol}-${Date.now()}`,
          'token-images'
        );
        const result = await registerClubTransaction(walletClient, {
          initialSupply: parseUnits((finalTokenData.initialSupply || 0).toString(), DECIMALS).toString(),
          tokenName: finalTokenData.tokenName,
          tokenSymbol: finalTokenData.tokenSymbol,
          tokenImage: tokenImageUrl,
          hook: finalTokenData.selectedNetwork === 'base' && finalTokenData.uniHook
            ? WHITELISTED_UNI_HOOKS[finalTokenData.uniHook].contractAddress as `0x${string}`
            : zeroAddress,
          // TODO: some sensible defaults
          cliffPercent: 50 * 100, // 50% cliff
          vestingDuration: 3600 * 6, // 6h
          pricingTier: finalTokenData.selectedNetwork === 'lens' ? finalTokenData.pricingTier as PricingTier : undefined,
        }, finalTokenData.selectedNetwork);

        if (!result) throw new Error("No result from registerClubTransaction");

        txHash = result.txHash as string;
        tokenAddress = result.tokenAddress;
        setSavedTokenAddress(tokenAddress); // save our progress

        // Approve token for reward pool
        if (finalTokenData.selectedNetwork === "lens") {
          const rewardPoolAmount = Math.floor((finalTokenData.rewardPoolPercentage || 0) * (finalTokenData.initialSupply || 0) / 100).toString();
          if (rewardPoolAmount !== "0") {
            await approveToken(
              tokenAddress,
              parseUnits(rewardPoolAmount, DECIMALS),
              walletClient,
              toastId,
              `Approving ${rewardPoolAmount} ${finalTokenData.tokenSymbol} for reward pool`,
              "lens",
              PROTOCOL_DEPLOYMENT.lens.RewardSwap,
              true
            )
          }
          // always create the reward pool so that clubId will be set on the token
          toastId = toast.loading("Initializing swap action...", { id: toastId });
          const hash = await walletClient!.writeContract({
            address: PROTOCOL_DEPLOYMENT.lens.RewardSwap,
            abi: RewardSwapAbi,
            functionName: "createRewardsPool",
            args: [
              tokenAddress,
              0,
              200,
              (50n * parseUnits(rewardPoolAmount !== "0" ? rewardPoolAmount : "80000000", DECIMALS)) / 100_00n,
              result.clubId,
              zeroAddress,
            ],
          });
          await publicClient("lens").waitForTransactionReceipt({ hash });
          toast.success("Swap action initialized", { id: toastId });
        }
      } catch (error) {
        console.log(error);
        toast.error("Failed to create token", { id: toastId });
        setIsCreating(false);
        return;
      }
    } else if (remixMedia?.token?.address) {
      tokenAddress = remixMedia.token.address;
      setSavedTokenAddress(tokenAddress); // save our progress
    }  else {
      // default to bonsai on the correct chain
      let _chain = chain?.name.toLowerCase() as string;
      if (!IS_PRODUCTION) {
        if (_chain === "base sepolia") {
          _chain = "base";
        } else {
          _chain = "lens";
        }
      } else {
        if (_chain !== "base" && _chain !== "lens") {
          _chain = "lens";
        }
      }
      tokenAddress = PROTOCOL_DEPLOYMENT[_chain].Bonsai;
      _finalTokenData = {
        initialSupply: 0,
        tokenName: "Bonsai",
        tokenSymbol: "BONSAI",
        tokenImage: [{ preview: "https://app.onbons.ai/logo-spaced.png" }],
        selectedNetwork: _chain as "base" | "lens",
      }
    }

    // 2. create lens post with template metadata and ACL; set club db record
    if (LENS_CHAIN_ID !== chain?.id && walletClient && !isMiniApp) {
      try {
        await switchChain(walletClient, { id: LENS_CHAIN_ID });
        // HACK: require lens chain for the whole thing
        setIsCreating(false);
        return;
      } catch (error) {
        console.log(error);
        Sentry.addBreadcrumb({ message: `attempting to switch chains: ${LENS_CHAIN_ID}` })
        Sentry.captureException(error);
        toast.error("Please switch networks to create your Lens post", { id: toastId });
        setIsCreating(false);
        return;
      }
    }

    const sessionClient = await resumeSession(true);
    let idToken: any;
    if (!sessionClient && !authenticatedProfile) {
      toast.error("Not authenticated");
      return;
    } else {
      const creds = await (sessionClient as SessionClient).getCredentials();
      if (creds.isOk()) {
        idToken = creds.value?.idToken;
      } else {
        Sentry.captureException("Failed to get credentials");
        toast.error("Failed to get credentials", { id: toastId });
        return;
      }
    }

    toastId = toast.loading("Creating your post...", { id: toastId });
    let postId: any, uri: any;
    let video: any;
    let image: any, imageUri: any, type: any;
    try {
      if (currentPreview?.video && !currentPreview.video.url?.startsWith("https://")) {
        const { uri: videoUri, type } = await uploadVideo(currentPreview.video.blob, currentPreview.video.mimeType, template?.acl);
        video = { url: videoUri, type };
      } else if (currentPreview?.video) {
        const url = typeof currentPreview?.video === "string" ? currentPreview?.video : currentPreview?.video?.url;
        video = { url, type: "video/mp4" };
      }

      if (currentPreview?.image && currentPreview?.image.startsWith("https://")) {
        image = { url: currentPreview?.image, type: "image/png" };
      } else if (currentPreview?.image) {
        ({ uri: imageUri, type } = await uploadImageBase64(currentPreview.image, template?.acl));
        image = { url: imageUri, type };
      } else if (postImage && postImage.length > 0) {
        image = (await uploadFile(postImage[0], template?.acl)).image;
      }

      // Check if user was referred
      const referralStatus = await checkReferralStatus(address as string);

      // Prepare collect settings
      let recipients: { address: EvmAddress; percent: number }[] = [];
      if (referralStatus?.hasReferrer && !referralStatus?.firstPostUsed) {
        // Split 80% between creator and referrer (40% each)
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
        // Default split: 80% creator, 20% protocol
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

      let actions: Action[] = [{
        simpleCollect: {
          payToCollect: {
            amount: {
              currency: toEvmAddress(PROTOCOL_DEPLOYMENT.lens.Bonsai),
              value: collectAmount.toString() as BigDecimal
            },
            recipients,
            referralShare: 5,
          }
        }
      }]
      if (tokenAddress && _finalTokenData?.selectedNetwork === "lens") {
        actions.push({
          unknown: {
            address: toEvmAddress(PROTOCOL_DEPLOYMENT.lens.RewardSwap),
            params: [{
              raw: {
                // keccak256("lens.param.token")
                key: blockchainData("0xee737c77be2981e91c179485406e6d793521b20aca5e2137b6c497949a74bc94"),
                data: blockchainData(encodeAbi(['address'], [tokenAddress]))
              }
            }],
          }
        })
      }

      const result = await createPost(
        sessionClient as SessionClient,
        walletClient,
        {
          text: postContent || currentPreview?.text || template.displayName,
          image,
          video,
          template,
          tokenAddress,
          remix: remixMedia?.postId ? {
            postId: remixMedia.postId,
            version: remixVersionQuery ? parseInt(remixVersionQuery as string) : remixMedia.versions?.length ?? 0
          } : undefined,
          actions
        }
      );

      if (!result?.postId) throw new Error("No result from createPost");
      postId = result.postId;
      uri = result.uri;

      // If this was a referred user's first post, mark it as used
      if (referralStatus?.hasReferrer && !referralStatus?.firstPostUsed) {
        try {
          await axios.post('/api/referrals/mark-used', { address: address as string });
        } catch (error) {
          console.error('Error marking referral as used:', error);
          // Don't throw here - the post was still created successfully
        }
      }
    } catch (error) {
      console.log(error);
      Sentry.captureException(error);
      toast.error("Failed to create post", { id: toastId });
      setIsCreating(false);
      return;
    }

    // 3. create smart media
    toastId = toast.loading("Finalizing...", { id: toastId });
    try {
      if (tokenAddress && !remixMedia?.agentId) { // link the creator handle and post id in our db (if not remixed)
        await setLensData({
          hash: txHash,
          postId,
          handle: authenticatedProfile?.username?.localName ? authenticatedProfile.username.localName : address as string,
          chain: _finalTokenData?.selectedNetwork || "lens",
          tokenAddress
        });
      }

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

      const result = await createSmartMedia(template.apiUrl, idToken, JSON.stringify({
        roomId,
        agentId: currentPreview?.agentId,
        agentMessageId: currentPreview?.agentMessageId || currentPreview?.agentId,
        postId,
        uri,
        token: (addToken || remixMedia?.agentId || tokenAddress) && _finalTokenData ? {
          chain: _finalTokenData.selectedNetwork,
          address: tokenAddress,
          // save metadata when importing tokens
          metadata: !!savedTokenAddress ? {
            name: _finalTokenData.tokenName,
            symbol: _finalTokenData.tokenSymbol,
            image: _finalTokenData.tokenImage?.length ? _finalTokenData.tokenImage[0].preview : null
          } : undefined
        } : undefined,
        params: {
          templateName: template.name,
          category: template.category,
          templateData: {
            ...finalTemplateData,
            audioData: await processAudio((finalTemplateData as any)?.audioData),
          },
        },
        storyboard: storyboardClips.length > 0 ? {
          clips: storyboardClips.map(clip => ({
            id: clip.id,
            startTime: clip.startTime,
            endTime: clip.endTime,
            templateData: {
              video: { url: clip.preview.video?.url?.startsWith("https://") ? clip.preview.video.url : clip.preview.videoUrl },
              image: clip.preview.image?.startsWith("https://") ? clip.preview.image : clip.preview.imageUrl,
              prompt: clip.preview.text,
              ...clip.templateData,
            },
          })),
          audioData: await processAudio(storyboardAudio),
          audioStartTime: storyboardAudioStartTime,
          roomId: roomId as string
        } : undefined
      }));

      if (!result) throw new Error(`failed to send request to ${template.apiUrl}/post/create`);

      // Post to TikTok if user has integration connected and this is a video
      const hasVideoToPost = currentPreview?.video || video;
      const willPostToTikTok = tikTokIntegration.isConnected && hasVideoToPost;

      if (willPostToTikTok) {
        let videoUrlForTikTok = video?.url || (typeof currentPreview?.video === 'string' ? currentPreview.video : currentPreview?.video?.url);
        if (videoUrlForTikTok.startsWith("lens://")) {
          videoUrlForTikTok = await storageClient.resolve(videoUrlForTikTok);
        }

        if (videoUrlForTikTok) {
          const tikTokTitle = postContent || currentPreview?.text || template.displayName;
          const tikTokDescription = `${tikTokTitle}\n\nCreated with @createonbonsai`;

          // Post to TikTok synchronously
          toastId = toast.loading("Posting to TikTok...", { id: toastId });
          try {
            const tikTokResult = await postToTikTok(videoUrlForTikTok, tikTokTitle, tikTokDescription);

            if (tikTokResult.sandboxMode) {
              toast.success("Posted to Lens & saved as TikTok draft! Check your TikTok app to publish.", { duration: 8000, id: toastId });
            } else {
              toast.success(`Posted to Lens & TikTok successfully! @${tikTokResult.username}`, { duration: 8000, id: toastId });
            }
          } catch (error) {
            console.error('TikTok posting failed:', error);
            toast.success("Posted to Lens successfully! TikTok posting failed.", { duration: 5000, id: toastId });
          }
        } else {
          toast.success("Done! Going to post...", { duration: 5000, id: toastId });
        }
      } else {
        toast.success("Done! Going to post...", { duration: 5000, id: toastId });
      }

      if (await sdk.isInMiniApp()) {
        await sdk.actions.composeCast({
          text: `${currentPreview?.text ? currentPreview.text.substring(0, 200) + '...' : postContent || template?.displayName}\n\nvia @onbonsai.eth`,
          embeds: [`${SITE_URL}/post/${postId}`],
        });
      }

      setTimeout(() => router.push(`/post/${postId}`), 2000);
    } catch (error) {
      console.log(error);
      if (error instanceof Error && error.message === "not enough credits") {
        toast.error("Not enough credits to create smart media", { id: toastId, duration: 5000 });
      } else {
        Sentry.captureException(error);
        toast.error("Failed to create smart media", { id: toastId });
      }
      setIsCreating(false);
      return;
    }
  }

  return (
    <div className="bg-background text-secondary min-h-[90vh] w-full overflow-visible">
      <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 pt-6 overflow-visible">
        <section aria-labelledby="studio-heading" className="pt-0 pb-24 max-w-full overflow-visible">
          <div className="flex flex-col lg:flex-row gap-y-6 lg:gap-x-8 max-w-full overflow-visible">
              <div className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
                <Sidebar />
              </div>
              <div className="flex-grow overflow-visible">
                {/* Full-width Template Selector - moved above padding */}
                {template && (
                  <div className={`w-full px-4 sm:px-6 ${openTab === 1 ? 'pt-2 pb-2 flex flex-col shadow-lg' : 'flex items-center gap-4'} overflow-hidden max-w-[1250px]`}>
                    {openTab === 1 && (
                      <Subtitle className="!text-brand-highlight mb-2 text-2xl">What do you want to create?</Subtitle>
                    )}
                    <TemplateSelector
                      selectedTemplate={template}
                      summary={openTab > 1}
                      onTemplateSelect={handleTemplateSelect}
                      selectedSubTemplate={selectedSubTemplate}
                    />
                  </div>
                )}
                <div className="px-4 sm:px-6 pt-0 pb-6 sm:pb-10">
                  <div className="flex flex-col md:flex-row gap-y-8 md:gap-x-8 w-full">
                    {/* Sticky Form Section */}
                    <div className="md:w-1/2 flex-shrink-0">
                      <div className="md:sticky md:top-6 md:z-10 bg-background pb-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:pr-2">
                        <div className="mb-6">
                          <Tabs openTab={openTab} setOpenTab={setOpenTab} addToken={addToken} />
                        </div>
                        {openTab === 1 && template && (
                          <>
                            <CreatePostForm
                              template={template as Template}
                              preview={currentPreview}
                              selectedSubTemplate={selectedSubTemplate}
                              onSubTemplateChange={handleSubTemplateChange}
                              finalTemplateData={finalTemplateData}
                              setPreview={handleSetPreview}
                              postContent={postContent}
                              setPostContent={setPostContent}
                              prompt={prompt}
                              setPrompt={setPrompt}
                              postImage={postImage}
                              setPostImage={setPostImage}
                              next={(templateData) => {
                                  setFinalTemplateData(templateData);
                                  setOpenTab(addToken ? 2 : 3);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              generatePreview={generatePreview}
                              isGeneratingPreview={localPreviews.some(p => p.pending)}
                              roomId={roomId as string}
                              postAudio={postAudio}
                              setPostAudio={setPostAudio}
                              audioStartTime={audioStartTime}
                              setAudioStartTime={setAudioStartTime}
                              storyboardClips={storyboardClips}
                              setStoryboardClips={setStoryboardClips}
                              storyboardAudio={storyboardAudio}
                              setStoryboardAudio={setStoryboardAudio}
                              storyboardAudioStartTime={storyboardAudioStartTime}
                              setStoryboardAudioStartTime={setStoryboardAudioStartTime}
                              creditBalance={optimisticCreditBalance}
                              refetchCredits={refetchCredits}
                              imageUploaderRef={imageUploaderRef}
                            />
                          </>
                        )}
                        {openTab === 2 && (
                          <CreateTokenForm
                            finalTokenData={finalTokenData}
                            postImage={typeof currentPreview?.image === 'string' ? [parseBase64Image(currentPreview.image)] : currentPreview?.image ? [currentPreview.image] : postImage}
                            setSavedTokenAddress={setSavedTokenAddress}
                            savedTokenAddress={savedTokenAddress}
                            setFinalTokenData={setFinalTokenData}
                            back={() => {
                              setOpenTab(1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            next={() => {
                              setOpenTab(3);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          />
                        )}
                        {openTab === 3 && (
                          <FinalizePost
                            authenticatedProfile={authenticatedProfile}
                            finalTokenData={finalTokenData}
                            onCreate={onCreate}
                            onCast={onCast}
                            back={() => {
                              setOpenTab(addToken ? 2 : 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            isCreating={isCreating}
                            addToken={addToken}
                            onAddToken={() => {
                              setAddToken(true);
                              setOpenTab(2);
                            }}
                            isRemix={!!remixMedia?.agentId}
                            setFinalTokenData={setFinalTokenData}
                            setAddToken={setAddToken}
                            template={template}
                            postContent={postContent}
                            setPostContent={setPostContent}
                            currentPreview={currentPreview}
                            setCurrentPreview={setCurrentPreview}
                          />
                        )}
                      </div>
                    </div>
                    {/* Natural Preview History Section */}
                    <div className="md:w-1/2 flex-shrink-0">
                      <PreviewHistory
                        currentPreview={currentPreview}
                        setCurrentPreview={setCurrentPreview}
                        setSelectedTemplate={setTemplate}
                        roomId={roomId}
                        templateUrl={template?.apiUrl}
                        setFinalTemplateData={setFinalTemplateData}
                        setPrompt={setPrompt}
                        postContent={postContent}
                        localPreviews={localPreviews}
                        setLocalPreviews={setLocalPreviews}
                        isFinalize={openTab > 1}
                        postImage={postImage}
                        setPostContent={setPostContent}
                        storyboardClips={storyboardClips}
                        setStoryboardClips={setStoryboardClips}
                        onAnimateImage={handleAnimateImage}
                        onExtendVideo={handleExtendVideo}
                        generatePreview={generatePreview}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>
      </main>
    </div>
  )
}

export default StudioCreatePage;