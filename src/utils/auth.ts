import { resumeSession } from '@src/hooks/useLensLogin';
import { sdk } from "@farcaster/miniapp-sdk";
import toast from 'react-hot-toast';

export interface AuthResult {
  token: string;
  headers: Record<string, string>;
  success: boolean;
  error?: string;
}

export interface AuthOptions {
  isMiniApp?: boolean;
  requireAuth?: boolean;
  address?: `0x${string}`;
}

/**
 * Centralized authentication utility that handles both Lens and Farcaster miniapp flows
 * @param options - Authentication options
 * @returns Promise<AuthResult> - Contains token, headers, and success status
 */
export async function getAuthToken(options: AuthOptions = {}): Promise<AuthResult> {
  const { isMiniApp = false, requireAuth = true } = options;

  try {
    if (isMiniApp) {
      // Farcaster miniapp flow
      const { token } = await sdk.quickAuth.getToken();

      if (!token) {
        const error = "Failed to get Farcaster authentication token";
        if (requireAuth) {
          toast.error(error);
        }
        return { token: '', headers: {}, success: false, error };
      }

      return {
        token,
        headers: {
          'Content-Type': 'application/json',
          'x-farcaster-session': token,
          'x-farcaster-address': (options.address as string).toLowerCase(),
        },
        success: true
      };
    } else {
      // Lens authentication flow
      const sessionClient = await resumeSession(true);

      if (!sessionClient) {
        const error = "Please log in to continue";
        if (requireAuth) {
          toast.error(error);
        }
        return { token: '', headers: {}, success: false, error };
      }

      const creds = await sessionClient.getCredentials();

      if (creds.isErr() || !creds.value) {
        const error = "Authentication failed";
        if (requireAuth) {
          toast.error(error);
        }
        return { token: '', headers: {}, success: false, error };
      }

      const idToken = creds.value.idToken;

      return {
        token: idToken,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        success: true
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    if (requireAuth) {
      toast.error(errorMessage);
    }
    return { token: '', headers: {}, success: false, error: errorMessage };
  }
}

/**
 * Helper function to get auth headers for fetch requests
 * @param options - Authentication options
 * @returns Promise<Record<string, string>> - Headers object ready for fetch
 */
export async function getAuthHeaders(options: AuthOptions = {}): Promise<Record<string, string>> {
  const result = await getAuthToken(options);
  return result.headers;
}

/**
 * Helper function that throws if authentication fails (for backwards compatibility)
 * @param options - Authentication options
 * @returns Promise<string> - The authentication token
 */
export async function requireAuthToken(options: AuthOptions = {}): Promise<string> {
  const result = await getAuthToken({ ...options, requireAuth: true });

  if (!result.success) {
    throw new Error(result.error || 'Authentication failed');
  }

  return result.token;
}