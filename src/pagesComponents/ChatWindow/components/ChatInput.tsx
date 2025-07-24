import { type ChangeEvent, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import SendSvg from '../svg/SendSvg';
import PaySvg from '../svg/PaySvg';
import ImageAttachment from "../svg/ImageAttachment";
import toast from 'react-hot-toast';
import { PROMOTE_TOKEN_COST } from '../constants';
import { Button } from '@src/components/Button';
import type { SmartMedia, Template, Preview } from '@src/services/madfi/studio';
import { useTopUpModal } from '@src/context/TopUpContext';
import { type StoryboardClip } from "@src/services/madfi/studio";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { useGetCredits } from '@src/hooks/useGetCredits';
import { useAccount } from 'wagmi';
import { useAuth } from '@src/hooks/useAuth';
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";

type PremadeChatInputProps = {
  label: string;
  input: string;
  setUserInput: (input: string) => void;
  disabled?: boolean;
  setRequirement?: () => void;
};

function PremadeChatInput({ label, setUserInput, input, disabled, setRequirement }: PremadeChatInputProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        setUserInput(input);
        if (setRequirement) setRequirement();
      }}
      className={`whitespace-nowrap rounded-lg bg-card-light px-2 py-1 text-start text-white/80 text-[14px] tracking-[-0.02em] leading-5 transition-colors hover:bg-dark-grey/80 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {label}
    </button>
  );
}

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
  storyboardClips?: StoryboardClip[];
  storyboardAudio?: File | string | null;
  storyboardAudioStartTime?: number;
  setStoryboardClips?: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  setStoryboardAudio?: React.Dispatch<React.SetStateAction<File | string | null>>;
  setStoryboardAudioStartTime?: React.Dispatch<React.SetStateAction<number>>;
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
  storyboardClips = [],
  storyboardAudio,
  storyboardAudioStartTime,
  setStoryboardClips,
  setStoryboardAudio,
  setStoryboardAudioStartTime,
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
  const remixCreditsNeeded = animateImage ? (remixTemplate?.estimatedCost || 10) + 50 : (remixTemplate?.estimatedCost || 10);
  const hasEnoughCredits = (creditBalance?.creditsRemaining || 0) >= remixCreditsNeeded;

  useEffect(() => {
    if (textareaRef.current && !isGeneratingPreview) {
      textareaRef.current.focus();
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
      });
      return;
    }

    setIsGeneratingRemix(true);

    try {
      const authHeaders = await getAuthHeaders({ isWrite: true });
      
      // Call the new remix endpoint
      const response = await fetch('/api/media/remix', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: remixMedia?.postId,
          prompt: userInput.trim(),
          frameSelection: isVideo ? frameSelection : undefined,
          animateImage: isImage ? animateImage : false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate remix');
      }

      const result = await response.json();
      
      // Set the preview in the parent component
      if (result.preview && setCurrentPreview) {
        setCurrentPreview(result.preview);
        setUserInput(''); // Clear the input
        toast.success("Remix generated! Click 'Use this' to create your post.");
      }

      refetchCredits();
       
    } catch (error: any) {
      console.error('Error generating remix:', error);
      toast.error(error.message || "Failed to generate remix");
    } finally {
      setIsGeneratingRemix(false);
    }
  }, [remixTemplate, userInput, hasEnoughCredits, remixCreditsNeeded, openSwapToGenerateModal, 
      refetchCredits, getAuthHeaders, remixMedia, isVideo, frameSelection, isImage, animateImage, 
      setCurrentPreview, setUserInput]);

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
      textareaRef.current.focus();
    } else if (!userInput) {
      setRequireAttachment(false);
    }
  }, [userInput]);

  useEffect(() => {
    if (!userInput) {
      if (isRemixing) {
        setDynamicPlaceholder("Describe how you want to remix this...");
      } else {
        setDynamicPlaceholder(placeholder || DEFAULT_PLACEHOLDER);
      }
    }
  }, [placeholder, isRemixing]);

  const validAttachment = useMemo(() => {
    if (requireAttachment) return !!attachment;
    return true;
  }, [requireAttachment, attachment]);

    return (
    <>
        <form
          onSubmit={isPosting ? handlePost : handleSubmit}
          className="mt-auto flex w-full flex-col pb-4 md:mt-0 items-center"
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
                
                {/* TODO: remove the isGeneratingPReview check once we show the other options */}
                {!isGeneratingPreview && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-2">
                    {requireAttachment && (
                      <AttachmentButton attachment={attachment} setAttachment={setAttachment} />
                    )}
                    {!requireBonsaiPayment && (
                      <>
                        {isRemixing ? (
                          hasEnoughCredits ? (
                            <Button
                              type="button"
                              onClick={generateRemix}
                              disabled={!/[a-zA-Z]/.test(userInput) || isGeneratingRemix}
                              variant="accentBrand"
                              size="xs"
                              className={`${!/[a-zA-Z]/.test(userInput) || isGeneratingRemix ? 'opacity-50 cursor-not-allowed' : ''} min-w-[120px]`}
                            >
                              {isGeneratingRemix ? (
                                <div className="flex items-center gap-2">
                                  <Spinner customClasses="h-4 w-4" color="#000000" />
                                  <span>Generating...</span>
                                </div>
                              ) : (
                                `Generate (${remixCreditsNeeded})`
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => openSwapToGenerateModal({
                                creditsNeeded: remixCreditsNeeded,
                                onSuccess: () => {
                                  refetchCredits();
                                  generateRemix();
                                },
                              })}
                              variant="accentBrand"
                              size="xs"
                            >
                              Swap to Generate
                            </Button>
                          )
                        ) : (
                          <Button
                            type="submit"
                            disabled={!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment}
                            variant="accentBrand"
                            size="xs"
                            className={`${!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isPosting ? (!isMiniApp ? "Post" : "Cast") : <SendSvg />}
                          </Button>
                        )}
                      </>
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
                  </div>
                )}
              </div>
              <div className='flex flex-row justify-between mt-2'>
                <div className='flex space-x-2 overflow-x-auto mr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800'>
                  {/* Remix controls */}
                  {isRemixing && (
                    <>
                      {/* Frame Selection for Videos */}
                      {isVideo && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFrameSelection('start')}
                            className={`px-3 py-1 rounded-lg text-[14px] font-medium transition-colors ${
                              frameSelection === 'start'
                                ? 'bg-brand-highlight text-black'
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
                                ? 'bg-brand-highlight text-black'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            End Frame
                          </button>
                        </div>
                      )}

                      {/* Animate Checkbox for Images */}
                      {isImage && (
                        <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-1">
                          <input
                            id="animate-checkbox"
                            type="checkbox"
                            checked={animateImage}
                            onChange={(e) => setAnimateImage(e.target.checked)}
                            className="w-4 h-4 text-brand-highlight bg-gray-900 border-gray-600 rounded focus:ring-brand-highlight focus:ring-2"
                            disabled={isGeneratingRemix}
                          />
                          <label htmlFor="animate-checkbox" className="text-[14px] font-medium text-gray-300">
                            Animate ({animateImage ? '+50 credits' : 'video'})
                          </label>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Regular suggestions when not remixing */}
                  {!userInput && showSuggestions && !isPosting && !isGeneratingPreview && !isRemixing && (
                    <>
                      {/* {!isMiniApp && (
                        <>
                          <PremadeChatInput
                            setUserInput={disabled ? () => { } : setUserInput}
                            label="About"
                            input="What is this post about?"
                            disabled={disabled}
                          />
                          <PremadeChatInput
                            setUserInput={disabled ? () => { } : setUserInput}
                            label="Commentary"
                            input="What is the sentiment in the comments?"
                            disabled={disabled}
                          />
                          <PremadeChatInput
                            setUserInput={disabled ? () => { } : setUserInput}
                            label="Author"
                            input="Who made this post?"
                            disabled={disabled}
                          />
                        </>
                      )} */}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
    </>
  );
}