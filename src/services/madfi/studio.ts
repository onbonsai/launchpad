import { WalletAddressAcl } from "@lens-chain/storage-client";
import { MetadataAttribute, Post, SessionClient } from "@lens-protocol/client";
import { URI } from "@lens-protocol/metadata";
import z from "zod";
import { useQuery, UseQueryResult, useInfiniteQuery } from "@tanstack/react-query";
import { getSmartMediaUrl } from "@src/utils/utils";
import { getPostData, getPosts } from "../lens/posts";
import { resumeSession } from "@src/hooks/useLensLogin";
import { useAuth } from "@src/hooks/useAuth";
import { IS_PRODUCTION } from "./utils";
import { Memory } from "./terminal";
import type { PricingTier } from "@src/services/madfi/moneyClubs";
import { generatePreview } from "./../studio.worker";

export const APP_ID = "BONSAI";
export const ELIZA_API_URL = process.env.NEXT_PUBLIC_ELIZA_API_URL ||
  (IS_PRODUCTION ? "https://eliza.onbons.ai" : "https://eliza-staging.onbons.ai");
export const ELIZA_WEBHOOKS_URL = "https://eliza-webhooks.onbons.ai";
export const ELEVENLABS_VOICES = [
  { label: 'Italian Brainrot (Male)', value: 'pNInz6obpgDQGcFmaJgB' },
  { label: 'Australian (Female)', value: 'ZF6FPAbjXT4488VcRRnw' },
  { label: 'Social (Male)', value: 'CwhRBWXzGAHq8TQ4Fs17' },
];
// so we can quickly feature posts
export const SET_FEATURED_ADMINS = [
  "0xdc4471ee9dfca619ac5465fde7cf2634253a9dc6",
  "0x28ff8e457fef9870b9d1529fe68fbb95c3181f64",
  "0x21af1185734d213d45c6236146fb81e2b0e8b821" // bonsai deployer
];

/**
 * SmartMedia categories and templates
 */
export enum TemplateCategory {
  EVOLVING_POST = "evolving_post",
  EVOLVING_ART = "evolving_art",
  CAMPFIRE = "campfire",
}

export enum SmartMediaStatus {
  ACTIVE = "active", // handler updated it
  FAILED = "failed", // handler failed to update it
  DISABLED = "disabled" // updates are disabled
}

export const CATEGORIES = [
  {
    key: TemplateCategory.EVOLVING_POST,
    label: "Evolving Post",
  },
  {
    key: TemplateCategory.EVOLVING_ART,
    label: "Evolving Art",
  },
  {
    key: TemplateCategory.CAMPFIRE,
    label: "Campfire",
  },
];

export interface BonsaiClientMetadata {
  domain: string;
  version: string;
  templates: Template[];
  acl: WalletAddressAcl;
}

export enum MediaRequirement {
  NONE = "none",
  OPTIONAL = "optional",
  REQUIRED = "required",
}

export type Template = {
  apiUrl: string;
  acl: WalletAddressAcl;
  protocolFeeRecipient: `0x${string}`;
  estimatedCost?: number;
  category: TemplateCategory;
  name: string;
  displayName: string;
  description: string;
  placeholderText?: string;
  image: string;
  options: {
    allowPreview?: boolean;
    allowPreviousToken?: boolean;
    imageRequirement?: MediaRequirement;
    requireContent?: boolean;
    isCanvas?: boolean;
    nftRequirement?: MediaRequirement;
    audioRequirement?: MediaRequirement;
    audioDuration?: number;
  };
  templateData: {
    form: z.ZodObject<any>;
    subTemplates?: any[];
  };
};

