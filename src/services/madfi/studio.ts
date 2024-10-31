import { WalletAddressAcl } from "@lens-chain/storage-client";
import { MetadataAttribute, Post } from "@lens-protocol/client";
import { URI } from "@lens-protocol/metadata";
import z from "zod";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSmartMediaUrl } from "@src/utils/utils";
import { IS_PRODUCTION } from "./utils";
import type { PricingTier } from "@src/services/madfi/moneyClubs";

export const APP_ID = "BONSAI";
export const ELIZA_API_URL =
  process.env.NEXT_PUBLIC_ELIZA_API_URL ||
  (IS_PRODUCTION ? "https://eliza.onbons.ai" : "https://eliza-staging.onbons.ai");

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
  DISABLED = "disabled", // updates are disabled
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
  templateName?: string;
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
    };
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
};

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

export type Embeds = [] | [string] | [string, string] | undefined;

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
        reject(new Error("Request timeout"));
      }, 5000);
    });

    const fetchPromise = fetch(`${url}/post/${postSlug}?withVersions=${withVersions}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data) {
          throw new Error("No data received");
        }
        return data;
      })
      .catch((error) => {
        // Handle network errors (DNS failure, connection refused, etc)
        if (error instanceof TypeError && error.message.includes("fetch failed")) {
          // Server is unreachable, fail fast
          return null;
        }
        throw error;
      });

    return (await Promise.race([fetchPromise, timeoutPromise])) as SmartMedia | null;
  } catch (error) {
    if (error instanceof Error) {
      // Only log if it's not a timeout, abort, or network error
      if (
        !error.message.includes("abort") &&
        !error.message.includes("timeout") &&
        !(error instanceof TypeError && error.message.includes("fetch failed"))
      ) {
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

type SmartMediaLight = {
  template?: { id: string; formatted: string };
  category?: { id: string; formatted: string };
  mediaUrl?: string;
  isCanvas?: boolean;
};

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

  const isSmartMedia = post.app?.address === LENS_BONSAI_APP && attributes?.some((attr) => attr.key === "template");
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
          formatted: template.value
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase()),
        },
      }),
      ...(category && {
        category: {
          id: category.value,
          formatted: category.value
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase()),
        },
      }),
      mediaUrl: mediaUrl?.value,
      isCanvas: !!isCanvas?.value,
    };
  }
};
