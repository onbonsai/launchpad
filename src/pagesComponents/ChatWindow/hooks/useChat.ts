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
  conversationId: string;
  agentId: string;
  userId?: string;
  setIsThinking: (isThinking: boolean) => void;
  setCurrentAction: (action: string | undefined) => void;
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
  const shouldReconnect = useRef(true);

  const connectSocket = useCallback(() => {
    if (!conversationId || !shouldReconnect.current) return;

    // Initialize socket connection
    socket.current = io(TERMINAL_API_URL, {
      query: {
        roomId: conversationId,
        agentId,
      },
    });

    socket.current.on('connect', () => {
      console.log('Connected to chat socket.io server');
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
  }, [conversationId, onSuccess, agentId, setIsThinking, setCurrentAction]);

  const disconnectSocket = useCallback(() => {
    if (socket.current) {
      socket.current.disconnect();
      socket.current = null;
    }
  }, []);

  useEffect(() => {
    connectSocket();

    // Handle bfcache - disconnect on pagehide, reconnect on pageshow
    const handlePageHide = () => {
      console.log('Page hiding - disconnecting chat socket for bfcache');
      disconnectSocket();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('Page restored from bfcache - reconnecting chat socket');
        connectSocket();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    // Cleanup on unmount or dependency change
    return () => {
      shouldReconnect.current = false;
      disconnectSocket();
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [connectSocket, disconnectSocket]);

  const postChat = useCallback(async (input: string, payload?: any, imageURL?: string) => {
    setIsLoading(true);
    setCanMessageAgain(false);
    setIsThinking(true);

    try {
      await sendMessage({ agentId, input, payload, imageURL, conversationId });
    } catch (error) {
      setIsLoading(false);
      setCanMessageAgain(true);
      setIsThinking(false);
      console.error('Error sending message:', error);
    }

    setTimeout(() => {
      setCanMessageAgain(true);
    }, 1000);
  }, [conversationId, userId, setIsThinking, agentId]);

  return {
    postChat,
    isLoading,
    canMessageAgain,
  };
}