export type Preview = {
  roomId?: string;
  agentId?: string; // HACK: should be present but optional if a preview is set client-side
  isAgent?: boolean;
  createdAt?: string;
  content?: {
    text?: string;
    prompt?: string;
    preview?: Preview;
    templateData?: any;
  };
  agentMessageId?: string; // to associate memories with published posts
  text?: string;
  templateName?: string
  image?: any;
  imagePreview?: string;
  imageUrl?: string;
  videoUrl?: string;
  templateData?: any;
  video?: {
    mimeType: string;
    size: number;
    blob: Blob; // This can be used to create an object URL or process the video
    url: string;
  };
  storyboard?: StoryboardClip[]; // Array of clips for composed videos
};

export interface StoryboardClip {
  id: string; // agentId of the preview
  preview: Preview;
  startTime: number;
  endTime: number; // Will be clip duration initially
  duration: number;
  templateData?: any;
}

export type SmartMedia = {
  agentId: string; // uuid
  creator: `0x${string}`; // lens account
  template: string;
  category: TemplateCategory;
  createdAt: number; // unix ts
  updatedAt: number; // unix ts
  templateData?: unknown; // specific data needed per template
  postId: string; // lens post id; will be null for previews
  maxStaleTime: number; // seconds
  uri: URI; // lens storage node uri
  token: {
    chain: "base" | "lens";
    address: `0x${string}`;
    external?: boolean;
    metadata?: {
      symbol?: string;
      name?: string;
      image?: string;
    }
  };
  protocolFeeRecipient: `0x${string}`; // media template
  description?: string;
  isProcessing?: boolean;
  versions?: string[];
  status?: SmartMediaStatus;
  estimatedCost?: number; // estimated credits per generation
  featured?: boolean; // whether the post should be featured
  parentCast?: string;
};

export type NFTMetadata = {
  tokenId: number;
  contract: {
    address: string;
    network: string;
  };
  collection?: {
    name?: string;
  };
  image: string; // base64 string cropped
  attributes?: any[];
}

export type TokenData = {
  initialSupply: number;
  rewardPoolPercentage?: number;
  uniHook?: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  tokenImage: any[];
  selectedNetwork: "lens" | "base";
  totalRegistrationFee?: bigint;
  pricingTier?: PricingTier;
};

interface GeneratePreviewResponse {
  preview: Preview | undefined;
  agentId: string;
  roomId: string;
}

export type Embeds = [] | [string] | [string, string] | undefined;

export const enhancePrompt = async (
  url: string,
  authHeaders: Record<string, string>,
  template: Template,
  prompt: string,
  templateData?: any,
): Promise<string | undefined> => {
  try {
    const response = await fetch(`${url}/post/enhance-prompt`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, template: template.name, templateData }),
    });

    if (!response.ok) {
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes("not enough credits")) {
          throw new Error("not enough credits");
        }
      }
      throw new Error(`Enhance prompt failed: ${response.statusText}`);
    }

    const data = await response.json();

    return data.enhanced as string;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const createSmartMedia = async (url: string, authHeaders: Record<string, string>, body: string): Promise<any | undefined> => {
  try {
    const response = await fetch(`${url}/post/create`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes("not enough credits")) {
          throw new Error("not enough credits");
        }
      }
      throw new Error(`Create failed ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating:", error);
    throw error;
  }
};

/**
 * Resolves complete smart media data from a post's metadata attributes
 *
 * This function attempts to fetch the full smart media data from the API using the post's attributes.
 * It includes timeout handling and graceful error handling for various network conditions.
 *
 * @param attributes - Lens post.metadata.attributes
 * @param postSlug - Lens post.slug
 * @param withVersions - If true, includes version history in the response
 * @param _url - Optional override URL for the API endpoint. If not provided, extracts from attributes.
 * @returns A Promise that resolves to:
 *   - SmartMedia object if successfully resolved
 *   - null if:
 *     - No valid URL found in attributes
 *     - Post not found (404)
 *     - Network timeout/error
 *     - Invalid response format
 */
export const resolveSmartMedia = async (
  attributes: MetadataAttribute[],
  postSlug: string,
  withVersions?: boolean,
  _url?: string,
): Promise<SmartMedia | null> => {
  try {
    let url = _url || getSmartMediaUrl(attributes);
    if (!url) return null;

    // Validate URL format
    try {
      new URL(url);
    } catch {
      // Invalid URL format, fail fast
      return null;
    }

    const controller = new AbortController();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new Error('Request timeout'));
      }, 5000);
    });

    const fetchPromise = fetch(`${url}/post/${postSlug}?withVersions=${withVersions}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    }).then(async (response) => {
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data) {
        throw new Error('No data received');
      }
      return data;
    }).catch(error => {
      // Handle network errors (DNS failure, connection refused, etc)
      if (error instanceof TypeError && error.message.includes('fetch failed')) {
        // Server is unreachable, fail fast
        return null;
      }
      throw error;
    });

    return await Promise.race([fetchPromise, timeoutPromise]) as SmartMedia | null;
  } catch (error) {
    if (error instanceof Error) {
      // Only log if it's not a timeout, abort, or network error
      if (!error.message.includes('abort') &&
          !error.message.includes('timeout') &&
          !(error instanceof TypeError && error.message.includes('fetch failed'))) {
        console.error(`Failed to resolve smart media for post ${postSlug}:`, error.message);
      }
    }
    return null;
  }
};

