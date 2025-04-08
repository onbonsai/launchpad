import { type ChangeEvent, useCallback, useRef, useEffect, useState, useMemo } from 'react';
import SendSvg from '../svg/SendSvg';
import PaySvg from '../svg/PaySvg';
import ImageAttachment from "../svg/ImageAttachment";
import toast from 'react-hot-toast';
import { PROMOTE_TOKEN_COST } from '../constants';
import { Button } from '@src/components/Button';

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
      className={`whitespace-nowrap rounded-[10px] bg-backgroundAccent px-[10px] py-1 text-start text-[#ffffff] text-[16px] leading-tight transition-colors hover:bg-zinc-900 hover:text-[#e5e7eb] ${disabled ? 'cursor-not-allowed bg-[#ffffff] opacity-50' : ''}`}
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
          className="flex justify-between items-center rounded-[10px] p-2 transition-colors bg-[#D00A59] text-white hover:bg-opacity-80"
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
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  chatEnabled: boolean;
  attachment?: File;
  setAttachment: (file?: File) => void;
  requireBonsaiPayment?: number;
  setRequireBonsaiPayment: (amount?: number) => void;
};

export default function ChatInput({
  handleSubmit,
  userInput,
  setUserInput,
  handleKeyPress,
  disabled = false,
  chatEnabled = true,
  attachment,
  setAttachment,
  requireBonsaiPayment,
  setRequireBonsaiPayment,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [requireAttachment, setRequireAttachment] = useState(false);
  // const [requireURLValidation, setRequireURLValidation] = useState<RegExp | undefined>();

  const handleInputChange = useCallback(
    // TODO: sanitize
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setUserInput(e.target.value);
      if (!e.target.value) {
        setRequireAttachment(false);
        setRequireBonsaiPayment(undefined);
      }
      if (e.target.value.toLowerCase().startsWith("create a token") && !requireAttachment) {
        setRequireAttachment(true);
      }
      if (e.target.value.toLowerCase().startsWith("promote my launchpad token") && !requireBonsaiPayment) {
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

  const validAttachment = useMemo(() => {
    if (requireAttachment) return !!attachment;

    return true;
  }, [requireAttachment, attachment]);

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-auto flex w-full flex-col pb-4 md:mt-0 items-center"
    >
      <div className="flex flex-col w-full">
        <div className="relative flex flex-col w-full">
          <div className="relative flex flex-col w-full px-[10px]">
            <div className="relative">
              <input
                ref={textareaRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="w-full bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm p-3 pr-12"
                placeholder={"What's on your mind?"}
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
          </div>
        </div>
      </div>
    </form>
  );
}