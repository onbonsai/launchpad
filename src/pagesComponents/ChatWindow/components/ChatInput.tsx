import { type ChangeEvent, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import SendSvg from '../svg/SendSvg';
import PaySvg from '../svg/PaySvg';
import ImageAttachment from "../svg/ImageAttachment";
import toast from 'react-hot-toast';
import { PROMOTE_TOKEN_COST } from '../constants';
import { Button } from '@src/components/Button';
import type { SmartMedia, Template, Preview } from '@src/services/madfi/studio';
import { useTopUpModal } from '@src/context/TopUpContext';
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { useGetCredits } from '@src/hooks/useGetCredits';
import { useAccount } from 'wagmi';
import { useAuth } from '@src/hooks/useAuth';
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { SparkIcon } from '@src/components/Icons/SparkIcon';

// Helper function to extract frame from video
const extractFrameFromVideo = (video: any, extractFirstFrame: boolean = true, hasOutro?: boolean): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    if (!video) {
      reject(new Error('No video data provided'));
      return;
    }

    if (typeof video === 'string' && video.startsWith('data:image/')) {
      resolve(video);
      return;
    }

    // Always use server-side extraction
    try {
      let videoUrl: string;
      if (typeof video === 'string') {
        videoUrl = video;
      } else if (video.url) {
        videoUrl = video.url;
      } else {
        reject(new Error('Cannot extract frame: no URL available'));
        return;
      }

      const response = await fetch('/api/media/extract-frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          framePosition: extractFirstFrame ? 'start' : 'end',
          hasOutro,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server extraction failed: ${response.status}`);
      }

      const result = await response.json();
      if (result.frameData) {
        resolve(result.frameData);
      } else {
        reject(new Error('Server extraction returned no image'));
      }
    } catch (error) {
      reject(new Error(`Frame extraction failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
};

function AttachmentButton({ attachment, setAttachment }) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const [file] = Array.from(files);
    if (file.size > 10000000) {
      toast.error("Max file size is 10mb");
      return;
    }

    setAttachment(file);
  };

  const triggerFileInput = () => {
    document.getElementById('imageUploadInput')?.click();
  };

  return (
    <div className='flex flex-row justify-between'>
      {!!attachment && (
        <button
          type="button"
          onClick={() => setAttachment(undefined)}
          className="flex justify-between items-center rounded-[10px] px-2 py-1 transition-colors bg-[#D00A59] text-white hover:bg-opacity-80"
        >
          <span>{attachment.name}</span>
          <span className="ml-2">x</span>
        </button>
      )}
      {!attachment && (
        <>
          <input
            type="file"
            id="imageUploadInput"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            multiple={false}
          />
          <button
            type="button"
            onClick={triggerFileInput}
            className="rounded-[10px] p-2 transition-colors bg-[#D00A59] text-white hover:bg-opacity-80"
          >
            <ImageAttachment />
          </button>
        </>
      )}
    </div>
  )
}

export type ChatInputProps = {
  handleSubmit: (e: React.FormEvent) => void;
  userInput: string;
  setUserInput: (input: string) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  disabled?: boolean;
  attachment?: File;
  setAttachment: (file?: File) => void;
  requireBonsaiPayment?: number;
  setRequireBonsaiPayment: (amount?: number) => void;
  showSuggestions?: boolean;
  placeholder?: string;
  templates?: Template[];
  remixMedia?: SmartMedia;
  roomId?: string;
  currentPreview?: Preview;
  setCurrentPreview?: (preview: Preview) => void;
  localPreviews?: Array<{
    isAgent: boolean;
    createdAt: string;
    content: {
      text?: string;
      preview?: Preview;
      templateData?: string;
    };
  }>;
  setLocalPreviews?: React.Dispatch<React.SetStateAction<Array<{
    isAgent: boolean;
    createdAt: string;
    content: {
      text?: string;
      preview?: Preview;
      templateData?: string;
    };
  }>>>;
  isPosting?: boolean;
  onPost?: (text: string) => Promise<void>;
  isRemixing?: boolean;
  worker?: Worker;
  pendingGenerations?: Set<string>;
  setPendingGenerations?: React.Dispatch<React.SetStateAction<Set<string>>>;
  postId?: string;
  post?: any; // Add post object
  imageToExtend?: string | null;
  setImageToExtend?: React.Dispatch<React.SetStateAction<string | null>>;
};

