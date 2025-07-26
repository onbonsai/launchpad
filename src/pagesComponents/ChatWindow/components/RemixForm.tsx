import { useEffect, useState } from 'react';
import { Button } from '@src/components/Button';
import type { SmartMedia, Template, Preview } from '@src/services/madfi/studio';
import toast from 'react-hot-toast';
import { useGetCredits } from '@src/hooks/useGetCredits';
import { useAccount } from 'wagmi';
import { useAuth } from '@src/hooks/useAuth';
import { useTopUpModal } from '@src/context/TopUpContext';
import { useIsMiniApp } from '@src/hooks/useIsMiniApp';
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";

type RemixFormProps = {
  template?: Template;
  remixMedia: SmartMedia;
  onClose: () => void;
  currentPreview?: Preview;
  setCurrentPreview?: (preview: Preview) => void;
  postId?: string;
};

export default function RemixForm({
  remixMedia,
  onClose,
  template,
  currentPreview,
  setCurrentPreview,
  postId,
}: RemixFormProps) {
  const { address, isConnected } = useAccount();
  const { isMiniApp } = useIsMiniApp();
  const { getAuthHeaders } = useAuth();
  const [prompt, setPrompt] = useState<string>("");
  const [frameSelection, setFrameSelection] = useState<'start' | 'end'>('start');
  const [animateImage, setAnimateImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<Preview | undefined>(currentPreview);

  const { data: creditBalance, refetch: refetchCredits } = useGetCredits(address as string, isConnected);
  const { openSwapToGenerateModal } = useTopUpModal();

  // Check if the media is a video
  const isVideo = remixMedia?.templateData &&
    (remixMedia.template === 'video' ||
     !!(remixMedia.templateData as any).video ||
     !!(remixMedia.templateData as any).clips);

  // Check if the media is an image
  const isImage = !isVideo;

  // Calculate credits needed
  const creditsNeeded = animateImage ? (template?.estimatedCost || 10) + 50 : (template?.estimatedCost || 10);
  const hasEnoughCredits = (creditBalance?.creditsRemaining || 0) >= creditsNeeded;

  const generateRemix = async () => {
    if (!template || !prompt.trim()) return;

    if (!hasEnoughCredits) {
      toast.error("Not enough credits");
      return;
    }

    setIsGenerating(true);

    try {
      const authHeaders = await getAuthHeaders({ isWrite: true });

      // Call the new remix endpoint
      const response = await fetch('/api/media/remix', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: remixMedia.postId,
          prompt: prompt.trim(),
          frameSelection: isVideo ? frameSelection : undefined,
          animateImage: isImage ? animateImage : false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate remix');
      }

      const result = await response.json();

      // Set the preview
      if (result.preview) {
        setPreview(result.preview);
        if (setCurrentPreview) {
          setCurrentPreview(result.preview);
        }
      }

      toast.success("Remix generated!");
      refetchCredits();

    } catch (error: any) {
      console.error('Error generating remix:', error);
      toast.error(error.message || "Failed to generate remix");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseThis = () => {
    if (preview && setCurrentPreview) {
      setCurrentPreview(preview);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-[#0a0a0a] rounded-2xl border border-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Remix Post</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Preview Display */}
          <>
            {preview && (
              <div className="mb-4 p-4 bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Preview</span>
                <Button
                  onClick={handleUseThis}
                  variant="accentBrand"
                  size="xs"
                >
                  Use this
                </Button>
              </div>
              {preview.video ? (
                <video
                  src={typeof preview.video === 'string' ? preview.video : preview.video.url}
                  controls
                  className="w-full max-h-64 object-contain rounded bg-black"
                />
              ) : preview.image ? (
                <img
                  src={preview.image}
                  alt="Preview"
                  className="w-full max-h-64 object-contain rounded"
                />
              ) : null}
              {preview.text && (
                <p className="mt-2 text-sm text-gray-300">{preview.text}</p>
              )}
              </div>
            )}
          </>

          {/* Frame Selection for Videos */}
          {isVideo && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Frame
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFrameSelection('start')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    frameSelection === 'start'
                      ? 'bg-brand-highlight text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Start Frame
                </button>
                <button
                  type="button"
                  onClick={() => setFrameSelection('end')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    frameSelection === 'end'
                      ? 'bg-brand-highlight text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  End Frame
                </button>
              </div>
            </div>
          )}

          {/* Animate Checkbox for Images */}
          {isImage && (
            <div className="flex items-center space-x-2">
              <input
                id="animate-checkbox"
                type="checkbox"
                checked={animateImage}
                onChange={(e) => setAnimateImage(e.target.checked)}
                className="w-4 h-4 text-brand-highlight bg-gray-900 border-gray-600 rounded focus:ring-brand-highlight focus:ring-2"
                disabled={isGenerating}
              />
              <label htmlFor="animate-checkbox" className="text-sm font-medium text-gray-300">
                Animate this ({animateImage ? '+50 credits' : 'turn into video'})
              </label>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Remix Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want to remix this..."
              className="w-full bg-gray-900 rounded-lg text-white placeholder:text-gray-500 border border-gray-700 focus:border-brand-highlight focus:outline-none p-3 min-h-[100px] resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Generate Button */}
          <div className="flex justify-center sm:justify-end">
            {hasEnoughCredits ? (
              <Button
                onClick={generateRemix}
                disabled={!prompt.trim() || isGenerating}
                variant="accentBrand"
                className="w-full sm:w-auto sm:min-w-[120px]"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <Spinner customClasses="h-4 w-4" color="#000000" />
                    <span>Generating...</span>
                  </div>
                ) : (
                  `Generate (${creditsNeeded} credits)`
                )}
              </Button>
            ) : (
              <Button
                onClick={() => openSwapToGenerateModal({
                  creditsNeeded,
                  onSuccess: () => {
                    refetchCredits();
                    generateRemix();
                  },
                })}
                variant="accentBrand"
                className="w-full sm:w-auto"
              >
                Swap to Generate
              </Button>
            )}
          </div>

          {/* Credits Display */}
          <div className="text-xs text-gray-500 text-center">
            Credits: {creditBalance?.creditsRemaining?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>
    </div>
  );
}