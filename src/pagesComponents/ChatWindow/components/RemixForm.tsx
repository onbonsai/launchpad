import { useEffect, useState, useRef } from 'react';
import { Button } from '@src/components/Button';
import CreatePostForm from '@src/pagesComponents/Studio/CreatePostForm';
import type { SmartMedia, Template, TokenData, Preview } from '@src/services/madfi/studio';
import { getRegisteredClubInfoByAddress } from '@src/services/madfi/moneyClubs';
import { getPost } from '@src/services/lens/posts';
import { fetchTokenMetadata } from '@src/utils/tokenMetadata';
import type { StoryboardClip } from '@pages/studio/create';
import RemixPanel from '@src/components/RemixPanel/RemixPanel';
import { Modal } from '@src/components/Modal';
import toast from 'react-hot-toast';
import { PlayIcon } from '@heroicons/react/solid';
import { ImageUploaderRef } from '@src/components/ImageUploader/ImageUploader';
import { useGetCredits } from '@src/hooks/useGetCredits';
import { useAccount } from 'wagmi';
import { resumeSession } from '@src/hooks/useLensLogin';
import { generateSeededUUID } from '@pagesComponents/ChatWindow/utils';
import { last } from 'lodash/array';
import type { NFTMetadata } from '@src/services/madfi/studio';
import useWebNotifications from '@src/hooks/useWebNotifications';
import { parseBase64Image } from '@src/utils/utils';


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
  storyboardPreviews?: Preview[];
  setStoryboardPreviews?: React.Dispatch<React.SetStateAction<Preview[]>>;
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
  storyboardPreviews = [],
  setStoryboardPreviews,
  extendedImage,
}: RemixFormProps) {
  const { address, isConnected } = useAccount();
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
  
  // Initialize storyboard clips from parent's storyboard previews
  const [storyboardClips, setStoryboardClips] = useState<StoryboardClip[]>(() => {
    if (storyboardPreviews && storyboardPreviews.length > 0) {
      return storyboardPreviews.map((preview, index) => ({
        id: preview.agentId || `clip-${index}`,
        preview: preview,
        templateData: preview.templateData,
        startTime: 0,
        endTime: 6, // Default duration
        duration: 6,
      }));
    }
    return [];
  });
  const [storyboardAudio, setStoryboardAudio] = useState<File | string | null>(null);
  const [storyboardAudioStartTime, setStoryboardAudioStartTime] = useState<number>(0);
  
  const [showRemixPanel, setShowRemixPanel] = useState(false);
  const [editingClip, setEditingClip] = useState<StoryboardClip | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string>("");
  const [showEditPromptModal, setShowEditPromptModal] = useState(false);
  
  const imageUploaderRef = useRef<ImageUploaderRef | null>(null);
  const { subscribeToPush } = useWebNotifications(address);
  
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

  // Sync storyboard clips back to parent's storyboard previews
  useEffect(() => {
    if (setStoryboardPreviews) {
      const previews = storyboardClips.map(clip => clip.preview);
      setStoryboardPreviews(previews);
    }
  }, [storyboardClips, setStoryboardPreviews]);

  // Sync storyboard clips when storyboardPreviews prop changes (e.g., from chat interface)
  useEffect(() => {
    if (storyboardPreviews && storyboardPreviews.length > 0) {
      const newClips = storyboardPreviews.map((preview, index) => ({
        id: preview.agentId || `clip-${index}`,
        preview: preview,
        templateData: preview.templateData,
        startTime: 0,
        endTime: 6, // Default duration
        duration: 6,
      }));
      
      // Only update if the clips are actually different
      const currentClipIds = storyboardClips.map(c => c.id).sort();
      const newClipIds = newClips.map(c => c.id).sort();
      
      if (JSON.stringify(currentClipIds) !== JSON.stringify(newClipIds)) {
        setStoryboardClips(newClips);
      }
    }
  }, [storyboardPreviews]);

  useEffect(() => {
    setOptimisticCreditBalance(creditBalance?.creditsRemaining);
  }, [creditBalance]);

  // Load existing previews from room when component mounts
  useEffect(() => {
    const loadExistingPreviews = async () => {
      if (!roomId || !template?.apiUrl) return;
      
      try {
        const sessionClient = await resumeSession(true);
        if (!sessionClient) return;

        const creds = await sessionClient.getCredentials();
        if (creds.isErr() || !creds.value) return;
        
        const idToken = creds.value.idToken;
        
        // Fetch recent messages from the room
        const queryParams = new URLSearchParams({
          count: '20',
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

        console.log('[RemixForm] Messages:', messages);
        
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
          setLocalPreviews(previews);
          
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
  }, [roomId, template?.apiUrl]); // Only run on mount and when roomId/apiUrl changes

  // Check for pending generations when component mounts
  useEffect(() => {
    const checkPendingGenerations = async () => {
      if (!roomId || !template?.apiUrl || !('serviceWorker' in navigator)) return;
      
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
            // Add pending generations to local state
            const pendingPreviews = response.pendingGenerations.map((gen: any) => ({
              tempId: gen.id,
              taskId: gen.id,
              isAgent: true,
              pending: true,
              createdAt: new Date(gen.timestamp).toISOString(),
              content: { 
                prompt: gen.prompt || 'Generating preview...'
              }
            }));
            
            if (setLocalPreviews) {
              setLocalPreviews(prev => [...prev, ...pendingPreviews]);
            }
            
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
  }, [roomId, template?.apiUrl]);

  // Check for completed generations when tab becomes visible
  const checkForCompletedGenerations = async () => {
    if (!roomId || !template?.apiUrl || pendingGenerations.size === 0) return;
    
    console.log('[RemixForm] Checking for completed generations...');
    
    try {
      const sessionClient = await resumeSession(true);
      if (!sessionClient) return;

      const creds = await sessionClient.getCredentials();
      if (creds.isErr() || !creds.value) return;
      
      const idToken = creds.value.idToken;
      
      // Fetch recent messages
      const queryParams = new URLSearchParams({
        count: '10',
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
          
          // Check if this was a pending generation - we might have the taskId stored
          const isPending = Array.from(pendingGenerations).some(id => {
            // Check if this preview matches our pending generations
            return localPreviews.some((p: any) => 
              p.pending && (p.tempId === agentId || p.agentId === agentId)
            );
          });
          
          if (isPending) {
            // Find the taskId that corresponds to this preview
            const taskId = Array.from(pendingGenerations).find(id => {
              const pendingPreview = localPreviews.find((p: any) => 
                p.pending && (p.tempId === agentId || p.agentId === agentId)
              );
              return pendingPreview !== undefined;
            });
            
            if (taskId) {
              completedGenerations.add(taskId);
            }
            
            // Update local previews to mark as completed
            if (setLocalPreviews) {
              setLocalPreviews((prev: typeof localPreviews) => prev.map((p: any) => {
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
            }
            
            // Set as current preview if it's for an edited clip
            if (editingClip && editingClip.id === agentId) {
              const updatedClip = {
                ...editingClip,
                preview: msg.content.preview
              };
              setStoryboardClips(prev => prev.map(c => c.id === agentId ? updatedClip : c));
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
        console.log('[RemixForm] Received reload message from service worker', event.data);
        
        // If roomId matches or no specific roomId, reload messages
        if (!event.data.roomId || event.data.roomId === roomId) {
          checkForCompletedGenerations();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [pendingGenerations, roomId, template?.apiUrl]);

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

    const sessionClient = await resumeSession(true);
    if (!sessionClient) {
      toast.error("Please log in to generate previews.");
      return;
    }
    const creds = await sessionClient.getCredentials();
    if (creds.isErr() || !creds.value) {
      toast.error("Authentication failed.");
      return;
    }
    const idToken = creds.value.idToken;
    const tempId = clipId || generateSeededUUID(`${address}-${Date.now() / 1000}`);

    // Request notification permission and subscribe to push notifications
    subscribeToPush();

    setOptimisticCreditBalance((prev) => (prev !== undefined ? prev - credits : undefined));
    setIsGeneratingPreview(true);
    
    if (!clipId && setLocalPreviews) {
      const now = new Date().toISOString();
      setLocalPreviews([
        ...localPreviews, 
        // Add user message with prompt
        {
          isAgent: false,
          createdAt: now,
          content: { 
            text: prompt 
          }
        },
        // Add pending agent message
        {
          tempId,
          taskId: null, // Will be updated when we get the taskId
          isAgent: true,
          pending: true,
          createdAt: new Date(Date.parse(now) + 1).toISOString(), // Slightly after user message
          content: { 
            text: prompt // Store the prompt here too for reference
          }
        } as any
      ]);
    }

    // Track with tempId until we get taskId
    if (setPendingGenerations) {
        setPendingGenerations(prev => new Set(prev).add(tempId));
    }

    // Create task on server
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify({
        roomId,
        category: template.category,
        templateName: template.name,
        templateData: {
          ...templateData,
          aspectRatio: aspectRatio || last(storyboardClips)?.templateData?.aspectRatio || "9:16",
          nft,
          audioStartTime: templateData.audioStartTime || audio?.startTime
        },
        prompt,
      }));
      if (image) formData.append('image', image);
      if (audio) formData.append('audio', audio.file);

      const response = await fetch(`${template.apiUrl}/post/create-preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 403) {
          const errorText = await response.text();
          if (errorText.includes("not enough credits")) {
            throw new Error("not enough credits");
          }
        }
        throw new Error(`Preview generation failed: ${response.statusText}`);
      }

      const taskResponse = await response.json();
      const taskId = taskResponse.taskId;

      if (!taskId) {
        throw new Error("No taskId received from server");
      }

      console.log(`[RemixForm] Task created with ID: ${taskId}`);

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

      // Register with service worker for background tracking
      if ('serviceWorker' in navigator) {
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
      
      // Clean up on error
      if (setPendingGenerations) {
        setPendingGenerations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });
      }
      
      if (setLocalPreviews) {
        setLocalPreviews(localPreviews.filter((p: any) => p.tempId !== tempId));
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
            setStoryboardAudio(templateData.audioData.data || templateData.audioData.url || templateData.audioData);
            setStoryboardAudioStartTime(
            typeof templateData.audioStartTime === 'object' && templateData.audioStartTime.$numberDouble
                ? parseFloat(templateData.audioStartTime.$numberDouble)
                : templateData.audioStartTime || 0
            );
        } else if (templateData.audioStartTime !== undefined) {
            setStoryboardAudioStartTime(
            typeof templateData.audioStartTime === 'object' && templateData.audioStartTime.$numberDouble
                ? parseFloat(templateData.audioStartTime.$numberDouble)
                : templateData.audioStartTime || 0
            );
        }
        
        if (templateData.prompt && !templateData.clips) {
            setPrompt(templateData.prompt);
        }
    }
  }, [remixMedia.templateData]);

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
              setStoryboardClips={setStoryboardClips}
              storyboardAudio={storyboardAudio}
              setStoryboardAudio={setStoryboardAudio}
              storyboardAudioStartTime={storyboardAudioStartTime}
              setStoryboardAudioStartTime={setStoryboardAudioStartTime}
              creditBalance={creditBalance?.creditsRemaining}
              refetchCredits={refetchCredits}
              imageUploaderRef={imageUploaderRef}
              generatePreview={generatePreview}
            />
            
            {pendingGenerations.size > 0 && (
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
            )}
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
            setClips={setStoryboardClips}
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