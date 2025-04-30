import { useEffect, useState, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { TERMINAL_API_URL } from '@src/services/madfi/terminal';
import { Account } from '@lens-protocol/client';

type ConnectedUser = {
  handle: string;
  image: string;
  score: number;
};

type UsePostPresenceProps = {
  postId: string;
  account?: Account | null;
  connect?: boolean;
};

type UsePostPresenceResponse = {
  connectedAccounts: ConnectedUser[];
  isConnected: boolean;
};

export default function usePostPresence({
  postId,
  account,
  connect = true,
}: UsePostPresenceProps): UsePostPresenceResponse {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    if (!postId || !connect || !account?.address) return;

    socket.current = io(TERMINAL_API_URL, {
      query: {
        roomId: postId,
        isPost: true,
        handle: account.username?.localName,
        score: account.score,
        image: account.metadata?.picture ? account.metadata?.picture : "",
      },
    });

    socket.current.on('connect', () => {
      console.log('Connected to presence socket');
      setIsConnected(true);
    });

    socket.current.on('disconnect', () => {
      console.log('Disconnected from presence socket');
      setIsConnected(false);
    });

    socket.current.on('connectedAccounts', (accounts: ConnectedUser[]) => {
      setConnectedAccounts(accounts);
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [postId, account, connect]);

  return {
    connectedAccounts,
    isConnected: connect ? isConnected : false,
  };
}