import { useCallback, useState } from 'react';
import { useAccount } from 'wagmi';
import { resumeSession } from '@src/hooks/useLensLogin';
import { sdk } from "@farcaster/miniapp-sdk";
import { useIsMiniApp } from '@src/hooks/useIsMiniApp';
import toast from 'react-hot-toast';

export interface AuthHeaders {
  [key: string]: string;
}

export interface AuthOptions {
  isWrite?: boolean;
  requireAuth?: boolean;
}

/**
 * Authentication hook that manages token state and provides auth headers
 * Handles both Lens and Farcaster miniapp authentication flows
 */
export function useAuth() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const { address } = useAccount();
  const { isMiniApp } = useIsMiniApp();

  /**
   * Get authentication headers
   * For miniapp GET operations: only x-farcaster-address header
   * For miniapp write operations: fetch token and include x-farcaster-session
   * For Lens: always get full auth token
   */
  const getAuthHeaders = useCallback(async (options: AuthOptions = {}): Promise<AuthHeaders> => {
    const { isWrite = false, requireAuth = true } = options;

    try {
      if (isMiniApp) {
        const baseHeaders: AuthHeaders = {
          'Content-Type': 'application/json',
          'x-farcaster-address': (address as string)?.toLowerCase() || '',
        };

        // For GET operations, we don't need the auth token
        if (!isWrite) {
          return baseHeaders;
        }

        // For write operations, get the actual token
        const { token } = await sdk.quickAuth.getToken();

        if (!token) {
          const error = "Please complete the Farcaster login";
          if (requireAuth) {
            toast.error(error);
            throw new Error(error);
          }
          return baseHeaders;
        }

        setAuthToken(token);
        return {
          ...baseHeaders,
          'x-farcaster-session': token,
        };
      } else {
        // Lens authentication flow - always need actual auth
        const sessionClient = await resumeSession(true);

        if (!sessionClient) {
          const error = "Please log in to continue";
          if (requireAuth) {
            toast.error(error);
            throw new Error(error);
          }
          return { 'Content-Type': 'application/json' };
        }

        const creds = await sessionClient.getCredentials();

        if (creds.isErr() || !creds.value) {
          const error = "Authentication failed";
          if (requireAuth) {
            toast.error(error);
            throw new Error(error);
          }
          return { 'Content-Type': 'application/json' };
        }

        const idToken = creds.value.idToken;
        setAuthToken(idToken);

        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      if (requireAuth) {
        toast.error(errorMessage);
        throw error;
      }
      return { 'Content-Type': 'application/json' };
    }
  }, [isMiniApp, address]);

  /**
   * Clear the stored auth token (useful for logout or token refresh)
   */
  const clearAuthToken = useCallback(() => {
    setAuthToken(null);
  }, []);

  return {
    getAuthHeaders,
    authToken,
    clearAuthToken,
  };
}