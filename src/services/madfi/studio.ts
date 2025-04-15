import { WalletAddressAcl } from "@lens-chain/storage-client";
import { MetadataAttribute } from "@lens-protocol/client";
import { URI } from "@lens-protocol/metadata";
import z from "zod";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSmartMediaUrl } from "@src/utils/utils";

export const APP_ID = "BONSAI";
export const ELIZA_API_URL = process.env.NEXT_PUBLIC_ELIZA_API_URL || "https://eliza.onbons.ai";

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
  text: string;
  image?: any;
  imagePreview?: string;
  video?: string;
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
  isProcessing?: boolean;
  versions?: string[];
  status?: SmartMediaStatus
};

interface GeneratePreviewResponse {
  preview: Preview | undefined;
  agentId: string;
  acl: WalletAddressAcl;
}

export const generatePreview = async (
  url: string,
  idToken: string,
  template: Template,
  templateData: any,
): Promise<GeneratePreviewResponse | undefined> => {
  try {
    const response = await fetch(`${url}/post/create-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        templateName: template.name,
        category: template.category,
        templateData,
      }),
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

    return await response.json();
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

    const response = await fetch(`${url}/post/${postId}?withVersions=${withVersions}`);
    if (!response.ok) {
      // console.log(`Smart media not found for post ${postId}: ${response.status} ${response.statusText}`);
      return null;
    }

    return  await response.json();
  } catch (error) {
    console.log(error);
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