import { type ChangeEvent, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import SendSvg from '../svg/SendSvg';
import PaySvg from '../svg/PaySvg';
import ImageAttachment from "../svg/ImageAttachment";
import toast from 'react-hot-toast';
import { PROMOTE_TOKEN_COST } from '../constants';
import { Button } from '@src/components/Button';
import { TemplateSuggestions } from './TemplateSuggestions';
import type { SmartMedia, Template } from '@src/services/madfi/studio';
import RemixForm from './RemixForm';

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
        e.preventDefault(); // Prevent form submission
        setUserInput(input);
        if (setRequirement) setRequirement();
      }}
      className={`whitespace-nowrap rounded-lg bg-card-light px-3 py-2 text-start text-white/80 text-[14px] tracking-[-0.02em] leading-5 transition-colors hover:bg-dark-grey/80 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
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
  handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  attachment?: File;
  setAttachment: (file?: File) => void;
  requireBonsaiPayment?: number;
  setRequireBonsaiPayment: (amount?: number) => void;
  showSuggestions?: boolean;
  placeholder?: string;
  templates?: Template[];
  remixMedia?: SmartMedia;
};

const DEFAULT_PLACEHOLDER = "Ask anything";

export default function ChatInput({
  handleSubmit,
  userInput,
  setUserInput,
  handleKeyPress,
  disabled = false,
  attachment,
  setAttachment,
  requireBonsaiPayment,
  setRequireBonsaiPayment,
  showSuggestions,
  placeholder,
  templates,
  remixMedia,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLInputElement>(null);
  const [requireAttachment, setRequireAttachment] = useState(false);
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState(placeholder || DEFAULT_PLACEHOLDER);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);
  const [showRemixForm, setShowRemixForm] = useState(false);
  const remixTemplate = remixMedia ? templates?.find((t) => t.name === remixMedia?.template) : undefined;

  const handleTemplateSelect = useCallback((selection: { name: string; inputText: string; description?: string }) => {
    setUserInput(selection.inputText);
    setDynamicPlaceholder(selection.description || placeholder || DEFAULT_PLACEHOLDER);
    setSelectedTemplateName(selection.name);
    textareaRef.current?.focus();
  }, [setUserInput, placeholder]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
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
    <form
      onSubmit={handleSubmit}
      className="mt-auto flex w-full flex-col pb-4 md:mt-0 items-center"
    >
      {showRemixForm && remixMedia && (
        <RemixForm
          template={remixTemplate}
          remixMedia={remixMedia}
          onClose={() => setShowRemixForm(false)}
        />
      )}

      {/* {!showRemixForm && templates && templates.length > 0 && (
        <div className="w-full px-[10px] mb-2">
          <div className="border border-dark-grey/50 rounded-lg">
            <TemplateSuggestions
              templates={templates}
              onTemplateSelect={handleTemplateSelect}
              disabled={disabled}
              selectedTemplateName={selectedTemplateName}
            />
          </div>
        </div>
      )} */}

      <div className="flex flex-col w-full">
        <div className="relative flex flex-col w-full px-[10px]">
          <div className="relative">
            <input
              ref={textareaRef}
              type="text"
              value={userInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className="w-full bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/50 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm p-3 pr-12"
              placeholder={dynamicPlaceholder}
              disabled={disabled}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-2">
              {requireAttachment && (
                <AttachmentButton attachment={attachment} setAttachment={setAttachment} />
              )}
              {!requireBonsaiPayment && (
                <Button
                  type="submit"
                  disabled={!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment}
                  variant="accentBrand"
                  size="xs"
                  className={`${!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <SendSvg />
                </Button>
              )}
              {requireBonsaiPayment && requireBonsaiPayment > 0 && (
                <button
                  type="submit"
                  disabled={!/[a-zA-Z]/.test(userInput) || disabled || !validAttachment}
                  className={`rounded-[10px] p-2 transition-colors flex flex-row ${/[a-zA-Z]/.test(userInput) && !disabled && validAttachment
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
          <div className='flex flex-row justify-between mt-2'>
            <div className='flex space-x-1 overflow-x-auto mr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800'>
              {!userInput && showSuggestions && (
                <>
                  {remixMedia && remixTemplate && (
                    <button
                      type="button"
                      onClick={() => setShowRemixForm(true)}
                      className="whitespace-nowrap rounded-lg bg-card-light px-3 py-2 text-start text-white/80 text-[14px] tracking-[-0.02em] leading-5 transition-colors hover:bg-dark-grey/80"
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
  );
}