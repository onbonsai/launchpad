import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseEther } from "viem";
import useIsMounted from "@src/hooks/useIsMounted";
import clsx from 'clsx';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';
import useChat from '../hooks/useChat';
import type { AgentMessage, StreamEntry } from '../types';
import { generateUUID, markdownToPlainText } from '../utils';
import ChatInput from './ChatInput';
import StreamItem from './StreamItem';
import { pinFile, storjGatewayURL } from "@src/utils/storj";
import sendTokens from '../helpers/sendTokens';
import { base } from 'viem/chains';
import { BONSAI_TOKEN_BASE } from '../constants';
import { useGetMessages } from '@src/services/madfi/terminal';
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { format } from 'date-fns';

type ChatProps = {
  agentId: string;
  className?: string;
  agentName: string;
  agentWallet: `0x${string}`;
};

export default function Chat({ className, agentId, agentWallet }: ChatProps) {
  const isMounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: messageData, isLoading: isLoadingMessageHistory } = useGetMessages(agentId);
  const { messages: messageHistory, canMessage } = messageData || {};
  const [userInput, setUserInput] = useState('');
  const [attachment, setAttachment] = useState<File | undefined>();
  const [requestPayload, setRequestPayload] = useState<any|undefined>();
  const [isThinking, setIsThinking] = useState(false);
  const [currentAction, setCurrentAction] = useState<string|undefined>();
  const [loadingDots, setLoadingDots] = useState('');
  const [streamEntries, setStreamEntries] = useState<StreamEntry[]>([]);
  const [requireBonsaiPayment, setRequireBonsaiPayment] = useState<number | undefined>();

  const conversationId = useMemo(() => {
    if (isMounted) return generateUUID();
  }, [isMounted]);

  useEffect(() => {
    if (!isThinking) return;

    const dotsInterval = setInterval(() => {
      setLoadingDots((prev) => (prev.length >= 3 ? '' : `${prev}.`));
    }, 500);

    return () => clearInterval(dotsInterval);
  }, [isThinking]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSuccess = useCallback((messages: AgentMessage[]) => {
    // const functions =
    //   messages?.find((msg) => msg.event === 'tools')?.functions || [];

    //   if (functions?.includes('deploy_token')) {
    //   setShouldRefetchTokens(true);
    // }

    let message = messages.find((res) => res.event === 'agent');
    if (!message) {
      message = messages.find((res) => res.event === 'tools');
    }
    if (!message) {
      message = messages.find((res) => res.event === 'error');
    }
    const streamEntry: StreamEntry = {
      timestamp: new Date(),
      content: markdownToPlainText(message?.data || ''),
      type: 'agent',
      attachments: message?.attachments,
    };
    setStreamEntries((prev) => [...prev, streamEntry]);
  }, []);

  const { postChat, isLoading, canMessageAgain } = useChat({
    onSuccess: handleSuccess,
    conversationId,
    agentId,
    userId: address,
    setIsThinking,
    setCurrentAction
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userInput.trim()) {
        return;
      }

      // handle bonsai payment
      let _requestPayload = {};
      if (requireBonsaiPayment && requireBonsaiPayment > 0) {
        let toastId;
        try {
          toastId = toast.loading("Sending tokens...");
          const amount = parseEther(requireBonsaiPayment.toString());
          const hash = await sendTokens(
            walletClient,
            agentWallet,
            amount,
            base,
            BONSAI_TOKEN_BASE
          );
          toast.success("Tokens sent", { id: toastId });
          _requestPayload = { verifyTransfer: {
            hash,
            chainId: base.id,
            amount: amount.toString(),
            to: agentWallet,
            token: BONSAI_TOKEN_BASE
          }};
        } catch (error) {
          console.log(error);
          toast.dismiss(toastId)
          toast.error("Failed to send tokens");
          return;
        }
      }

      // upload to storj and use the url
      let imageURL;
      if (attachment) {
        imageURL = storjGatewayURL(await pinFile(attachment));
        console.log(`imageURL: ${imageURL}`);
      }

      setUserInput('');
      setAttachment(undefined);
      setRequireBonsaiPayment(undefined);

      const userMessage: StreamEntry = {
        timestamp: new Date(),
        type: 'user',
        content: userInput.trim() + (imageURL ? `\n${imageURL}` : ''),
      };

      setStreamEntries((prev) => [...prev, userMessage]);

      postChat(userInput, { ...requestPayload, ..._requestPayload }, imageURL);
    },
    [postChat, userInput, requestPayload, attachment, requireBonsaiPayment, agentWallet, walletClient],
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Dependency is required
  useEffect(() => {
    if (!isLoadingMessageHistory) {
      // scrolls to the bottom of the chat when messages change
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamEntries, isLoadingMessageHistory]);

  return (
    <div
      className={clsx(
        'relative flex h-full w-full flex-col',
        className,
      )}
    >
      <div className="relative flex grow flex-col overflow-y-auto pt-4 pr-4 pl-4">
        {isLoadingMessageHistory ? (
          <div className="flex justify-center my-4">
            <Spinner customClasses="h-6 w-6" color="#5be39d" />
          </div>
        ) : (
          <>
            {messageHistory && messageHistory.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-zinc-500 mb-2 text-center">Last {messageHistory.length} messages</div>
                <div className="space-y-8">
                  {[...messageHistory].reverse().map((message, index) => (
                    <div key={message.id} className="space-y-2">
                      <StreamItem
                        entry={{
                          timestamp: new Date(message.createdAt as number),
                          type: message.content.source === 'bonsai-terminal' ? 'user' : 'agent',
                          content: markdownToPlainText(message.content.text),
                          // attachments: message.content.attachments,
                        }}
                        setUserInput={setUserInput}
                        setRequestPayload={setRequestPayload}
                      />
                      {index === messageHistory.length - 1 && (
                        <div className="text-xs text-zinc-500 text-center">
                          {format(new Date(message.createdAt as number), 'EEEE, MMMM do h:mmaaa')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-8" role="log" aria-live="polite">
              {streamEntries.map((entry, index) => (
                <StreamItem
                  key={`${entry.timestamp.toDateString()}-${index}`}
                  entry={entry}
                  setUserInput={setUserInput}
                  setRequestPayload={setRequestPayload}
                />
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex items-center text-[#ffffff] opacity-70 h-6">
          {isThinking && (
            <span className="max-w-full font-mono">
              {currentAction ? `${currentAction} ${loadingDots}` : loadingDots}
            </span>
          )}
        </div>

        <div className="mt-2" ref={bottomRef} />
      </div>

      <ChatInput
        userInput={userInput}
        handleKeyPress={handleKeyPress}
        handleSubmit={handleSubmit}
        setUserInput={setUserInput}
        disabled={isLoading || !isConnected || !canMessage || !canMessageAgain}
        attachment={attachment}
        setAttachment={setAttachment}
        requireBonsaiPayment={requireBonsaiPayment}
        setRequireBonsaiPayment={setRequireBonsaiPayment}
        showSuggestions={!streamEntries?.length && canMessage && canMessageAgain}
        placeholder={!(canMessageAgain && canMessage) ? "Insufficient credits" : undefined}
      />
    </div>
  );
}