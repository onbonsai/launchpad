/// <reference lib="webworker" />
import { generatePreview, TemplateCategory, NFTMetadata } from "@src/services/studio.worker";

// This is needed to make TypeScript happy about the global scope of the worker
declare const self: DedicatedWorkerGlobalScope;

interface WorkerData {
    url: string;
    authHeaders: Record<string, string>;
    category: TemplateCategory;
    templateName: string;
    templateData: any;
    prompt?: string;
    image?: File;
    aspectRatio?: string;
    nft?: NFTMetadata;
    roomId?: string;
    audio?: {
        file: File;
        startTime: number;
    };
    tempId: string;
    remixPostId?: string;
}

// Only run this code if we're in a web worker environment
if (typeof self !== 'undefined' && 'DedicatedWorkerGlobalScope' in self) {
  self.addEventListener('message', async (event: MessageEvent<WorkerData>) => {
    const {
      url,
      authHeaders,
      category,
      templateName,
      templateData,
      prompt,
      image,
      aspectRatio,
      nft,
      roomId,
      audio,
      tempId,
      remixPostId,
    } = event.data;

    try {
      const result = await generatePreview(
        url,
        authHeaders,
        category,
        templateName,
        templateData,
        prompt,
        image,
        aspectRatio,
        nft,
        roomId,
        audio,
        remixPostId,
      );

      // If there's video data with ArrayBuffer, we need to transfer it properly
      const transferList: Transferable[] = [];
      if (result?.preview?.video?.buffer instanceof ArrayBuffer) {
        transferList.push(result.preview.video.buffer);
      }

      // Handle storyboard clips' video buffers
      if (result?.preview?.storyboard && result.preview.storyboard.length > 0) {
        result.preview.storyboard.forEach((clip: any) => {
          if (clip.preview?.video?.buffer instanceof ArrayBuffer) {
            transferList.push(clip.preview.video.buffer);
          }
        });
      }

      // Handle large image ArrayBuffers
      if (result?.preview?.image?.buffer instanceof ArrayBuffer) {
        transferList.push(result.preview.image.buffer);
      }

      self.postMessage({ success: true, result, tempId }, transferList);
    } catch (error) {
      console.error('Error during preview generation for tempId:', tempId, error);
      self.postMessage({ success: false, error: (error as Error).message, tempId });
    }
  });
}