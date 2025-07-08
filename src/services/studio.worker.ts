import { URI } from "@lens-protocol/metadata";
import { z } from "zod";

export enum TemplateCategory {
  EVOLVING_POST = "evolving_post",
  EVOLVING_ART = "evolving_art",
  CAMPFIRE = "campfire",
}

export interface BonsaiClientMetadata {
  domain: string;
  version: string;
  templates: Template[];
}

export enum MediaRequirement {
  NONE = "none",
  OPTIONAL = "optional",
  REQUIRED = "required",
}

export type Template = {
  apiUrl: string;
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
  agentId?: string;
  text?: string;
  templateName?: string
  image?: any;
  imagePreview?: string;
  templateData?: any;
  video?: {
    mimeType: string;
    size: number;
    buffer: ArrayBuffer;
  };
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

interface GeneratePreviewResponse {
  preview: Preview | undefined;
  agentId: string;
  roomId: string;
  agentMessageId?: string;
}

// Only define the function if we're in a browser environment
const generatePreviewImpl = async (
  url: string,
  idToken: string,
  category: TemplateCategory,
  templateName: string,
  templateData: any,
  prompt?: string,
  image?: File,
  aspectRatio?: string,
  nft?: NFTMetadata,
  roomId?: string,
  audio?: {
    file: File;
    startTime: number;
  },
): Promise<GeneratePreviewResponse | undefined> => {
  console.log('[studio.worker] generatePreview called with:', { url, category, templateName, prompt, roomId });
  
  try {
    // Step 1: Make the initial request to create the preview task
    const formData = new FormData();
    formData.append('data', JSON.stringify({
      roomId,
      category: category,
      templateName: templateName,
      templateData: {
        ...templateData,
        aspectRatio,
        nft,
        audioStartTime: templateData.audioStartTime || audio?.startTime
      },
      prompt,
    }));
    if (image) formData.append('image', image);
    if (audio) formData.append('audio', audio.file);

    console.log('[studio.worker] Making POST request to:', `${url}/post/create-preview`);

    const response = await fetch(`${url}/post/create-preview`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData,
      signal: AbortSignal.timeout(600000) // 10 minutes instead of default ~15s
    });

    console.log('[studio.worker] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 403) {
        const errorText = await response.text();
        console.error('[studio.worker] 403 error:', errorText);
        if (errorText.includes("not enough credits")) {
          throw new Error("not enough credits");
        }
      }
      throw new Error(`Preview generation failed: ${response.statusText}`);
    }

    // Step 2: Extract taskId from the response
    const taskResponse = await response.json();
    const taskId = taskResponse.taskId;

    if (!taskId) {
      throw new Error("No taskId received from server");
    }

    // Step 3: Poll the status endpoint until completion
    const pollStatus = async (): Promise<GeneratePreviewResponse> => {
      const statusResponse = await fetch(`${url}/task/${taskId}/status`, {
        method: "GET",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();

      switch (statusData.status) {
        case 'completed':
          return await processCompletedTask(statusData.result);
        case 'failed':
          throw new Error(statusData.error || 'Task failed');
        case 'processing':
        case 'queued':
          // Wait 10 seconds before polling again
          await new Promise(resolve => setTimeout(resolve, 10000));
          return pollStatus();
        default:
          throw new Error(`Unknown task status: ${statusData.status}`);
      }
    };

    // Helper function to process the completed task result
    const processCompletedTask = async (data: any): Promise<GeneratePreviewResponse> => {
      if (data.preview?.video) {
        const videoData = new Uint8Array(data.preview.video.buffer);
        const videoBlob = new Blob([videoData], { type: data.preview.video.mimeType });
        const videoBuffer = await videoBlob.arrayBuffer();

        // Handle large base64 images by converting them to ArrayBuffers
        let imageData: string | { buffer: ArrayBuffer; mimeType: string; isLargeImage: boolean } | undefined = undefined;
        if (data.preview.image && typeof data.preview.image === 'string' && data.preview.image.length > 100000) { // >100KB
          try {
            // Convert base64 to ArrayBuffer for large images
            const response = await fetch(data.preview.image);
            const imageBuffer = await response.arrayBuffer();
            imageData = {
              buffer: imageBuffer,
              mimeType: data.preview.image.split(';')[0].split(':')[1] || 'image/png',
              isLargeImage: true
            };
          } catch (error) {
            console.warn('[studio.worker] Failed to convert large image to buffer, keeping as base64:', error);
            imageData = data.preview.image;
          }
        } else if (data.preview.image) {
          imageData = data.preview.image;
        }

        return {
          preview: {
            video: {
              mimeType: data.preview.video.mimeType,
              size: videoBlob.size,
              buffer: videoBuffer,
            },
            ...(imageData && { image: imageData }),
            text: data.preview.text,
          },
          agentId: data.agentId,
          roomId: data.roomId,
          agentMessageId: data.agentMessageId,
        };
      }

      // Handle large base64 images for non-video responses
      if (data.preview?.image && typeof data.preview.image === 'string' && data.preview.image.length > 100000) { // >100KB
        try {
          const response = await fetch(data.preview.image);
          const imageBuffer = await response.arrayBuffer();
          return {
            ...data,
            preview: {
              ...data.preview,
              image: {
                buffer: imageBuffer,
                mimeType: data.preview.image.split(';')[0].split(':')[1] || 'image/png',
                isLargeImage: true
              }
            }
          };
        } catch (error) {
          console.warn('[studio.worker] Failed to convert large image to buffer, keeping as base64:', error);
        }
      }

      return data;
    };

    return await pollStatus();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Export the function only if we're in a browser environment
export const generatePreview = typeof window !== 'undefined' || typeof self !== 'undefined'
  ? generatePreviewImpl
  : (() => {
      throw new Error('generatePreview can only be used in a browser environment');
    }) as typeof generatePreviewImpl;