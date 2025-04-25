import { WalletAddressAcl } from "@lens-chain/storage-client";
import { MetadataAttribute } from "@lens-protocol/client";
import { URI } from "@lens-protocol/metadata";
import z from "zod";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSmartMediaUrl } from "@src/utils/utils";
import { getClientWithMedia } from "../mongo/client";
import { getPostData, getPosts } from "../lens/posts";
import { resumeSession } from "@src/hooks/useLensLogin";
import { IS_PRODUCTION } from "./utils";

export const APP_ID = "BONSAI";
export const ELIZA_API_URL = process.env.NEXT_PUBLIC_ELIZA_API_URL ||
  (IS_PRODUCTION ? "https://eliza.onbons.ai" : "https://eliza-staging.onbons.ai");
export const ELEVENLABS_VOICES = [
  { label: 'Serious (Male)', value: 'U2VUL94XlY3UYSlQvsxF' },
  { label: 'Australian (Female)', value: 'ZF6FPAbjXT4488VcRRnw' },
  { label: 'Italian Brainrot', value: 'pNInz6obpgDQGcFmaJgB' },
];
// only for stakers, no free generations (generally because they are expensive)
export const PREMIUM_TEMPLATES = ["video_dot_fun", "adventure_time_video"];
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

export enum ImageRequirement {
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
  image: string;
  options: {
    allowPreview?: boolean;
    allowPreviousToken?: boolean;
    imageRequirement?: ImageRequirement;
    requireContent?: boolean;
    isCanvas?: boolean;
  };
  templateData: {
    form: z.ZodObject<any>;
  };
};

export type Preview = {
  agentId?: string; // HACK: should be present but optional if a preview is set client-side
  text?: string;
  image?: any;
  imagePreview?: string;
  video?: {
    mimeType: string;
    size: number;
    blob: Blob; // This can be used to create an object URL or process the video
    url: string;
  };
};

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
  };
  protocolFeeRecipient: `0x${string}`; // media template
  description?: string;
  isProcessing?: boolean;
  versions?: string[];
  status?: SmartMediaStatus;
  estimatedCost?: number; // estimated credits per generation
  featured?: boolean; // whether the post should be featured
};

interface GeneratePreviewResponse {
  preview: Preview | undefined;
  agentId: string;
}

export const generatePreview = async (
  url: string,
  idToken: string,
  template: Template,
  templateData: any,
  image?: File,
  aspectRatio?: string,
): Promise<GeneratePreviewResponse | undefined> => {
  try {
    const formData = new FormData();
    formData.append('data', JSON.stringify({
      category: template.category,
      templateName: template.name,
      templateData: {
        ...templateData,
        aspectRatio
      },
    }));
    if (image) formData.append('image', image);
    const response = await fetch(`${url}/post/create-preview`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes("not enough credits")) {
          throw new Error("not enough credits");
        } else if (errorText.includes("three previews")) {
          throw new Error("max free previews");
        }
      }
      throw new Error(`Preview generation failed: ${response.statusText}`);
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
        agentId: data.agentId
      };
    }

    return data;
  } catch (error) {
    console.error("Error generating preview:", error);
    throw error;
  }
};

export const createSmartMedia = async (url: string, idToken: string, body: string): Promise<any | undefined> => {
  try {
    const response = await fetch(`${url}/post/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
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

export const resolveSmartMedia = async (
  attributes: MetadataAttribute[],
  postId: string,
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

    const fetchPromise = fetch(`${url}/post/${postId}?withVersions=${withVersions}`, {
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
        console.error(`Failed to resolve smart media for post ${postId}:`, error.message);
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

export const requestPostUpdate = async (url: string, postSlug: string, idToken: string): Promise<boolean> => {
  try {
    const response = await fetch(`${url}/post/${postSlug}/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ forceUpdate: true })
    });

    if (!response.ok) {
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes("not enough credits")) {
          throw new Error("not enough credits");
        }
      }
      throw new Error(`Post update failed: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error requestPostUpdate::", error);
    throw error;
  }
};

export const requestPostDisable = async (url: string, postSlug: string, idToken: string): Promise<boolean> => {
  try {
    const response = await fetch(`${url}/post/${postSlug}/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) throw new Error(`Post disable failed: ${response.statusText}`);

    return true;
  } catch (error) {
    console.error("Error requestPostDisable::", error);
    return false;
  }
}

export const useGetFeaturedPosts = () => {
  return useQuery({
    queryKey: ['featured-posts'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/bonsai/get-featured-media');
        if (!response.ok) throw new Error('Failed to fetch featured media');
        const { postIds } = await response.json();
        let sessionClient;
        try {
          sessionClient = await resumeSession();
        } catch { }
        const [posts, postData] = await Promise.all([
          getPosts(postIds, sessionClient),
          getPostData(postIds)
        ]);

        return { posts, postData };
      } catch (error) {
        return { posts: [], postData: [] };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const setFeatured = async (idToken: string, postId: string, featured?: boolean): Promise<boolean> => {
  try {
    const response = await fetch("/api/bonsai/set-featured", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
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