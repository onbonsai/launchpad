import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseEther } from "viem";
import useIsMounted from "@src/hooks/useIsMounted";
import clsx from 'clsx';
import { useAccount, useWalletClient } from 'wagmi';
import toast from 'react-hot-toast';
import useChat from '../hooks/useChat';
import type { AgentMessage, StreamEntry } from '../types';
import { generateSeededUUID, generateUUID, markdownToPlainText } from '../utils';
import ChatInput from './ChatInput';
import StreamItem from './StreamItem';
import { pinFile, storjGatewayURL } from "@src/utils/storj";
import sendTokens from '../helpers/sendTokens';
import { base } from 'viem/chains';
import { BONSAI_TOKEN_BASE } from '../constants';
import { useGetMessages } from '@src/services/madfi/terminal';
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { format } from 'date-fns';
import useRegisteredTemplates from '@src/hooks/useRegisteredTemplates';
import { Preview, SmartMedia } from '@src/services/madfi/studio';
import { useAuthenticatedLensProfile } from '@src/hooks/useLensProfile';
import { useRouter } from 'next/router';
import { BigDecimal, blockchainData, Post, SessionClient } from '@lens-protocol/client';
import { createSmartMedia } from '@src/services/madfi/studio';
import { createPost, uploadImageBase64, uploadVideo, Action } from "@src/services/lens/createPost";
import { resumeSession } from '@src/hooks/useLensLogin';
import { EvmAddress, toEvmAddress } from "@lens-protocol/metadata";
import { PROTOCOL_DEPLOYMENT } from '@src/services/madfi/utils';
import axios from 'axios';
import { encodeAbi } from '@src/utils/viem';

type ChatProps = {
  agentId: string;
  className?: string;
  agentName: string;
  agentWallet: `0x${string}`;
  media?: SmartMedia;
  conversationId?: string;
  post: Post;
  remixVersionQuery?: string;
  isRemixing?: boolean;
};

