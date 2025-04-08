import { DIRECT_CLIENT_URL } from '../config';
import type { StreamEntry } from '../types';
import ExternalSvg from '../svg/ExternalSvg';
import Image from 'next/image';

type StreamItemProps = {
  entry: StreamEntry;
  author?: string;
  setUserInput?: (input: string) => void;
  setRequestPayload?: (payload: any) => void;
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

export default function StreamItem({ entry, setUserInput, setRequestPayload }: StreamItemProps) {
  const isAgent = entry?.type !== 'user';
  const buttonClasses = 'flex w-full whitespace-nowrap px-[10px] py-1 text-start text-[#ffffff] transition-colors hover:bg-zinc-900 hover:text-[#e5e7eb] lg:w-auto bg-backgroundAccent backdrop-blur-xl rounded-[10px]';

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
