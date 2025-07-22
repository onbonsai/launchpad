import { useEffect, useState, useRef } from 'react';
import { Button } from '@src/components/Button';
import CreatePostForm from '@src/pagesComponents/Studio/CreatePostForm';
import type { SmartMedia, Template, StoryboardClip, Preview } from '@src/services/madfi/studio';
import { getRegisteredClubInfoByAddress } from '@src/services/madfi/moneyClubs';
import { getPost } from '@src/services/lens/posts';
import { fetchTokenMetadata } from '@src/utils/tokenMetadata';
import RemixPanel from '@src/components/RemixPanel/RemixPanel';
import { Modal } from '@src/components/Modal';
import toast from 'react-hot-toast';
import { PlayIcon } from '@heroicons/react/solid';
import { ImageUploaderRef } from '@src/components/ImageUploader/ImageUploader';
import { useGetCredits } from '@src/hooks/useGetCredits';
import { useAccount } from 'wagmi';
import { resumeSession } from '@src/hooks/useLensLogin';
import { generateSeededUUID } from '@pagesComponents/ChatWindow/utils';
import { getAuthToken } from '@src/utils/auth';
import { last } from 'lodash/array';
import type { NFTMetadata } from '@src/services/madfi/studio';
import useWebNotifications from '@src/hooks/useWebNotifications';
import { parseBase64Image } from '@src/utils/utils';
import { usePWA } from '@src/hooks/usePWA';
import { useAuthenticatedLensProfile } from '@src/hooks/useLensProfile';
import { useIsMiniApp } from '@src/hooks/useIsMiniApp';
import { omit } from "lodash/object";

type RemixFormProps = {
  template?: Template;
  remixMedia: SmartMedia;
  onClose: () => void;
  currentPreview?: Preview;
  setCurrentPreview?: (preview: Preview) => void;
  roomId?: string;
  setRoomId?: (roomId: string) => void;
  localPreviews?: Array<{
    isAgent: boolean;
    createdAt: string;
    agentId?: string;
    pending?: boolean;
    tempId?: string;
    content: {
      text?: string;
      preview?: Preview;
      templateData?: string;
    };
  }>;
  setLocalPreviews?: React.Dispatch<React.SetStateAction<Array<{
    isAgent: boolean;
    createdAt: string;
    agentId?: string;
    pending?: boolean;
    tempId?: string;
    content: {
      text?: string;
      preview?: Preview;
      templateData?: string;
    };
  }>>>;
  isGeneratingPreview: boolean;
  setIsGeneratingPreview: (b: boolean) => void;
  worker?: Worker;
  pendingGenerations?: Set<string>;
  setPendingGenerations?: React.Dispatch<React.SetStateAction<Set<string>>>;
  postId?: string;
  storyboardClips?: StoryboardClip[];
  storyboardAudio?: File | string | null;
  storyboardAudioStartTime?: number;
  setStoryboardClips?: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  setStoryboardAudio?: React.Dispatch<React.SetStateAction<File | string | null>>;
  setStoryboardAudioStartTime?: React.Dispatch<React.SetStateAction<number>>;
  extendedImage?: string | null;
};

