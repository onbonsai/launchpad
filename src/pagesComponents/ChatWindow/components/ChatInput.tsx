import { type ChangeEvent, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import SendSvg from '../svg/SendSvg';
import PaySvg from '../svg/PaySvg';
import ImageAttachment from "../svg/ImageAttachment";
import toast from 'react-hot-toast';
import { PROMOTE_TOKEN_COST } from '../constants';
import { Button } from '@src/components/Button';
import type { SmartMedia, Template, Preview } from '@src/services/madfi/studio';
import RemixForm from './RemixForm';
import { useTopUpModal } from '@src/context/TopUpContext';
import { type StoryboardClip } from "@src/services/madfi/studio";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [requireAttachment, setRequireAttachment] = useState(false);
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState(placeholder || DEFAULT_PLACEHOLDER);
  const [showRemixForm, setShowRemixForm] = useState(isRemixing);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

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

  useEffect(() => {
    if (textareaRef.current && !showRemixForm && !isGeneratingPreview) {
      textareaRef.current.focus();
    }
  }, [showRemixForm, isGeneratingPreview]);

  useEffect(() => {
    if (isRemixing && remixMedia) {
      setShowRemixForm(true);
    }
  }, [isRemixing, remixMedia]);

  useEffect(() => {
    if (imageToExtend) {
      setShowRemixForm(true);
    }
  }, [imageToExtend]);

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

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isPosting) {
        handlePost(e as any);
      } else {
        handleSubmit(e as any);
      }
    }
  }, [handleSubmit, handlePost, isPosting]);

  useEffect(() => {
    if (userInput && textareaRef.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    } else if (!userInput) {
      setRequireAttachment(false);
    }
  }, [userInput]);

  useEffect(() => {
    if (!userInput) {
      setDynamicPlaceholder(placeholder || DEFAULT_PLACEHOLDER);
    }
  }, [placeholder]);

  const validAttachment = useMemo(() => {
    if (requireAttachment) return !!attachment;
    return true;
  }, [requireAttachment, attachment]);

  return (
    <>
      {showRemixForm && remixMedia && (
        <RemixForm
          template={remixTemplate as Template}
          remixMedia={remixMedia}
          onClose={() => {
            setShowRemixForm(false);
            if (setImageToExtend) {
              setImageToExtend(null);
            }
          }}
          currentPreview={currentPreview}
          setCurrentPreview={setCurrentPreview}
          roomId={roomId}
          localPreviews={localPreviews}
          setLocalPreviews={setLocalPreviews}
          isGeneratingPreview={isGeneratingPreview}
          setIsGeneratingPreview={setIsGeneratingPreview}
          worker={worker}
          pendingGenerations={pendingGenerations}
          setPendingGenerations={setPendingGenerations}
          postId={postId}
          storyboardClips={storyboardClips}
          storyboardAudio={storyboardAudio}
          storyboardAudioStartTime={storyboardAudioStartTime}
          setStoryboardClips={setStoryboardClips}
          setStoryboardAudio={setStoryboardAudio}
          setStoryboardAudioStartTime={setStoryboardAudioStartTime}
          extendedImage={imageToExtend}
        />
      )}
      <form
        onSubmit={isPosting ? handlePost : handleSubmit}
        className="mt-auto flex w-full flex-col pb-4 md:mt-0 items-center"
      >
        <div className="flex flex-col w-full">
          <div className="relative flex flex-col w-full px-[10px]">
            {!showRemixForm && (
              <div className="relative">
                {disabled && placeholder === "Insufficient credits" ?
                  <Button variant="accentBrand" size="sm" className='mb-2' onClick={() => openSwapToGenerateModal({
                    creditsNeeded: 10,
                    onSuccess: () => null,
                  })}>
                    Swap to continue
                  </Button> :
                  <textarea
                    ref={textareaRef}
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/50 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm p-3 pr-12"
                    placeholder={dynamicPlaceholder}
                    disabled={disabled}
                  />
                }
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-2">
                  {requireAttachment && (
                    <AttachmentButton attachment={attachment} setAttachment={setAttachment} />
                  )}
                  {!requireBonsaiPayment && (
                    <Button
                      type="submit"
                      disabled={!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment || isGeneratingPreview}
                      variant="accentBrand"
                      size="xs"
                      className={`${!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment || isGeneratingPreview ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isPosting ? "Post" : <SendSvg />}
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
                </div>
              </div>
            )}
            <div className='flex flex-row justify-between mt-2'>
              <div className='flex space-x-2 overflow-x-auto mr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800'>
                {!userInput && showSuggestions && !showRemixForm && !isPosting && (
                  <>
                    {remixMedia && remixTemplate && (
                      <button
                        type="button"
                        onClick={() => setShowRemixForm(true)}
                        className="whitespace-nowrap rounded-lg bg-brand-highlight px-2 py-1 text-start text-black/80 text-[14px] tracking-[-0.02em] leading-5"
                      >
                        Remix this post
                      </button>
                    )}
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
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}