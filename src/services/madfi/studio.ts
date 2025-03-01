import { AclTemplate } from "@lens-chain/storage-client/import";
import { zeroAddress } from "viem";
import z from "zod";

/**
 * SmartMedia templates
 */
export enum TemplateName {
  ADVENTURE_TIME = "adventure_time",
  ARTIST_PRESENT = "artist_present",
}

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

export type Template = {
  apiUrl: string;
  protocolFeeRecipient: `0x${string}`;
  category: TemplateCategory;
  name: TemplateName;
  label: string;
  description: string;
  image: string;
  options: {
    allowPreview?: boolean;
    allowPreviousToken?: boolean;
    requireImage: boolean;
  };
  templateData: {
    form: z.ZodObject<any>;
  };
};

export type Preview = {
  text: string;
  image?: string;
  video?: string;
}

// TODO: how can we pull these from a registry api?
export const TEMPLATES: Template[] = [
  {
    apiUrl: "http://localhost:3001",
    protocolFeeRecipient: zeroAddress,
    category: TemplateCategory.EVOLVING_POST,
    name: TemplateName.ADVENTURE_TIME,
    label: "Adventure Time",
    description: "Choose your own adventure. Creator sets the context and inits the post with the first page. Weighted comments / upvotes decide the direction of the story.",
    image: "https://link.storjshare.io/raw/jxf7g334eesksjbdydo3dglc62ua/bonsai/adventureTime.jpg",
    options: {
      allowPreview: true,
      allowPreviousToken: true,
      requireImage: false,
    },
    templateData: {
      form: z.object({
        context: z.string().describe("Set the initial context and background for your story. This will help guide the narrative direction."),
        writingStyle: z.string().describe("Define the writing style and tone - e.g. humorous, dramatic, poetic, etc."),
        modelId: z.string().optional().nullable().describe("Optional: Specify an AI model to use for image generation"),
        stylePreset: z.string().optional().nullable().describe("Optional: Choose a style preset to use for image generation"),
      })
    }
  },
  {
    apiUrl: "http://localhost:3001",
    protocolFeeRecipient: zeroAddress,
    category: TemplateCategory.EVOLVING_ART,
    name: TemplateName.ARTIST_PRESENT,
    label: "Artist is Present",
    description: "The artist is present in the evolving art. Creator sets the original image and style. The comment with the most votes dictates how the image evolves.",
    image: "https://link.storjshare.io/raw/jvudw6oz7g5bui2ypmjtvi46h55q/bonsai/artistPresent.jpg",
    options: {
      allowPreview: false,
      allowPreviousToken: true,
      requireImage: true,
    },
    templateData: {
      form: z.object({
        style: z.string().describe("Define the style to maintain for all image generations - e.g. bright, neon green."),
        modelId: z.string().optional().nullable().describe("Optional: Specify an AI model to use for image generation"),
        stylePreset: z.string().optional().nullable().describe("Optional: Choose a style preset to use for image generation"),
      })
    }
  }
];

interface GeneratePreviewResponse {
  preview: Preview | undefined;
  agentId: string;
  acl: AclTemplate;
}

export const generatePreview = async (
  token: string,
  template: Template,
  templateData: any
): Promise<GeneratePreviewResponse | undefined> => {
  try {
    const response = await fetch(`${template.apiUrl}/post/create-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        templateName: template.name,
        category: template.category,
        templateData
      })
    });

    if (!response.ok) {
      console.log(`Preview generation failed: ${response.statusText}`);
      return;
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating preview:', error);
  }
}