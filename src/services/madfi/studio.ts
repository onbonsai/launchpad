import { WalletAddressAcl } from "@lens-chain/storage-client";
import { MetadataAttribute } from "@lens-protocol/client";
import { URI } from "@lens-protocol/metadata";
import z from "zod";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { getSmartMediaUrl } from "@src/utils/utils";

export const APP_ID = "BONSAI";
export const ELIZA_API_URL = process.env.NEXT_PUBLIC_ELIZA_API_URL || "https://eliza-staging.up.railway.app";

/**
 * SmartMedia categories and templates
 */
export enum TemplateCategory {
  EVOLVING_POST = "evolving_post",
  EVOLVING_ART = "evolving_art",
}

export const CATEGORIES = [
  {
    key: TemplateCategory.EVOLVING_POST,
    label: "Evolving Post",
  },
  {
    key: TemplateCategory.EVOLVING_ART,
    label: "Evolving Art"
  },
];

export interface BonsaiClientMetadata {
  domain: string;
  version: string;
  templates: Template[];
  acl: WalletAddressAcl;
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
    requireImage?: boolean;
    requireContent?: boolean;
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
  };
  protocolFeeRecipient: `0x${string}`; // media template
  isProcessing?: boolean;
  versions?: string[];
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
  templateData: any
): Promise<GeneratePreviewResponse | undefined> => {
  try {
    const response = await fetch(`${url}/post/create-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        templateName: template.name,
        category: template.category,
        templateData
      })
    });

    if (!response.ok) throw new Error(`Preview generation failed: ${response.statusText}`);

    return await response.json();
  } catch (error) {
    console.error('Error generating preview:', error);
  }
}

export const createSmartMedia = async (
  url: string,
  idToken: string,
  body: string,
): Promise<any | undefined> => {
  try {
    const response = await fetch(`${url}/post/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body
    });

    if (!response.ok) throw new Error(`Create failed ${response.statusText}`);

    return await response.json();
  } catch (error) {
    console.error('Error creating:', error);
  }
}

export const resolveSmartMedia = async (
  attributes: MetadataAttribute[],
  postId: string,
  withVersions?: boolean
): Promise<SmartMedia | null> => {
  try {
    let url = getSmartMediaUrl(attributes);
    if (!url) return null;

    // HACK: localhost
    if (url === "http://localhost:3001") url = ELIZA_API_URL;
    const response = await fetch(`${url}/post/${postId}?withVersions=${withVersions}`);
    if (!response.ok) {
      // console.log(`Smart media not found for post ${postId}: ${response.status} ${response.statusText}`);
      return null;
    }

    const { data, isProcessing, versions, protocolFeeRecipient } = await response.json();
    return { ...data, isProcessing, versions, protocolFeeRecipient };
  } catch (error) {
    console.log(error);
    return null;
  }
}

export const useResolveSmartMedia = (
  attributes?: MetadataAttribute[],
  postId?: string,
  withVersions?: boolean
): UseQueryResult<SmartMedia | null, Error> => {
  return useQuery({
    queryKey: ["resolve-smart-media", postId],
    queryFn: () => resolveSmartMedia(attributes!, postId!, withVersions),
    enabled: !!postId && !!attributes,
  });
};