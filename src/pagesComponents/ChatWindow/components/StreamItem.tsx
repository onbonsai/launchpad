import { DIRECT_CLIENT_URL } from '../config';
import type { StreamEntry } from '../types';
import ExternalSvg from '../svg/ExternalSvg';
import Image from 'next/image';
import type { Preview } from '@src/services/madfi/studio';
import { Button } from "@src/components/Button";
import { markdownToPlainText } from '../utils';

type StreamItemProps = {
  entry: StreamEntry;
  author?: string;
  setUserInput?: (input: string) => void;
  setRequestPayload?: (payload: any) => void;
  preview?: Preview;
  onPostButtonClick?: (preview: Preview) => void;
  isSelected?: boolean;
  onCancel?: () => void;
};

const formatContent = (content: string) => {
  // Regular expression to detect URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Replace URLs with clickable anchor tags
  return content.split(urlRegex).map((part, index) =>
    urlRegex.test(part) ? (
      <a
        key={`${index}-${part}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline"
      >
        {part}
      </a>
    ) : (
      <span key={`${index}-${part}`}>{part}</span>
    ),
  );
};

export default function StreamItem({
  entry,
  author,
  setUserInput,
  setRequestPayload,
  preview,
  onPostButtonClick,
  isSelected,
  onCancel
}: StreamItemProps) {
  const isAgent = entry?.type !== 'user';
  const buttonClasses = 'flex w-full whitespace-nowrap px-[10px] py-1 text-start text-[#ffffff] transition-colors hover:bg-zinc-900 hover:text-[#e5e7eb] lg:w-auto bg-backgroundAccent backdrop-blur-xl rounded-[10px]';

  // Don't render if it's a user message with preview or if it's template data
  if ((!isAgent && preview) || entry?.content.includes('modelId')) {
    return null;
  }

  return (
    <div>
      {entry?.content === "..." ? null : (
        <div
          className={`flex max-w-full items-center space-x-2 text-white text-[16px] leading-tight ${isAgent
            ? ''
            : 'justify-end'}`
          }
        >
          <span className={`max-w-full whitespace-normal break-words ${isAgent ? '' : 'bg-dark-grey px-3 py-[10px] rounded-2xl rounded-br-sm'}`}>
            {' '}
            {formatContent(entry?.content)}
          </span>
        </div>
      )}
      {preview && (
        <div className={`mt-2 border-[1px] ${isSelected ? 'border-brand-highlight' : 'border-dark-grey/50'} rounded-[24px] bg-[rgba(255,255,255,0.08)] relative`}>
          {isSelected && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel?.();
              }}
              className="absolute top-2 right-2 p-1 rounded-full bg-dark-grey/80 hover:bg-dark-grey text-white z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {preview.text && <span className="p-4 block whitespace-pre-wrap">{markdownToPlainText(preview.text)}</span>}
          {preview.video && (
            <div className={`w-full ${isSelected ? 'h-[450px]' : ''}`}>
              <video
                src={preview.video.url}
                controls
                className={`w-full ${isSelected ? `h-full object-cover rounded-b-[24px]` : ''} ${!preview.text ? 'rounded-t-[24px]' : ''}`}
              />
            </div>
          )}
          {preview.image && !preview.video && (
            <div className="w-full">
              <Image
                src={preview.imagePreview || preview.image}
                alt="Preview"
                width={400}
                height={400}
                className={`w-full ${isSelected ? `h-full object-cover rounded-b-[24px]` : ''} ${!preview.text ? 'rounded-t-[24px]' : ''}`}
              />
            </div>
          )}
          <div className="flex justify-end">
            {!isSelected ? (
              <div className="p-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    if (onPostButtonClick && preview) {
                      onPostButtonClick(preview);
                    }
                  }}
                >
                  Use this
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {!!entry?.attachments?.length && (
        <div className="flex grow flex-row gap-2 overflow-x-auto overflow-y-hidden text-xs lg:text-sm mt-3">
          {entry?.attachments.map((attachment, index) => {
            const { button, source } = attachment;

            // handle images generated
            if (source === "imageGeneration") {
              const url = attachment.url!.startsWith('http')
                ? attachment.url!
                : `${DIRECT_CLIENT_URL}/media/generated/${attachment.url!.split('/').pop()}`;
              return (
                <div key={`attachment-${index}`} className="flex-shrink-0" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
                  <Image
                    unoptimized={true}
                    src={url}
                    alt={attachment.title || "Attached image"}
                    className="object-cover cursor-pointer rounded-md"
                    width={250}
                    height={250}
                  />
                </div>
              );
            }

            // handle buttons with external url
            if (button.url) {
              return (
                <button
                  key={`attachment-${index}`}
                  type="button"
                  onClick={() => window.open(button.url, '_blank', 'noopener,noreferrer')}
                  className={buttonClasses}
                >
                  <ExternalSvg />
                  <span className="ml-2">{button.useLabel ? button.label : `${`${button.url.split('https://')[1].substring(0, 24)}...`}`}</span>
                </button>
              );
            }

            // handle buttons with a prompt payload to prefill in textbox
            return (
              <button
                key={`attachment-${index}`}
                type="button"
                onClick={() => {
                  if (setUserInput) setUserInput(button.text!);
                  if (button.payload && setRequestPayload) setRequestPayload(button.payload!);
                }}
                className={buttonClasses}
              >
                {button.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  );
}