export const useResolveSmartMedia = (
  attributes?: MetadataAttribute[],
  postId?: string,
  withVersions?: boolean,
  url?: string,
): UseQueryResult<SmartMedia | null, Error> => {
  return useQuery({
    queryKey: ["resolve-smart-media", postId],
    queryFn: () => resolveSmartMedia(attributes!, postId!, withVersions, url),
    enabled: !!postId && !!(attributes || url),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch when component mounts
  });
};

export const setFeatured = async (authHeaders: Record<string, string>, postId: string, featured?: boolean): Promise<boolean> => {
  try {
    const response = await fetch("/api/media/set-featured", {
      method: "POST",
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ postId, featured }),
    });

    if (!response.ok) throw new Error(`Failed to set featured: ${response.statusText}`);

    return true;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
};

export const useGetPreviews = (url?: string, roomId?: string, enabled: boolean = true, isMiniApp = false, address?: `0x${string}`) => {
  const { getAuthHeaders } = useAuth();

  return useInfiniteQuery({
    queryKey: ["previews", roomId, isMiniApp],
    queryFn: async ({ pageParam }) => {
      const headers = await getAuthHeaders({ isWrite: false, requireAuth: false });
      if (!Object.keys(headers).length) return { messages: [] };

      const DEFAULT_COUNT = 10; // 5 user messages, 5 agent messages
      // Use pageParam as the timestamp start, or no start param for first page
      const queryParams = new URLSearchParams({
        count: DEFAULT_COUNT.toString(),
        end: pageParam ?? ""
      });

      const response = await fetch(`${url}/previews/${roomId}/messages?${queryParams}`, {
        headers,
      });
      if (!response.ok) {
        console.log(`ERROR terminal:: useGetMessages: ${response.status} - ${response.statusText}`);
        return { messages: [] };
      }
      const data = await response.json();
      return {
        messages: data.messages as Memory[],
        // Use the last message's createdAt as the next cursor
        nextCursor: data.hasMore ? data.messages[data.messages.length - 1].createdAt : undefined
      };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!url && enabled && !!roomId,
    initialPageParam: undefined // Start with no timestamp for first page
  });
};

type SmartMediaLight = {
  template?: { id: string, formatted: string },
  category?: { id: string, formatted: string },
  mediaUrl?: string,
  isCanvas?: boolean;
}

/**
 * Retrieves smart media information from a Lens Protocol post (if any)
 *
 * This function checks if a post is a smart media post created through the Bonsai app
 * and extracts relevant metadata. It can either return basic metadata (template, category, mediaUrl)
 * or resolve the full smart media data from the API.
 *
 * @param post - The Lens Protocol post to process
 * @param resolve - If true, fetches complete smart media data from the API. If false, returns basic metadata only.
 * @returns A Promise that resolves to:
 *   - SmartMediaLight: Basic metadata if resolve is false
 *   - SmartMedia: Complete smart media data if resolve is true
 *   - null: If the post is not a smart media post
 */
export const fetchSmartMedia = async (post: Post, resolve?: boolean): Promise<SmartMediaLight | SmartMedia | null> => {
  const LENS_BONSAI_APP = "0x640c9184b31467C84096EB2829309756DDbB3f44";
  // handle root post
  // @ts-ignore
  const attributes = !post.root ? post.metadata.attributes : post.root.metadata.attributes;
  const slug = !post.root ? post.slug : post.root.slug;

  const isSmartMedia = post.app?.address === LENS_BONSAI_APP && attributes?.some(attr => attr.key === 'template');
  if (!isSmartMedia) return null;
  if (resolve) {
    return await resolveSmartMedia(attributes, slug, true);
  } else {
    // @ts-ignore
    const template = post.metadata.attributes?.find(({ key }) => key === "template");
    // @ts-ignore
    const category = post.metadata.attributes?.find(({ key }) => key === "templateCategory");
    // @ts-ignore
    const mediaUrl = post.metadata.attributes?.find(({ key }) => key === "apiUrl");
    // @ts-ignore
    const isCanvas = post.metadata.attributes?.find(({ key }) => key === "isCanvas");

    return {
      ...(template && {
        template: {
          id: template.value,
          formatted: template.value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
        }
      }),
      ...(category && {
        category: {
          id: category.value,
          formatted: category.value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
        }
      }),
      mediaUrl: mediaUrl?.value,
      isCanvas: !!isCanvas?.value
    }
  }
}

const _getIdToken = async (isMiniApp = false): Promise<string | undefined> => {
  try {
    if (isMiniApp) {
      // Farcaster miniapp flow
      const { sdk } = await import("@farcaster/miniapp-sdk");
      const { token } = await sdk.quickAuth.getToken();
      return token;
    } else {
      // Lens authentication flow
      const sessionClient = await resumeSession(true);
      if (!sessionClient) {
        return;
      }
      const creds = await (sessionClient as SessionClient).getCredentials();
      if (creds.isOk()) {
        return creds.value?.idToken;
      }
    }
  } catch (error) {
    console.error('Error getting authentication token:', error);
    return undefined;
  }
}

export const composeStoryboard = async (
  url: string,
  authHeaders: Record<string, string>,
  clips: StoryboardClip[],
  audio: File | { url: string, name: string } | string | null,
  audioStartTime: number,
  roomId?: string,
): Promise<GeneratePreviewResponse | undefined> => {
  try {
    const formData = new FormData();
    let audioData: any = audio;
    if (typeof audio === 'string' && audio.startsWith('http')) {
      audioData = { url: audio };
    }

    formData.append('data', JSON.stringify({
      roomId,
      storyboard: clips.map(clip => ({
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        videoUrl: (clip.preview?.video?.url && !clip.preview.video.url.startsWith('blob:')) ? clip.preview.video.url : undefined,
      })),
      audioStartTime,
      audio: audioData
    }));

    if (audio && audio instanceof File) {
      formData.append('audio', audio);
    }

    const response = await fetch(`${url}/storyboard/compose`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
      signal: AbortSignal.timeout(300000) // 5 minutes for composition
    });

    if (!response.ok) {
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes("not enough credits")) {
          throw new Error("not enough credits");
        }
      }
      throw new Error(`Composition failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.preview?.video) {
      const videoData = new Uint8Array(data.preview.video.buffer);
      const videoBlob = new Blob([videoData], { type: data.preview.video.mimeType });
      return {
        preview: {
          video: {
            mimeType: data.preview.video.mimeType,
            size: videoBlob.size,
            blob: videoBlob,
            url: URL.createObjectURL(videoBlob),
          },
          ...(data.preview.image && { image: data.preview.image }),
          text: data.preview.text,
        },
        agentId: data.agentId,
        roomId: data.roomId
      };
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export { generatePreview };