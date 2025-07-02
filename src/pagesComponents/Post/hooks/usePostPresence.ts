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
  account: Account | null;
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
  const shouldReconnect = useRef(true);

  const connectSocket = () => {
    if (!postId || !connect || !account?.address || !shouldReconnect.current) return;

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
  };

  const disconnectSocket = () => {
    if (socket.current) {
      socket.current.disconnect();
      socket.current = null;
      setIsConnected(false);
    }
  };

  useEffect(() => {
    connectSocket();

    // Handle bfcache - disconnect on pagehide, reconnect on pageshow
    const handlePageHide = () => {
      console.log('Page hiding - disconnecting presence socket for bfcache');
      disconnectSocket();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('Page restored from bfcache - reconnecting presence socket');
        connectSocket();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      shouldReconnect.current = false;
      disconnectSocket();
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [postId, account, connect]);

  return {
    connectedAccounts,
    isConnected: connect ? isConnected : false,
  };
}