export default function RemixForm({
  remixMedia,
  onClose,
  template,
  currentPreview,
  setCurrentPreview,
  roomId,
  setRoomId,
  localPreviews = [],
  setLocalPreviews,
  isGeneratingPreview,
  setIsGeneratingPreview,
  worker,
  pendingGenerations = new Set(),
  setPendingGenerations,
  postId,
  storyboardClips = [],
  storyboardAudio,
  storyboardAudioStartTime,
  setStoryboardClips,
  setStoryboardAudio,
  setStoryboardAudioStartTime,
  extendedImage,
}: RemixFormProps) {
  const { address, isConnected } = useAccount();
  const { isMiniApp, isLoading: isMiniAppLoading } = useIsMiniApp();
  const [preview, setPreview] = useState<Preview | undefined>(currentPreview);
  const [prompt, setPrompt] = useState<string>("");
  const [postContent, setPostContent] = useState<string>("");
  const [postImage, setPostImage] = useState<any>(undefined);
  const [postAudio, setPostAudio] = useState<File | null | string>(null);
  const [audioStartTime, setAudioStartTime] = useState<number>(0);
  const [finalTemplateData, setFinalTemplateData] = useState<any>(remixMedia.templateData || {});
  const { data: creditBalance, refetch: refetchCredits } = useGetCredits(address as string, isConnected);
  const [optimisticCreditBalance, setOptimisticCreditBalance] = useState<number | undefined>();
  const [finalTokenData, setFinalTokenData] = useState<{
    tokenSymbol: string;
    tokenName: string;
    tokenLogo: string;
  } | undefined>(undefined);

  const [showRemixPanel, setShowRemixPanel] = useState(false);
  const [editingClip, setEditingClip] = useState<StoryboardClip | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string>("");
  const [showEditPromptModal, setShowEditPromptModal] = useState(false);

  const imageUploaderRef = useRef<ImageUploaderRef | null>(null);
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { subscribeToPush } = useWebNotifications(address, authenticatedProfile?.address);
  const { isStandalone } = usePWA();

  const isStoryboardPost = storyboardClips.length > 0;

  useEffect(() => {
    if (extendedImage) {
      const imageFile = parseBase64Image(extendedImage);
      setPostImage([imageFile]);
    }
  }, [extendedImage]);

  useEffect(() => {
    if (setIsGeneratingPreview) {
      setIsGeneratingPreview(pendingGenerations.size > 0);
    }
  }, [pendingGenerations.size, setIsGeneratingPreview]);

  // Check for completed generations when pendingGenerations changes
  useEffect(() => {
    if (pendingGenerations.size > 0) {
      // Add a delay to allow for state updates
      const timer = setTimeout(() => {
        checkForCompletedGenerations();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pendingGenerations]);

  // Note: Pending generation restoration is now handled by the service worker check below
  // to avoid duplicates. This useEffect is disabled.

  useEffect(() => {
    setOptimisticCreditBalance(creditBalance?.creditsRemaining);
  }, [creditBalance]);

  // Load existing previews from room when component mounts
  useEffect(() => {
    const loadExistingPreviews = async () => {
      if (!roomId || !template?.apiUrl || isMiniAppLoading) return;

      try {
        const authResult = await getAuthToken({ isMiniApp, requireAuth: false, address });
        if (!authResult.success) return;

        // Fetch recent messages from the room
        const queryParams = new URLSearchParams({
          count: '20',
          end: ''
        });

        const response = await fetch(`${template.apiUrl}/previews/${roomId}/messages?${queryParams}`, {
          headers: authResult.headers,
        });

        if (!response.ok) return;

        const data = await response.json();
        const messages = data.messages || [];

        // Convert messages to localPreviews format
        const previews = messages
          .filter((msg: any) => msg.content && (msg.content.preview || msg.content.text || msg.content.templateData))
          .map((msg: any) => ({
            isAgent: msg.userId === 'agent',
            createdAt: msg.createdAt, // Use createdAt directly from the message
            agentId: msg.content?.preview?.agentId || msg.agentId,
            content: {
              text: msg.content?.text,
              preview: msg.content?.preview,
              templateData: msg.content?.templateData ? JSON.stringify(msg.content.templateData) : undefined
            }
          }));

        if (previews.length > 0 && setLocalPreviews) {
          // Don't overwrite existing localPreviews, merge with them
          setLocalPreviews(prev => {
            // Check if we already have these previews to avoid duplicates
            const existingAgentIds = new Set(prev.map((p: any) => p.agentId).filter(Boolean));
            const newPreviews = previews.filter((p: any) =>
              !existingAgentIds.has(p.agentId) && p.agentId
            );

            if (newPreviews.length > 0) {
              return [...newPreviews, ...prev];
            }
            return prev;
          });

          // Set the most recent preview as current if none is set
          const lastAgentPreview = previews
            .filter((p: any) => p.isAgent && p.content.preview)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

          if (lastAgentPreview && !currentPreview && setCurrentPreview) {
            setCurrentPreview(lastAgentPreview.content.preview);
            setPreview(lastAgentPreview.content.preview);
          }
        }
      } catch (error) {
        console.error('[RemixForm] Error loading existing previews:', error);
      }
    };

    loadExistingPreviews();
  }, [roomId, template?.apiUrl, isMiniAppLoading, isMiniApp, address]); // Re-run when dependencies change

  // Check for pending generations when component mounts
  useEffect(() => {
    const checkPendingGenerations = async () => {
      if (!roomId || !template?.apiUrl || !('serviceWorker' in navigator) || !isStandalone || isMiniAppLoading) return;

      // Wait a bit for localPreviews to be loaded from other sources first
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        // Request pending generations from service worker
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          // Create a one-time message channel to get response
          const messageChannel = new MessageChannel();

          const responsePromise = new Promise<any>((resolve) => {
            messageChannel.port1.onmessage = (event) => {
              resolve(event.data);
            };
          });

          registration.active.postMessage({
            type: 'GET_PENDING_GENERATIONS',
            roomId: roomId
          }, [messageChannel.port2]);

          const response = await Promise.race([
            responsePromise,
            new Promise(resolve => setTimeout(() => resolve({ pendingGenerations: [] }), 1000))
          ]);

          if (response.pendingGenerations && response.pendingGenerations.length > 0) {
            setLocalPreviews?.(prev => {
              // Filter out pending generations that already exist in current localPreviews
              const existingTempIds = new Set(prev.map((p: any) => p.tempId).filter(Boolean));
              const existingTaskIds = new Set(prev.map((p: any) => p.taskId).filter(Boolean));
              const existingPendingIds = new Set(prev.filter((p: any) => p.pending).map((p: any) => p.tempId || p.taskId).filter(Boolean));

              const newPendingGenerations = response.pendingGenerations.filter((gen: any) =>
                !existingTempIds.has(gen.id) && !existingTaskIds.has(gen.id) && !existingPendingIds.has(gen.id)
              );

              if (newPendingGenerations.length > 0) {
                // Add pending generations to local state with both user prompt and pending animation
                const now = new Date().toISOString();
                const allPreviews: any[] = [];

                newPendingGenerations.forEach((gen: any, index: number) => {
                  const baseTime = Date.parse(now) + (index * 2);
                  const prompt = gen.prompt || 'Generating preview...';

                  // Add pending agent message first (will be at bottom after reverse)
                  allPreviews.push({
                    tempId: gen.id,
                    taskId: gen.id,
                    isAgent: true,
                    pending: true,
                    createdAt: new Date(baseTime + 1).toISOString(),
                    content: {
                      text: prompt
                    }
                  });

                  // Add user prompt message second (will be above pending after reverse)
                  allPreviews.push({
                    isAgent: false,
                    createdAt: new Date(baseTime).toISOString(),
                    content: {
                      text: prompt
                    }
                  });
                });

                // Add new previews at the beginning so they appear at bottom after reverse
                return [...allPreviews, ...prev];
              }

              return prev;
            });

            if (setPendingGenerations) {
              setPendingGenerations(new Set(response.pendingGenerations.map((g: any) => g.id)));
            }
          }
        }
      } catch (error) {
        console.error('[RemixForm] Error checking pending generations:', error);
      }
    };

    checkPendingGenerations();
  }, [roomId, template?.apiUrl, isStandalone, isMiniAppLoading]); // Re-run when dependencies change

  // Check for completed generations when tab becomes visible
  const checkForCompletedGenerations = async () => {
    if (!roomId || !template?.apiUrl || pendingGenerations.size === 0 || isMiniAppLoading) return;

    try {
      const authResult = await getAuthToken({ isMiniApp, requireAuth: false, address });
      if (!authResult.success) return;

      // Fetch recent messages
      const queryParams = new URLSearchParams({
        count: '10',
        end: ''
      });

      const response = await fetch(`${template.apiUrl}/previews/${roomId}/messages?${queryParams}`, {
        headers: authResult.headers,
      });

      if (!response.ok) return;

      const data = await response.json();
      const messages = data.messages || [];

      // Check if any pending generations have completed
      const completedGenerations = new Set<string>();

      for (const msg of messages) {
        if (msg.userId === 'agent' && msg.content?.preview?.agentId) {
          const agentId = msg.content.preview.agentId;

          // Find the pending preview that corresponds to this agentId
          const pendingPreview = localPreviews.find((p: any) =>
            p.pending && (p.tempId === agentId || p.agentId === agentId)
          );

          // Only process if we have a pending preview with a taskId that's in our pendingGenerations set
          if (pendingPreview?.taskId && pendingGenerations.has(pendingPreview.taskId)) {
            completedGenerations.add(pendingPreview.taskId);

                        // Update local previews to mark as completed
            if (setLocalPreviews) {
              setLocalPreviews((prev: typeof localPreviews) => prev.map((p: any) => {
                if (p.taskId === pendingPreview.taskId) {
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
            }

            // Remove from service worker pending list (only for PWA)
            if ('serviceWorker' in navigator && isStandalone) {
              navigator.serviceWorker.ready.then(registration => {
                if (registration.active) {
                  registration.active.postMessage({
                    type: 'REMOVE_PENDING_GENERATION',
                    generationId: pendingPreview.taskId
                  });
                }
              }).catch(console.error);
            }

            // Set as current preview if it's for an edited clip
            if (editingClip && editingClip.id === agentId) {
              const updatedClip = {
                ...editingClip,
                preview: msg.content.preview
              };
              setStoryboardClips?.(prev => prev.map(c => c.id === agentId ? updatedClip : c));
              setPreview(msg.content.preview);
            } else if (!currentPreview || currentPreview.agentId !== agentId) {
              setCurrentPreview?.(msg.content.preview);
            }
          }
        }
      }

      // Remove completed generations from pending set
      if (completedGenerations.size > 0 && setPendingGenerations) {
        setPendingGenerations(prev => {
          const newSet = new Set(prev);
          completedGenerations.forEach(id => newSet.delete(id));
          return newSet;
        });
      }

    } catch (error) {
      console.error('[RemixForm] Error checking for completed generations:', error);
    }
  };

  // Handle page visibility changes and service worker messages
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && pendingGenerations.size > 0) {
        await checkForCompletedGenerations();
      }
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'RELOAD_MESSAGES') {
        // If roomId matches or no specific roomId, reload messages
        if (!event.data.roomId || event.data.roomId === roomId) {
          // Always check for completed generations when we get a reload message
          setTimeout(() => checkForCompletedGenerations(), 500);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Only listen for service worker messages in PWA mode
    if (isStandalone && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (isStandalone && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [pendingGenerations, roomId, template?.apiUrl, isStandalone]);

  const generatePreview = async (
    prompt: string,
    templateData: any,
    image?: File,
    aspectRatio?: string,
    nft?: NFTMetadata,
    audio?: { file: File, startTime: number },
    clipId?: string
  ) => {
    if (!template) return;

    let credits = template.estimatedCost || 0;
    if (!!templateData.enableVideo) {
      credits += 50;
    }

    if ((optimisticCreditBalance || 0) < credits) {
      toast.error("You don't have enough credits to generate this preview.");
      return;
    }

    // Prevent multiple generations with same prompt simultaneously (for non-clip generations)
    if (!clipId) {
      const hasPendingPrompt = localPreviews.some((p: any) =>
        p.pending && p.content.text === prompt
      );
      if (hasPendingPrompt) {
        toast("Already generating a preview with this prompt", { icon: 'ℹ️' });
        return;
      }
    }

    const authResult = await getAuthToken({ isMiniApp, address });
    if (!authResult.success) {
      return;
    }
    const idToken = authResult.token;
    const tempId = clipId || generateSeededUUID(`${address}-${Date.now() / 1000}`);

    // Request notification permission and subscribe to push notifications
    subscribeToPush();

    setOptimisticCreditBalance((prev) => (prev !== undefined ? prev - credits : undefined));
    setIsGeneratingPreview(true);

    if (!clipId && setLocalPreviews) {
      const now = new Date().toISOString();
      setLocalPreviews([
        // Add pending agent message first (so it appears at top when reversed)
        {
          tempId,
          taskId: null, // Will be updated when we get the taskId
          isAgent: true,
          pending: true,
          createdAt: new Date(Date.parse(now) + 1).toISOString(), // After user message
          content: {
            text: prompt // Store the prompt here too for reference
          }
        } as any,
        // Add user message with prompt second (so it appears at bottom when reversed)
        {
          isAgent: false,
          createdAt: now,
          content: {
            text: prompt
          }
        },
        ...localPreviews
      ]);
    }

    // Track with tempId until we get taskId
    if (setPendingGenerations) {
        setPendingGenerations(prev => new Set(prev).add(tempId));
    }

        // Create task on server
    let taskId: string | null = null;
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify({
        roomId,
        category: template.category,
        templateName: template.name,
        templateData: {
          ...(templateData.clips ? {} : { ...templateData }),
          aspectRatio: aspectRatio || last(storyboardClips)?.templateData?.aspectRatio || "9:16",
          nft,
          // Only include audioStartTime if audio is explicitly provided by user
          ...(audio && { audioStartTime: audio.startTime }),
          subTemplateId: undefined,
        },
        prompt,
      }));
      if (image) formData.append('image', image);
      // Only append audio if explicitly provided by user (not from original post)
      if (audio) formData.append('audio', audio.file);

      const response = await fetch(`${template.apiUrl}/post/create-preview`, {
        method: "POST",
        headers: omit(authResult.headers, 'Content-Type'),
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 403) {
          const errorText = (await response.json())?.error;
          if (errorText.includes("not enough credits")) {
            throw new Error("not enough credits");
          }
        }
        throw new Error(`Preview generation failed: ${response.statusText}`);
      }

      const taskResponse = await response.json();
      taskId = taskResponse.taskId;

      if (!taskId) {
        throw new Error("No taskId received from server");
      }

      // Update pending generations with actual taskId
      if (setPendingGenerations) {
        setPendingGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          newSet.add(taskId);
          return newSet;
        });
      }

      // Update local previews with taskId
      if (setLocalPreviews) {
        setLocalPreviews(prev => prev.map((p: any) => {
          if (p.tempId === tempId) {
            return { ...p, taskId };
          }
          return p;
        }));
      }

      // Register with service worker for background tracking (only for PWA)
      if ('serviceWorker' in navigator && isStandalone) {
        navigator.serviceWorker.ready.then(registration => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'REGISTER_PENDING_GENERATION',
              generation: {
                id: taskId,
                roomId,
                apiUrl: template.apiUrl,
                expectedAgentId: tempId,
                timestamp: Date.now(),
                idToken: idToken,
                postUrl: postId ? `/post/${postId}` : '/',
                prompt: prompt
              }
            });
          }
        }).catch(console.error);
      }

    } catch (error: any) {
      console.error('[RemixForm] Error creating preview:', error);

      if (error.message === "not enough credits") {
        toast.error("Not enough credits to generate preview");
      } else {
        toast.error("Failed to generate preview");
      }

      // Clean up on error - use taskId if we got one, otherwise use tempId
      const generationIdToRemove = taskId || tempId;

      if (setPendingGenerations) {
        setPendingGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(generationIdToRemove);
          return newSet;
        });
      }

      if (setLocalPreviews) {
        setLocalPreviews(prev => prev.filter((p: any) => p.tempId !== tempId));
      }

      // Remove from service worker pending list (only for PWA)
      if ('serviceWorker' in navigator && isStandalone) {
        navigator.serviceWorker.ready.then(registration => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'REMOVE_PENDING_GENERATION',
              generationId: generationIdToRemove
            });
          }
        }).catch(console.error);
      }

      setIsGeneratingPreview(false);
    }
  }

  const getVideoDuration = (videoUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.addEventListener('loadedmetadata', () => {
        resolve(video.duration || 6);
      });
      video.addEventListener('error', () => {
        resolve(6);
      });
      video.src = videoUrl;
      video.load();
    });
  };

  useEffect(() => {
    if (remixMedia.templateData) {
      const templateData = remixMedia.templateData as any;
      if (templateData.audioData) {
        setStoryboardAudio?.(templateData.audioData.data || templateData.audioData.url || templateData.audioData);
        setStoryboardAudioStartTime?.(templateData.audioStartTime || 0);
      }

      if (templateData.prompt && !templateData.clips) {
        setPrompt(templateData.prompt);
      }

      // If this is a single video post (no existing storyboard clips), create a default storyboard with one clip
      if (storyboardClips.length === 0 && !templateData.clips && currentPreview && setStoryboardClips) {
        const createDefaultClip = async () => {
          let duration = 6; // Default duration

          // Try to get actual video duration if video exists
          if (currentPreview.video?.url) {
            try {
              duration = await getVideoDuration(currentPreview.video.url);
            } catch (error) {
              console.warn('Could not get video duration, using default:', error);
            }
          }

          const defaultClip: StoryboardClip = {
            id: currentPreview.agentId || generateSeededUUID(`${address}-${Date.now()}`),
            preview: currentPreview,
            startTime: 0,
            endTime: duration,
            duration: duration,
            templateData: templateData
          };
          setStoryboardClips([defaultClip]);
        };

        createDefaultClip();
      }
    }
  }, [remixMedia.templateData, currentPreview, storyboardClips.length, address, setStoryboardClips]);

  const handleSetPreview = (preview: Preview) => {
    if (setCurrentPreview) {
      setCurrentPreview(preview);
    }
    if (preview.roomId && preview.roomId !== roomId && setRoomId) {
      setRoomId(preview.roomId);
    }

    const now = new Date().toISOString();

    if (setLocalPreviews) {
      const newPreviews = [...localPreviews, {
        isAgent: false,
        createdAt: now,
        content: {
          templateData: JSON.stringify(preview.templateData || {}),
          text: Object.entries(preview.templateData || {}).map(([key, value]) => `${key}: ${value}`).join('\n')
        }
      }, {
        isAgent: true,
        createdAt: new Date(Date.parse(now) + 1).toISOString(),
        content: {
          preview: preview,
          text: preview.text
        }
      }];
      setLocalPreviews(newPreviews);
    }
  };

  useEffect(() => {
    if (!!remixMedia) {
      if (remixMedia.token?.address) {
        getRegisteredClubInfoByAddress(remixMedia.token.address, remixMedia.token.chain).then((token) => {
          if (!token || !token.name || !token.symbol) {
            fetchTokenMetadata(remixMedia.token.address, remixMedia.token.chain).then((_token) => {
              setFinalTokenData({
                tokenName: _token?.name,
                tokenSymbol: _token?.symbol,
                tokenLogo: _token?.logo,
              });
            })
          } else {
            setFinalTokenData({
              tokenName: token.name,
              tokenSymbol: token.symbol,
              tokenLogo: token.image,
            });
          }
        });
      }

      if (remixMedia.postId) {
        getPost(remixMedia.postId).then((post) => {
          if ((post as any)?.metadata?.image?.item) {
            fetch((post as any)?.metadata?.image?.item)
              .then(res => res.blob())
              .then(blob => {
                const file = Object.assign(new File([blob], 'remix-image.jpg', { type: blob.type }), {
                  preview: URL.createObjectURL(blob)
                });
                setPostImage(file);
              })
              .catch(console.error);
          }
        }).catch(console.error);
      }
    }
  }, [remixMedia]);

  const handleNext = (templateData: any) => {
    setFinalTemplateData(templateData);
  };

  const handleAddClip = () => {
    toast("Use the main interface to generate new clips", { icon: '💡' });
  };

  const handleReplaceClip = async (clipId: string) => {
    const clip = storyboardClips.find(c => c.id === clipId);
    if (clip) {
      setEditingClip(clip);
      setEditingPrompt(clip.preview.templateData?.prompt || "");
      setShowEditPromptModal(true);
    }
  };

  const handleEditClip = (clip: StoryboardClip) => {
    setEditingClip(clip);
    setEditingPrompt(clip.preview.templateData?.prompt || "");
    setShowEditPromptModal(true);
  };

  const handlePreviewClip = (clip: StoryboardClip) => {
    setPreview(clip.preview);
    if (setCurrentPreview) {
      setCurrentPreview(clip.preview);
    }
  };

  const handleRegenerateClip = async () => {
    if (!editingClip) return;

    setShowEditPromptModal(false);

    await generatePreview(
        editingPrompt || editingClip.preview.templateData?.prompt || "",
        editingClip.templateData,
      undefined,
      editingClip.templateData?.aspectRatio,
      undefined,
      undefined,
        editingClip.id
      );

      setEditingClip(null);
      setEditingPrompt("");
  };

  const handleCopyField = (fieldKey: string, value: any) => {
    switch (fieldKey) {
      case 'prompt':
        setPrompt(value);
        break;
      case 'sceneDescription':
      case 'stylePreset':
      case 'subjectReference':
      case 'elevenLabsVoiceId':
      case 'narration':
        setFinalTemplateData(prev => ({
          ...prev,
          [fieldKey]: value
        }));
        break;
      default:
        setFinalTemplateData(prev => ({
          ...prev,
          [fieldKey]: value
        }));
        break;
    }
  };

  // Sync storyboard clips back to parent's storyboard previews
  useEffect(() => {
    if (setStoryboardClips) {
      setStoryboardClips(storyboardClips);
    }
  }, [storyboardClips, setStoryboardClips]);

  // Handle successful composition by adding to local previews
  const handleCompositionSuccess = (composedPreview: Preview) => {
    if (setLocalPreviews) {
      const now = new Date().toISOString();

      // Ensure video structure is correct for rendering
      const previewToAdd = {
        ...composedPreview,
        video: composedPreview.video ? {
          ...composedPreview.video,
          // Make sure we have the blob or URL available
          ...(composedPreview.video.url && { url: composedPreview.video.url }),
          ...(composedPreview.video.blob && { blob: composedPreview.video.blob })
        } : undefined
      };

      setLocalPreviews(prev => {
        const newPreviews = [{
          isAgent: true,
          createdAt: now,
          agentId: composedPreview.agentId,
          content: {
            preview: previewToAdd,
            text: "",
          }
        }, ...prev];
        return newPreviews;
      });

      onClose();
    }
  };

  return (
    <div className="w-full">
      <div className="border border-dark-grey/50 rounded-lg bg-black/50 p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-brand-highlight font-medium">
            {isStoryboardPost ? 'Remix Storyboard' : 'Remix this post'}
          </h3>
          <div className="flex items-center gap-2">
            {isStoryboardPost && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setShowRemixPanel(true)}
              >
                View Clips ({storyboardClips.length})
              </Button>
            )}

            <Button
              variant="dark-grey"
              size="xs"
              onClick={onClose}
              className="text-white/60 hover:text-white"
            >
              Close
            </Button>
          </div>
        </div>


        {!template ? (
          <div className="text-center py-8">
            <p className="text-white/60 mb-4">
              {isStoryboardPost
                ? "This storyboard post uses a template that isn't currently available."
                : "This post uses a template that isn't currently available."}
            </p>
            <p className="text-white/40 text-sm">
              Template: {remixMedia.template || 'Unknown'}
            </p>
          </div>
        ) : (
          <>
          <CreatePostForm
            template={template}
            selectedSubTemplate={template.templateData?.subTemplates?.find((subTemplate: any) => subTemplate.id === (remixMedia.templateData as any)?.subTemplateId) || undefined}
            finalTemplateData={finalTemplateData}
            preview={preview}
            setPreview={handleSetPreview}
            next={handleNext}
            postContent={postContent}
            setPostContent={setPostContent}
            prompt={prompt}
            setPrompt={setPrompt}
            postImage={postImage}
            setPostImage={setPostImage}
            isGeneratingPreview={isGeneratingPreview}
            postAudio={postAudio}
            setPostAudio={setPostAudio}
            audioStartTime={audioStartTime}
            setAudioStartTime={setAudioStartTime}
            roomId={roomId}
            tooltipDirection="top"
            remixToken={finalTokenData ? {
              address: remixMedia.token.address,
              symbol: finalTokenData.tokenSymbol,
              chain: remixMedia.token.chain
            } : undefined}
            remixPostId={remixMedia.postId}
            remixMediaTemplateData={remixMedia.templateData}
            onClose={onClose}
            storyboardClips={storyboardClips}
            setStoryboardClips={setStoryboardClips || (() => {})}
            storyboardAudio={storyboardAudio || null}
            setStoryboardAudio={setStoryboardAudio || (() => {})}
            storyboardAudioStartTime={storyboardAudioStartTime || 0}
            setStoryboardAudioStartTime={setStoryboardAudioStartTime || (() => {})}
            creditBalance={creditBalance?.creditsRemaining}
            refetchCredits={refetchCredits}
            imageUploaderRef={imageUploaderRef}
            generatePreview={generatePreview}
            onCompositionSuccess={handleCompositionSuccess}
            />

            {/* {pendingGenerations.size > 0 && (
              <div className="mt-4">
                <div className="text-xs text-white/40 mb-2">Generating...</div>
                <div className="space-y-2">
                  {Array.from(pendingGenerations).map((generationId) => {
                    // generationId could be either a tempId or taskId
                    const pendingPreview = localPreviews.find((p: any) =>
                      p.tempId === generationId || p.taskId === generationId
                    );
                    return (
                      <div key={generationId} className="flex items-start gap-3 p-3 bg-card-light/30 rounded-lg border border-dark-grey/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-highlight/10 to-transparent animate-shimmer" />

                        <div className="relative flex items-center gap-3 w-full">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-brand-highlight/20 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-highlight border-t-transparent" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 font-medium">Generating preview</p>
                            {pendingPreview && (pendingPreview.content as any)?.prompt && (
                              <p className="text-xs text-white/40 mt-0.5 truncate">
                                "{(pendingPreview.content as any).prompt}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )} */}
          </>
        )}
      </div>

      <Modal
        open={showRemixPanel}
        onClose={() => setShowRemixPanel(false)}
        setOpen={setShowRemixPanel}
        panelClassnames="!max-w-4xl !max-h-[90vh]"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Storyboard Clips</h2>
          <RemixPanel
            clips={storyboardClips}
            setClips={setStoryboardClips || (() => {})}
            onAddClip={handleAddClip}
            onReplaceClip={handleReplaceClip}
            onEditClip={handleEditClip}
            onPreviewClip={handlePreviewClip}
            onCopyField={handleCopyField}
            className="max-h-[70vh] overflow-y-auto"
          />
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => setShowRemixPanel(false)}
              variant="primary"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showEditPromptModal}
        onClose={() => setShowEditPromptModal(false)}
        setOpen={setShowEditPromptModal}
        panelClassnames="!max-w-2xl"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingClip ? 'Edit & Regenerate Clip' : 'Edit Clip'}
          </h3>

          {editingClip && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                <div className="relative w-24 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                  {editingClip.preview.imagePreview || editingClip.preview.image ? (
                    <img
                      src={editingClip.preview.imagePreview || editingClip.preview.image}
                      alt="Clip preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlayIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">
                    Clip {storyboardClips.findIndex(c => c.id === editingClip.id) + 1}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Duration: {Math.round(editingClip.endTime - editingClip.startTime)}s
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Edit Prompt
                </label>
                <textarea
                  value={editingPrompt}
                  onChange={(e) => setEditingPrompt(e.target.value)}
                  className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                  placeholder="Enter the prompt for this clip..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => {
                    setShowEditPromptModal(false);
                    setEditingClip(null);
                    setEditingPrompt("");
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerateClip}
                  variant="primary"
                  disabled={!editingPrompt.trim() || isGeneratingPreview}
                >
                  {isGeneratingPreview ? 'Regenerating...' : 'Regenerate Clip'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}