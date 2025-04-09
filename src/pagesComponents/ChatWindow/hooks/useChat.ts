import { useCallback, useState, useRef, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { TERMINAL_API_URL, sendMessage } from '@src/services/madfi/terminal';
import { AgentMessage } from '../types';

type UseChatResponse = {
  messages?: AgentMessage[];
  error?: Error;
  postChat: (input: string, payload?: any, imageURL?: string) => void;
  isLoading: boolean;
  canMessageAgain: boolean;
};

type UseChatProps = {
  onSuccess: (messages: AgentMessage[]) => void;
  setIsThinking: (v: boolean) => void;
  setCurrentAction: (s?: string) => void;
  conversationId?: string;
  agentId: string;
  userId?: string;
};

const ACTION_TO_EVENT = {
  "NONE": "agent",
  "CREATE_POST": "agent",
};

export default function useChat({
  onSuccess,
  conversationId,
  agentId,
  userId,
  setIsThinking,
  setCurrentAction,
}: UseChatProps): UseChatResponse {
  const [isLoading, setIsLoading] = useState(false);
  const [canMessageAgain, setCanMessageAgain] = useState(true);
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Initialize socket connection
    socket.current = io(TERMINAL_API_URL, {
      query: {
        roomId: conversationId,
        agentId,
      },
    });

    socket.current.on('connect', () => {
      console.log('Connected to socket.io server');
    });

    socket.current.on('response', (message) => {
      // Handle incoming messages
      console.log('Received message:', message);
      const data = JSON.parse(message);
      const parsedMessages = [{ data: data.text, event: ACTION_TO_EVENT[data.action], attachments: data.attachments }];

      if (data.action === "NONE") {
        setIsThinking(false);
        setIsLoading(false);
        setCurrentAction(undefined);
      } else {
        setCurrentAction(data.action);
      }

      onSuccess(parsedMessages);
    });

    // Cleanup on unmount or dependency change
    return () => {
      socket.current?.disconnect();
    };
  }, [conversationId, onSuccess, agentId, setIsThinking, setCurrentAction]);

  const postChat = useCallback(
    async (input: string, payload?: any, imageURL?: string) => {
      setIsLoading(true);
      setIsThinking(true);

      try {
        const { messages, canMessageAgain: _canMessageAgain } = await sendMessage({ agentId, input, payload, imageURL }) || {};
        if (!messages?.length) throw new Error("no response");
        const { action, text, attachments } = messages[0];
        setCanMessageAgain(!!_canMessageAgain);

        if (action === "NONE" || action === "CONTINUE") {
          setIsThinking(false);
          setIsLoading(false);
          setCurrentAction(undefined);
        } else {
          setCurrentAction(action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()));
        }

        // TODO: handle more types of messages
        const parsedMessages = [{ data: text, event: ACTION_TO_EVENT[action] || "agent", attachments }];
        onSuccess(parsedMessages);
        return { messages: parsedMessages, error: null };
      } catch (error) {
        console.error('Error posting chat:', error);
        return { messages: [], error: error as Error };
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, onSuccess, agentId, userId, setIsThinking, setCurrentAction],
  );

  return { postChat, isLoading, canMessageAgain };
}
