import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { SITE_URL } from '@src/constants/constants';

interface TikTokIntegration {
  username?: string;
  displayName?: string;
  scopes?: string[];
  connectedAt?: string;
  isExpired?: boolean;
}

interface UseTikTokIntegrationReturn {
  integration: TikTokIntegration | null;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const useTikTokIntegration = (): UseTikTokIntegrationReturn => {
  const { address, isConnected: isWalletConnected } = useAccount();
  const [integration, setIntegration] = useState<TikTokIntegration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/integrations/tiktok/status?userAddress=${address}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load integration status');
      }

      if (data.connected) {
        setIntegration({
          username: data.integration.username,
          displayName: data.integration.displayName,
          scopes: data.integration.scopes,
          connectedAt: new Date(data.integration.connectedAt).toLocaleDateString(),
          isExpired: data.integration.isExpired
        });
      } else {
        setIntegration(null);
      }
    } catch (error) {
      console.error('Failed to load TikTok integration status:', error);
      setError(error instanceof Error ? error.message : 'Failed to load integration status');
    }
  };

  const connect = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const redirectUri = `${SITE_URL}/studio/integrations`;
      const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;

      if (!clientKey) {
        throw new Error('TikTok client key not configured');
      }

      const scopes = [
        'user.info.basic',
        'user.info.profile',
        'user.info.stats',
        'video.upload',
        'video.publish'
      ];

      const state = `auth_${Date.now()}_${address}`;
      const authUrl = `https://www.tiktok.com/v2/auth/authorize?` +
        `client_key=${clientKey}&` +
        `scope=${scopes.join(',')}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('TikTok auth error:', error);
      setError('Failed to start TikTok authentication. Please try again.');
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/tiktok/disconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAddress: address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect TikTok account');
      }

      setIntegration(null);
    } catch (error) {
      console.error('TikTok disconnect error:', error);
      setError(error instanceof Error ? error.message : 'Failed to disconnect TikTok account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load integration status on mount and when address changes
  useEffect(() => {
    if (address) {
      refreshStatus();
    }
  }, [address]);

  return {
    integration,
    isConnected: integration !== null,
    loading,
    error,
    connect,
    disconnect,
    refreshStatus
  };
};