export default function Chat({ className, agentId, agentWallet, media, conversationId, post, remixVersionQuery, isRemixing }: ChatProps) {
  const isMounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: messageData, isLoading: isLoadingMessageHistory, error } = useGetMessages(agentId, conversationId);
  const { data: registeredTemplates } = useRegisteredTemplates();
  const { messages: messageHistory, canMessage } = messageData || {};
  const [userInput, setUserInput] = useState('');
  const [attachment, setAttachment] = useState<File | undefined>();
  const [requestPayload, setRequestPayload] = useState<any|undefined>();
  const [isThinking, setIsThinking] = useState(false);
  const [currentAction, setCurrentAction] = useState<string|undefined>();
  const [loadingDots, setLoadingDots] = useState('');
  const [streamEntries, setStreamEntries] = useState<StreamEntry[]>([]);
  const [requireBonsaiPayment, setRequireBonsaiPayment] = useState<number | undefined>();
  const [currentPreview, setCurrentPreview] = useState<Preview | undefined>();
  const [localPreviews, setLocalPreviews] = useState<Array<{
    isAgent: boolean;
    createdAt: string;
    content: {
      preview?: Preview;
      templateData?: string;
    };
  }>>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [postingPreview, setPostingPreview] = useState<Preview | undefined>();
  const router = useRouter();

  const handlePostButtonClick = useCallback((preview: Preview) => {
    console.log('handlePostButtonClick called with preview:', preview);
    setPostingPreview(preview);
    setIsPosting(true);
    if (preview.text) {
      setUserInput(preview.text);
    }
  }, [setUserInput]);

  const handleCancelPost = useCallback(() => {
    setIsPosting(false);
    setPostingPreview(undefined);
  }, []);

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

      // Scroll to bottom after sending message
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    [postChat, userInput, requestPayload, attachment, requireBonsaiPayment, agentWallet, walletClient],
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isPosting && postingPreview) {
          handlePost(userInput);
        } else {
          handleSubmit(e);
        }
      }
    },
    [handleSubmit, isPosting, postingPreview, userInput],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Dependency is required
  useEffect(() => {
    if (!isLoadingMessageHistory) {
      // scrolls to the bottom of the chat when messages change
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [streamEntries, isLoadingMessageHistory, messageHistory]);

  // Add a new useEffect to handle initial scroll
  useEffect(() => {
    if (!isLoadingMessageHistory && messageHistory) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isLoadingMessageHistory, messageHistory]);

  const checkReferralStatus = async (address: string) => {
    try {
      const response = await axios.get(`/api/referrals/status?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('Error checking referral status:', error);
      return null;
    }
  };

  const handlePost = useCallback(async (text: string) => {
    if (!postingPreview) return;

    let toastId;
    try {
      const sessionClient = await resumeSession(true);
      let idToken;
      if (!sessionClient && !authenticatedProfile) {
        toast.error("Not authenticated");
        return;
      } else {
        const creds = await (sessionClient as SessionClient).getCredentials();
        if (creds.isOk()) {
          idToken = creds.value?.idToken;
        } else {
          toast.error("Failed to get credentials");
          return;
        }
      }

      let image;
      let video;

      toastId = toast.loading("Creating your post...", { id: toastId });

      const template = media ? registeredTemplates?.find((t) => t.name === media?.template) : undefined;
      if (!template) throw new Error("template not found")

      if (postingPreview.video && !postingPreview.video.url?.startsWith("https://")) {
        const { uri: videoUri, type } = await uploadVideo(postingPreview.video.blob, postingPreview.video.mimeType);
        video = { url: videoUri, type };
      } else if (postingPreview.video) {
        const url = typeof postingPreview.video === "string" ? postingPreview.video : postingPreview.video?.url;
        video = { url, type: "video/mp4" };
      }

      if (postingPreview.image && postingPreview.image.startsWith("https://")) {
        image = { url: postingPreview.image, type: "image/png" };
      } else if (postingPreview.image) {
        const { uri: imageUri, type } = await uploadImageBase64(postingPreview.image);
        image = { url: imageUri, type };
      }

      // Check if user was referred
      const referralStatus = await checkReferralStatus(address as string);

      // Prepare collect settings
      let recipients: { address: EvmAddress; percent: number }[] = [];
      if (referralStatus?.hasReferrer && !referralStatus?.firstPostUsed) {
        // Split 80% between creator and referrer (40% each)
        recipients = [
          {
            address: toEvmAddress(address as string),
            percent: 40
          },
          {
            address: toEvmAddress(referralStatus.referrer),
            percent: 40
          },
          {
            address: toEvmAddress(template.protocolFeeRecipient),
            percent: 20,
          }
        ];
      } else {
        // Default split: 80% creator, 20% protocol
        recipients = [
          {
            address: toEvmAddress(address as string),
            percent: 80
          },
          {
            address: toEvmAddress(template.protocolFeeRecipient),
            percent: 20,
          }
        ];
      }

      const { payToCollect } = post?.actions?.find(action => action.__typename === "SimpleCollectAction") || {};

      let collectValue;
      if (payToCollect && payToCollect.amount?.asset.contract.address === PROTOCOL_DEPLOYMENT.lens.Bonsai) {
        collectValue = payToCollect.amount?.value;
      }
      let actions: Action[] = []
      if (!!collectValue) {
        actions.push({
          simpleCollect: {
            payToCollect: {
              amount: {
                currency: toEvmAddress(PROTOCOL_DEPLOYMENT.lens.Bonsai),
                value: collectValue as BigDecimal
              },
              recipients,
              referralShare: 5,
            }
          }
        });
      }
      if (media?.token?.address && media?.token?.chain === "lens") {
        actions.push({
          unknown: {
            address: toEvmAddress(PROTOCOL_DEPLOYMENT.lens.RewardSwap),
            params: [{
              raw: {
                // keccak256("lens.param.token")
                key: blockchainData("0xee737c77be2981e91c179485406e6d793521b20aca5e2137b6c497949a74bc94"),
                data: blockchainData(encodeAbi(['address'], [media?.token.address]))
              }
            }],
          }
        })
      }

      const result = await createPost(
        sessionClient as SessionClient,
        walletClient,
        {
          text,
          image,
          video,
          template,
          tokenAddress: media?.token?.address, // TODO: include chain info
          remix: media?.postId ? {
            postId: media.postId,
            version: remixVersionQuery ? parseInt(remixVersionQuery as string) : media.versions?.length ?? 0
          } : undefined,
          actions
        }
      );

      if (!result?.postId) throw new Error("No result from createPost");

      toastId = toast.loading("Finalizing...", { id: toastId });
      const smartMediaResult = await createSmartMedia(
        template.apiUrl,
        idToken,
        JSON.stringify({
          roomId: conversationId,
          agentId: postingPreview.agentId,
          postId: result.postId,
          uri: result.uri,
          token: media?.token,
          params: {
            templateName: template.name,
            category: template.category,
            templateData: postingPreview.templateData,
          },
        })
      );

      if (!smartMediaResult) throw new Error(`failed to send request to ${template.apiUrl}/post/create`);

      toast.success("Done! Going to post...", { duration: 5000, id: toastId });
      setTimeout(() => router.push(`/post/${result.postId}`), 2000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create post");
    } finally {
      setIsPosting(false);
      setPostingPreview(undefined);
      setUserInput('');

      // Scroll to bottom after post creation
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [postingPreview, authenticatedProfile, walletClient, conversationId]);

  return (
    <div className={clsx("relative flex h-full w-full flex-col", className)}>
      <div className="relative flex grow flex-col overflow-y-auto pr-2 pl-2 pb-2 overscroll-contain">
        {isLoadingMessageHistory ? (
          <div className="flex justify-center my-6">
            <Spinner customClasses="h-6 w-6" color="#5be39d" />
          </div>
        ) : (
          <>
            {!isPosting && (
              // Normal chat view
              <>
                {messageHistory && messageHistory.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-zinc-500 mb-2 text-center">Last {messageHistory.length} messages</div>
                    <div className="space-y-8">
                      {[...messageHistory].reverse().map((message, index) => (
                        <div key={message.id} className="space-y-2">
                          {message.content.preview ? (
                            <StreamItem
                              entry={{
                                timestamp: new Date(message.createdAt as number),
                                type: message.content.source === "bonsai-terminal" ? "user" : "agent",
                                content: "",
                              }}
                              setUserInput={setUserInput}
                              setRequestPayload={setRequestPayload}
                              preview={{
                                ...(message.content.preview as Preview),
                                text: message.content.text,
                              }}
                              onPostButtonClick={(preview) => handlePostButtonClick(preview)}
                            />
                          ) : (
                            <StreamItem
                              entry={{
                                timestamp: new Date(message.createdAt as number),
                                type: message.content.source === "bonsai-terminal" ? "user" : "agent",
                                content: markdownToPlainText(message.content.text),
                              }}
                              setUserInput={setUserInput}
                              setRequestPayload={setRequestPayload}
                            />
                          )}
                          {index === messageHistory.length - 1 && (
                            <div className="text-xs text-zinc-500 text-center">
                              {format(new Date(message.createdAt as number), "EEEE, MMMM do h:mmaaa")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-8 flex-grow" role="log" aria-live="polite">
                  {[
                    ...streamEntries,
                    ...localPreviews.map((preview) => ({
                      timestamp: new Date(preview.createdAt),
                      type: (preview.isAgent ? "agent" : "user") as StreamEntry["type"],
                      content: "",
                      preview: preview.content.preview,
                    } as StreamEntry)),
                  ]
                    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                    .map((entry, index, array) => {
                      // Skip if this is an agent message that's immediately followed by a preview
                      const nextEntry = array[index + 1];
                      if (entry.type === "agent" && nextEntry?.preview) {
                        return null;
                      }

                      return (
                        <StreamItem
                          key={`${entry.timestamp.toDateString()}-${index}`}
                          entry={entry}
                          setUserInput={setUserInput}
                          setRequestPayload={setRequestPayload}
                          preview={entry.preview}
                          onPostButtonClick={entry.preview ? (preview) => handlePostButtonClick(preview) : undefined}
                        />
                      );
                    })}
                  <div
                    className={`mt-4 flex items-center text-[#ffffff] opacity-70 ${
                      !isPosting ? "flex-grow min-h-6" : "h-6"
                    }`}
                  >
                    {isThinking && (
                      <span className="max-w-full font-mono">
                        {currentAction ? `${currentAction} ${loadingDots}` : loadingDots}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div ref={bottomRef} />
      </div>

      {isPosting && postingPreview && (
        <div className="px-2 mb-4">
          <StreamItem
            entry={{
              timestamp: new Date(),
              type: "agent",
              content: "",
            }}
            preview={postingPreview}
            isSelected={true}
            onCancel={handleCancelPost}
          />
        </div>
      )}

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
        showSuggestions={canMessage && canMessageAgain}
        placeholder={
          isPosting
            ? "Write your post content here"
            : !(canMessageAgain && canMessage)
            ? "Insufficient credits"
            : undefined
        }
        templates={registeredTemplates}
        remixMedia={media}
        roomId={conversationId}
        currentPreview={currentPreview}
        setCurrentPreview={setCurrentPreview}
        localPreviews={localPreviews}
        setLocalPreviews={setLocalPreviews}
        isPosting={isPosting}
        onPost={handlePost}
        isRemixing={isRemixing}
      />
    </div>
  );
}