const DEFAULT_PLACEHOLDER = "Ask anything";

export default function ChatInput({
  handleSubmit,
  userInput,
  setUserInput,
  disabled = false,
  attachment,
  setAttachment,
  requireBonsaiPayment,
  setRequireBonsaiPayment,
  showSuggestions,
  placeholder,
  templates,
  remixMedia,
  roomId,
  currentPreview,
  setCurrentPreview,
  localPreviews = [],
  setLocalPreviews,
  isPosting = false,
  onPost,
  isRemixing = false,
  worker,
  pendingGenerations,
  setPendingGenerations,
  postId,
  post,
  imageToExtend,
  setImageToExtend,
}: ChatInputProps) {
  const { isMiniApp } = useIsMiniApp();
  const { address, isConnected } = useAccount();
  const { getAuthHeaders } = useAuth();
  const { data: creditBalance, refetch: refetchCredits } = useGetCredits(address as string, isConnected);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [requireAttachment, setRequireAttachment] = useState(false);
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState(placeholder || DEFAULT_PLACEHOLDER);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [frameSelection, setFrameSelection] = useState<'start' | 'end'>('start');
  const [animateImage, setAnimateImage] = useState(false);
  const [isGeneratingRemix, setIsGeneratingRemix] = useState(false);
  const [insufficientCreditsError, setInsufficientCreditsError] = useState(false);

  const remixTemplate = useMemo(() => {
    if (!remixMedia || !templates) return undefined;

    let template = templates.find((t) => t.name === remixMedia.template);

    if (!template) {
      template = templates.find((t) =>
        t.name.toLowerCase() === remixMedia.template?.toLowerCase()
      );
    }

    if (!template && remixMedia.templateData && (remixMedia.templateData as any).clips) {
      template = templates.find((t) => t.name.toLowerCase().includes('video'));
    }

    if (!template && templates.length > 0) {
      template = templates[0];
      console.warn(`Template "${remixMedia.template}" not found, using fallback: ${template.name}`);
    }

    return template;
  }, [remixMedia, templates]);

  const { openSwapToGenerateModal } = useTopUpModal();

  // Check if the media is a video
  const isVideo = remixMedia?.templateData &&
    (remixMedia.template === 'video' ||
     !!(remixMedia.templateData as any).video ||
     !!(remixMedia.templateData as any).clips);

  // Check if the media is an image
  const isImage = !isVideo;

  // Calculate credits needed for remix
  const remixCreditsNeeded = animateImage ? 30 : (remixTemplate?.estimatedCost || 10);
  const hasEnoughCredits = (creditBalance?.creditsRemaining || 0) >= remixCreditsNeeded;

  useEffect(() => {
    if (textareaRef.current && !isGeneratingPreview) {
      // Only auto-focus on desktop, not on mobile
      if (window.innerWidth >= 768) {
        textareaRef.current.focus();
      }
    }
  }, [isGeneratingPreview]);

  // Remove imageToExtend logic since we no longer support extending videos
  useEffect(() => {
    if (imageToExtend && setImageToExtend) {
      setImageToExtend(null);
    }
  }, [imageToExtend, setImageToExtend]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = e.target;
      setUserInput(value);
      if (!value) {
        setRequireAttachment(false);
        setRequireBonsaiPayment(undefined);
      }
      if (value.toLowerCase().startsWith("create a token") && !requireAttachment) {
        setRequireAttachment(true);
      }
      if (value.toLowerCase().startsWith("promote my launchpad token") && !requireBonsaiPayment) {
        setRequireBonsaiPayment(PROMOTE_TOKEN_COST);
      }
    },
    [setUserInput, requireAttachment, requireBonsaiPayment, setRequireBonsaiPayment],
  );

  const handlePost = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !onPost) return;
    await onPost(userInput.trim());
  }, [userInput, onPost]);

  const generateRemix = useCallback(async () => {
    if (!remixTemplate || !userInput.trim()) return;

    if (!hasEnoughCredits) {
      openSwapToGenerateModal({
        creditsNeeded: remixCreditsNeeded,
        onSuccess: () => {
          refetchCredits();
          generateRemix();
        },
        token: !!remixMedia?.token ? {
          address: remixMedia?.token.address as `0x${string}`,
          chain: remixMedia?.token.chain as string,
          symbol: remixMedia?.token?.metadata?.symbol as string,
        } : undefined
      });
      return;
    }

    setIsGeneratingRemix(true);
    setInsufficientCreditsError(false); // Reset error state when starting generation

    try {
      let imageToUse: File | undefined;

      // Extract frame from video or use existing image
      if (isVideo) {
        // Check templateData first, then fall back to post metadata
        const videoData = (remixMedia?.templateData as any)?.video ||
          ((post?.metadata as any)?.video?.item ? { url: (post.metadata as any).video.item } : undefined);

        if (videoData) {
          try {
            const videoUrl = typeof videoData === 'string' ? videoData : videoData.url;
            const frameDataUrl = await extractFrameFromVideo({ url: videoUrl }, frameSelection === 'start', remixMedia?.templateData?.hasOutro);

            // Convert data URL to File
            const response = await fetch(frameDataUrl);
            const blob = await response.blob();
            imageToUse = new File([blob], 'frame.webp', { type: 'image/webp' });
          } catch (error) {
            console.error('Failed to extract frame:', error);
            setIsGeneratingRemix(false);
            return;
          }
        }
      } else if (isImage) {
        // For images, check templateData first, then fall back to post metadata
        const imageData = (remixMedia?.templateData as any)?.image ||
          (post?.metadata as any)?.image?.item;

        if (imageData) {
          try {
            // If it's a URL, fetch and convert to File
            const imageUrl = typeof imageData === 'string' ? imageData : imageData.url || imageData.item;
            if (imageUrl) {
              const response = await fetch(imageUrl);
              const blob = await response.blob();
              imageToUse = new File([blob], 'image.png', { type: blob.type });
            }
          } catch (error) {
            console.error('Failed to process image:', error);
            setIsGeneratingRemix(false);
            return;
          }
        }
      }

      if (!imageToUse) {
        toast.error('No media found to remix');
        setIsGeneratingRemix(false);
        return;
      }

        // Use the existing worker/preview generation logic
      if (worker && setPendingGenerations) {
        const tempId = `remix-${Date.now()}`;

        // Add to pending generations
        setPendingGenerations(prev => new Set(prev).add(tempId));

        // Add to local previews as pending
        if (setLocalPreviews) {
          const now = new Date().toISOString();
          setLocalPreviews(prev => [
            {
              tempId,
              isAgent: true,
              pending: true,
              createdAt: new Date(Date.parse(now) + 1).toISOString(),
              content: {
                text: userInput.trim()
              }
            } as any,
            {
              isAgent: false,
              createdAt: now,
              content: {
                text: userInput.trim()
              }
            },
            ...prev
          ]);
        }

        // Get auth headers for the worker
        const authHeaders = await getAuthHeaders({ isWrite: true });

        let _templateName = remixTemplate.name;
        if (animateImage) {
          // If animate image is true and this is not a story or adventure template, use the video template
          if (!remixTemplate.name.toLowerCase().includes('story') && !remixTemplate.name.toLowerCase().includes('adventure')) {
            _templateName = 'video';
          }
        }

        // Send to worker for processing
        worker.postMessage({
          tempId,
          url: remixTemplate.apiUrl || '',
          authHeaders,
          category: remixTemplate.category,
          templateName: _templateName,
          templateData: {
            prompt: userInput.trim(),
            enableVideo: animateImage,
            aspectRatio: (remixMedia?.templateData as any)?.aspectRatio || '9:16',
            // DON'T include remixMedia.templateData
            // ...(remixMedia?.templateData as any || {}),
          },
          prompt: userInput.trim(),
          image: imageToUse,
          aspectRatio: (remixMedia?.templateData as any)?.aspectRatio || '9:16',
          roomId: roomId || `remix-${remixMedia?.postId || 'default'}`,
          remixPostId: postId,
        });

        setUserInput(''); // Clear the input
        toast.success("Generating remix...");
      } else {
        toast.error("Preview generation not available");
      }

      refetchCredits();

    } catch (error: any) {
      console.error('Error generating remix:', error);

      // Check if the error is due to insufficient credits
      if (error.message === "not enough credits" || error.message?.includes("not enough credits")) {
        setInsufficientCreditsError(true);
      }

      toast.error(error.message || "Failed to generate remix");
    } finally {
      setIsGeneratingRemix(false);
    }
  }, [remixTemplate, userInput, hasEnoughCredits, remixCreditsNeeded, openSwapToGenerateModal,
      refetchCredits, remixMedia, isVideo, frameSelection, isImage, animateImage,
      setCurrentPreview, setUserInput, worker, setPendingGenerations, setLocalPreviews, roomId, post, getAuthHeaders]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isPosting) {
        handlePost(e as any);
      } else if (isRemixing) {
        generateRemix();
      } else {
        handleSubmit(e as any);
      }
    }
  }, [handleSubmit, handlePost, isPosting, isRemixing, generateRemix]);

  useEffect(() => {
    if (userInput && textareaRef.current && document.activeElement !== textareaRef.current) {
      // Only auto-focus on desktop, not on mobile
      if (window.innerWidth >= 768) {
        textareaRef.current.focus();
      }
    } else if (!userInput) {
      setRequireAttachment(false);
    }
  }, [userInput]);

  useEffect(() => {
    if (!userInput) {
      if (isPosting) {
        setDynamicPlaceholder("Write your post content here");
      } else if (isRemixing) {
        setDynamicPlaceholder("Describe how you want to remix this...");
      } else {
        setDynamicPlaceholder(placeholder || DEFAULT_PLACEHOLDER);
      }
    }
  }, [placeholder, isRemixing, isPosting]);

  const validAttachment = useMemo(() => {
    if (requireAttachment) return !!attachment;
    return true;
  }, [requireAttachment, attachment]);

    return (
    <>
        <form
          onSubmit={isPosting ? handlePost : handleSubmit}
          className="mt-auto flex w-full flex-col pb-1 md:mt-0 items-center"
        >
          <div className="flex flex-col w-full">
            <div className="relative flex flex-col w-full px-[10px]">
              <div className="relative">
                {/* Show textarea for posting and remixing */}
                {(isPosting || isRemixing) && (
                  <textarea
                    ref={textareaRef}
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/50 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm p-3 pr-12"
                    placeholder={dynamicPlaceholder}
                    disabled={disabled || isGeneratingRemix}
                  />
                )}

                {/* Action buttons - show Post button when posting, otherwise show appropriate controls */}
                {!isGeneratingPreview && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-2">
                    {/* Post button takes priority when isPosting is true */}
                    {isPosting ? (
                      <Button
                        type="submit"
                        disabled={!/[a-zA-Z]/.test(userInput) || disabled}
                        variant="accentBrand"
                        size="md"
                        className={`${!/[a-zA-Z]/.test(userInput) || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {!isMiniApp ? "Post" : "Cast"}
                      </Button>
                    ) : !isRemixing ? (
                      // Regular chat mode buttons
                      <>
                        {requireAttachment && (
                          <AttachmentButton attachment={attachment} setAttachment={setAttachment} />
                        )}
                        {!requireBonsaiPayment && (
                          <Button
                            type="submit"
                            disabled={!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment}
                            variant="accentBrand"
                            size="md"
                            className={`${!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <SendSvg />
                          </Button>
                        )}
                        {requireBonsaiPayment && requireBonsaiPayment > 0 && (
                          <button
                            type="submit"
                            disabled={!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment || isGeneratingPreview}
                            className={`rounded-[10px] p-2 transition-colors flex flex-row ${/[a-zA-Z]/.test(userInput) && !disabled && validAttachment && !isGeneratingPreview
                              ? 'bg-[#D00A59] text-white hover:bg-opacity-80'
                              : 'cursor-not-allowed bg-[#ffffff] text-zinc-950 opacity-50'
                              }`}
                          >
                            <PaySvg />
                            <span className="ml-2">Pay {requireBonsaiPayment} $BONSAI</span>
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
              <div className='flex flex-row justify-between mt-1'>
                <div className='flex space-x-2 overflow-x-auto mr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800'>
                  {/* Remix controls - only show when remixing and not posting */}
                  {isRemixing && !isPosting && (
                    <>
                      {/* Frame Selection for Videos */}
                      {isVideo && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFrameSelection('start')}
                            className={`px-3 py-1 rounded-lg text-[14px] font-medium transition-colors ${
                              frameSelection === 'start'
                                ? 'bg-white/80 text-black'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            Start Frame
                          </button>
                          <button
                            type="button"
                            onClick={() => setFrameSelection('end')}
                            className={`px-3 py-1 rounded-lg text-[14px] font-medium transition-colors ${
                              frameSelection === 'end'
                                ? 'bg-white/80 text-black'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            End Frame
                          </button>
                        </div>
                      )}

                      {/* Animate Checkbox for Images */}
                      {isImage && (
                        <div className="flex items-center space-x-2 rounded-lg px-3 py-1">
                          <input
                            id="animate-checkbox"
                            type="checkbox"
                            checked={animateImage}
                            onChange={(e) => setAnimateImage(e.target.checked)}
                            className="w-4 h-4 text-brand-highlight bg-gray-900 border-gray-600 rounded"
                            disabled={isGeneratingRemix}
                          />
                          <label htmlFor="animate-checkbox" className="text-[14px] font-medium text-gray-300">
                            Create Video
                          </label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Remix Generate Button - on its own row */}
              {isRemixing && !isPosting && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 py-2">
                  {hasEnoughCredits && !insufficientCreditsError ? (
                    <Button
                      type="button"
                      onClick={generateRemix}
                      disabled={!/[a-zA-Z]/.test(userInput) || isGeneratingRemix}
                      variant="accentBrand"
                      size="md"
                      className={`${!/[a-zA-Z]/.test(userInput) || isGeneratingRemix ? 'opacity-50 cursor-not-allowed' : ''} w-full sm:w-auto sm:min-w-[120px] sm:order-2 order-1`}
                    >
                      <SparkIcon color="#000" height={14} />
                      {isGeneratingRemix ? (
                        <div className="flex items-center gap-2">
                          <Spinner customClasses="h-4 w-4" color="#000000" />
                          <span>Generating...</span>
                        </div>
                      ) : (
                        'Generate'
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => openSwapToGenerateModal({
                        creditsNeeded: remixCreditsNeeded,
                        onSuccess: () => {
                          refetchCredits();
                          setInsufficientCreditsError(false); // Reset error state on success
                          generateRemix();
                        },
                        token: !!remixMedia?.token ? {
                          address: remixMedia?.token.address as `0x${string}`,
                          chain: remixMedia?.token.chain as string,
                          symbol: remixMedia?.token?.metadata?.symbol as string,
                        } : undefined
                      })}
                      variant="accentBrand"
                      size="md"
                      className="w-full sm:w-auto sm:order-2 order-1"
                    >
                      Swap to Generate
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
    </>
  );
}