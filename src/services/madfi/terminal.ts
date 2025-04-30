import { Account, SessionClient } from "@lens-protocol/client";
import { getProfileByHandle } from "../lens/getProfiles";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { resumeSession } from "@src/hooks/useLensLogin";
import { IS_PRODUCTION } from "./utils";

export const TERMINAL_API_URL = process.env.NEXT_PUBLIC_ELIZA_TERMINAL_API_URL ||
  (IS_PRODUCTION ? "https://eliza-terminal.onbons.ai" : "https://eliza-staging-terminal.onbons.ai");
export const GLOBAL_AGENT_ID = "c3bd776c-4465-037f-9c7a-bf94dfba78d9"; // Sage

export interface AgentInfo {
  info: { wallets: `0x${string}`[] };
  account?: Account,
  agentId: string;
};
export const getAgentInfo = async (agentId: string): Promise<AgentInfo | undefined> => {
  try {
    const response = await fetch(`${TERMINAL_API_URL}/agent/${agentId}/info`);
    const info = await response.json();

    let account;
    if (!!info.account?.username) {
      account = await getProfileByHandle(info.account.username);
    }

    return {
      info,
      account,
      agentId: GLOBAL_AGENT_ID,
    };
  } catch (error) {
    console.error('Failed to fetch agent info:', error);
  }
};

export const useGetAgentInfo = (agentId?: string): UseQueryResult<AgentInfo, Error> => {
  return useQuery({
    queryKey: ["agent-info", agentId || GLOBAL_AGENT_ID],
    queryFn: () => getAgentInfo(agentId || GLOBAL_AGENT_ID),
  });
};

export const useGetMessages = (postId?: string): UseQueryResult<{ messages: Memory[], canMessage: boolean } , Error> => {
  return useQuery({
    queryKey: ["agent-messages", postId],
    queryFn: async () => {
      const idToken = await _getIdToken();
      if (!idToken) return [];

      const response = await fetch(`${TERMINAL_API_URL}/post/${postId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer: ${idToken}`
        },
      });
      if (!response.ok) {
        console.log(`ERROR terminal:: useGetMessages: ${response.status} - ${response.statusText}`);
        return [];
      }
      return await response.json();
    },
    enabled: !!postId
  });
};

type MessageResponse = {
  text: string
  action: string
  attachments: any
}
interface SendMessageProps {
  agentId: string
  input: string
  conversationId?: string
  payload: any
  imageURL?: string
}
export const sendMessage = async ({
  agentId,
  input,
  conversationId,
  payload,
  imageURL
}: SendMessageProps): Promise<{ messages: MessageResponse[], canMessageAgain: boolean } | undefined> => {
  const idToken = await _getIdToken();
  if (!idToken) return;

  const response = await fetch(`${TERMINAL_API_URL}/post/${agentId}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer: ${idToken}`
    },
    body: JSON.stringify({
      text: input,
      roomId: conversationId,
      payload,
      imageURL
    }),
  });

  if (!response.ok) {
    console.log(`ERROR terminal:: sendMessage: ${ response.status } - ${ response.statusText }`);
    return;
  }

  return await response.json();
}

export interface PostPresenceResponse {
  [postId: string]: {
    count: number;
    topUsers: Array<{
      handle: string;
      image: string;
      score: number;
    }>;
  };
}
export const getPostPresenceData = async (postIds: string[]): Promise<PostPresenceResponse> => {
  try {
    const response = await fetch(`${TERMINAL_API_URL}/presence/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postIds }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch presence data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching presence data:', error);
    return {};
  }
};

const _getIdToken = async (): Promise<string | undefined> => {
  const sessionClient = await resumeSession(true);

  if (!sessionClient) {
    return;
  } else {
    const creds = await(sessionClient as SessionClient).getCredentials();

    if (creds.isOk()) {
      return creds.value?.idToken;
    }
  }
}

/**
 * Represents a media attachment
 */
export type Media = {
  /** Unique identifier */
  id: string;

  /** Media URL */
  url: string;

  /** Media title */
  title: string;

  /** Media source */
  source: string;

  /** Media description */
  description: string;

  /** Text content */
  text: string;

  /** Content type */
  contentType?: string;
};

/**
 * Represents the content of a message or communication
 */
export interface Content {
  /** The main text content */
  text: string;

  /** Optional action associated with the message */
  action?: string;

  /** Optional source/origin of the content */
  source?: string;

  /** URL of the original message/post (e.g. tweet URL, Discord message link) */
  url?: string;

  /** UUID of parent message if this is a reply/thread */
  inReplyTo?: string;

  /** Array of media attachments */
  attachments?: Media[];

  /** Additional dynamic properties */
  [key: string]: unknown;
}

/**
 * Represents a stored memory/message
 */
export interface Memory {
  /** Optional unique identifier */
  id?: string;

  /** Associated user ID */
  userId: string;

  /** Associated agent ID */
  agentId: string;

  /** Optional creation timestamp */
  createdAt?: number;

  /** Memory content */
  content: Content;

  /** Optional embedding vector */
  embedding?: number[];

  /** Associated room ID */
  roomId: string;

  /** Whether memory is unique */
  unique?: boolean;

  /** Embedding similarity score */
  similarity?: number;
}