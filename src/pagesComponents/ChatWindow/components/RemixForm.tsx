import { useEffect, useState, useRef } from 'react';
import { Button } from '@src/components/Button';
import CreatePostForm from '@src/pagesComponents/Studio/CreatePostForm';
import type { SmartMedia, Template, TokenData, Preview } from '@src/services/madfi/studio';
import { getRegisteredClubInfoByAddress } from '@src/services/madfi/moneyClubs';
import { getPost } from '@src/services/lens/posts';
import { fetchTokenMetadata } from '@src/utils/tokenMetadata';
import type { StoryboardClip } from '@pages/studio/create';
import RemixPanel from '@src/components/RemixPanel/RemixPanel';
import { Modal } from '@src/components/Modal';
import toast from 'react-hot-toast';
import { PlayIcon } from '@heroicons/react/solid';
import { ImageUploaderRef } from '@src/components/ImageUploader/ImageUploader';

type RemixFormProps = {
  template?: Template;
  remixMedia: SmartMedia;
  onClose: () => void;
  currentPreview?: Preview;
  setCurrentPreview?: (preview: Preview) => void;
  roomId?: string;
  setRoomId?: (roomId: string) => void;
  localPreviews?: Array<{
    isAgent: boolean;
    createdAt: string;
    content: {
      text?: string;
      preview?: Preview;
      templateData?: string;
    };
  }>;
  setLocalPreviews?: (previews: Array<{
    isAgent: boolean;
    createdAt: string;
    content: {
      text?: string;
      preview?: Preview;
      templateData?: string;
    };
  }>) => void;
  isGeneratingPreview: boolean;
  setIsGeneratingPreview: (b: boolean) => void;
  onGenerateClip?: (prompt: string, templateData: any, clipId?: string) => Promise<Preview>;
};

export default function RemixForm({
  remixMedia,
  onClose,
  template,
  currentPreview,
  setCurrentPreview,
  roomId,
  setRoomId,
  localPreviews = [],
  setLocalPreviews,
  isGeneratingPreview,
  setIsGeneratingPreview,
  onGenerateClip,
}: RemixFormProps) {
  const [preview, setPreview] = useState<Preview | undefined>(currentPreview);
  const [prompt, setPrompt] = useState<string>("");
  const [postContent, setPostContent] = useState<string>("");
  const [postImage, setPostImage] = useState<any>(undefined);
  const [postAudio, setPostAudio] = useState<File | null | string>(null);
  const [audioStartTime, setAudioStartTime] = useState<number>(0);
  const [finalTemplateData, setFinalTemplateData] = useState<any>(remixMedia.templateData || {});
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [finalTokenData, setFinalTokenData] = useState<{
    tokenSymbol: string;
    tokenName: string;
    tokenLogo: string;
  } | undefined>(undefined);
  
  // Initialize storyboard state for complex templateData
  const [storyboardClips, setStoryboardClips] = useState<StoryboardClip[]>([]);
  const [storyboardAudio, setStoryboardAudio] = useState<File | string | null>(null);
  const [storyboardAudioStartTime, setStoryboardAudioStartTime] = useState<number>(0);
  
  // Modal states for clip editing
  const [showRemixPanel, setShowRemixPanel] = useState(false);
  const [editingClip, setEditingClip] = useState<StoryboardClip | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string>("");
  const [showEditPromptModal, setShowEditPromptModal] = useState(false);
  
  // Create ref for image uploader
  const imageUploaderRef = useRef<ImageUploaderRef | null>(null);

  // Check if this is a storyboard post
  const isStoryboardPost = storyboardClips.length > 0;

  // Helper function to get video duration
  const getVideoDuration = (videoUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.addEventListener('loadedmetadata', () => {
        resolve(video.duration || 6); // Default to 6 seconds if duration is 0
      });
      video.addEventListener('error', () => {
        resolve(6); // Default to 6 seconds on error
      });
      video.src = videoUrl;
      video.load();
    });
  };

  // Extract storyboard data from remixMediaTemplateData
  useEffect(() => {
    if (remixMedia.templateData) {
      const templateData = remixMedia.templateData as any;
      
      // Check if this is a storyboard post (has clips array)
      if (templateData.clips && Array.isArray(templateData.clips)) {
        // Convert clips to StoryboardClip format
        const processClips = async () => {
          const clips: StoryboardClip[] = await Promise.all(
            templateData.clips.map(async (clip: any, index: number) => {
              // Get actual video duration if available
              let actualDuration = clip.duration;
              if (!actualDuration && clip.video?.url) {
                try {
                  actualDuration = await getVideoDuration(clip.video.url);
                } catch (error) {
                  console.warn('Failed to get video duration, using default:', error);
                  actualDuration = 6; // Default to 6 seconds instead of 10
                }
              } else if (!actualDuration) {
                actualDuration = 6; // Default to 6 seconds instead of 10
              }
              
              // Create a preview object from the clip data
              const clipPreview: Preview = {
                video: clip.video?.url ? { url: clip.video.url } : clip.video,
                image: clip.image || clip.thumbnail,
                imagePreview: clip.imagePreview || clip.thumbnail,
                text: clip.sceneDescription || clip.text || '',
                agentId: clip.agentId || `clip-${index}`,
                templateName: template?.name || 'unknown',
                templateData: {
                  prompt: clip.prompt || clip.sceneDescription || '',
                  sceneDescription: clip.sceneDescription || '',
                  elevenLabsVoiceId: clip.elevenLabsVoiceId,
                  narration: clip.narration,
                  stylePreset: clip.stylePreset,
                  subjectReference: clip.subjectReference,
                  aspectRatio: clip.aspectRatio,
                  ...clip.templateData
                },
              };

              return {
                id: clip.agentId || `clip-${index}`,
                preview: clipPreview,
                templateData: clipPreview.templateData,
                startTime: clip.startTime || 0,
                endTime: clip.endTime || actualDuration,
                duration: actualDuration,
              };
            })
          );
          
          setStoryboardClips(clips);
          
          // Set the first clip as the current preview if no preview is set
          if (clips.length > 0 && !currentPreview) {
            setPreview(clips[0].preview);
          }
          
          // Set the prompt from the first clip if available
          if (clips.length > 0 && clips[0].templateData.prompt) {
            setPrompt(clips[0].templateData.prompt);
          }
        };
        
        processClips();
      }
      
      // Extract audio data - handle both old and new formats
      if (templateData.audioData) {
        setStoryboardAudio(templateData.audioData.data || templateData.audioData.url || templateData.audioData);
        setStoryboardAudioStartTime(
          typeof templateData.audioStartTime === 'object' && templateData.audioStartTime.$numberDouble
            ? parseFloat(templateData.audioStartTime.$numberDouble)
            : templateData.audioStartTime || 0
        );
      } else if (templateData.audioStartTime !== undefined) {
        // Handle case where there's audioStartTime but no audioData
        setStoryboardAudioStartTime(
          typeof templateData.audioStartTime === 'object' && templateData.audioStartTime.$numberDouble
            ? parseFloat(templateData.audioStartTime.$numberDouble)
            : templateData.audioStartTime || 0
        );
      }
      
      // Set prompt from templateData if available and no clips
      if (templateData.prompt && !templateData.clips) {
        setPrompt(templateData.prompt);
      }
    }
  }, [remixMedia.templateData, template?.name, currentPreview]);

  const handleSetPreview = (preview: Preview) => {
    if (setCurrentPreview) {
      setCurrentPreview(preview);
    }
    if (preview.roomId && preview.roomId !== roomId && setRoomId) {
      setRoomId(preview.roomId);
    }

    // Add both template data and preview messages
    const now = new Date().toISOString();

    if (setLocalPreviews) {
      // First add the template data message
      setLocalPreviews([...localPreviews, {
        isAgent: false,
        createdAt: now,
        content: {
          templateData: JSON.stringify(preview.templateData || {}),
          text: Object.entries(preview.templateData || {}).map(([key, value]) => `${key}: ${value}`).join('\n')
        }
      }]);

      // Then add the preview message
      const newPreviews = [...localPreviews, {
        isAgent: false,
        createdAt: now,
        content: {
          templateData: JSON.stringify(preview.templateData || {}),
          text: Object.entries(preview.templateData || {}).map(([key, value]) => `${key}: ${value}`).join('\n')
        }
      }, {
        isAgent: true,
        createdAt: new Date(Date.parse(now) + 1).toISOString(), // ensure it comes after the template data
        content: {
          preview: preview,
          text: preview.text
        }
      }];
      setLocalPreviews(newPreviews);
    }
  };

  // set the default form data to use the remixed version
  useEffect(() => {
    if (!!remixMedia) {
      if (remixMedia.token?.address) {
        getRegisteredClubInfoByAddress(remixMedia.token.address, remixMedia.token.chain).then((token) => {
          if (!token || !token.name || !token.symbol) {
            fetchTokenMetadata(remixMedia.token.address, remixMedia.token.chain).then((_token) => {
              setFinalTokenData({
                tokenName: _token?.name,
                tokenSymbol: _token?.symbol,
                tokenLogo: _token?.logo,
              });
            })
          } else {
            setFinalTokenData({
              tokenName: token.name,
              tokenSymbol: token.symbol,
              tokenLogo: token.image,
            });
          }
        });
      }

      // Fetch the Lens post and set its image
      if (remixMedia.postId) {
        getPost(remixMedia.postId).then((post) => {
          if ((post as any)?.metadata?.image?.item) {
            // Convert the image URL to a File object
            fetch((post as any)?.metadata?.image?.item)
              .then(res => res.blob())
              .then(blob => {
                const file = Object.assign(new File([blob], 'remix-image.jpg', { type: blob.type }), {
                  preview: URL.createObjectURL(blob)
                });
                setPostImage(file);
              })
              .catch(console.error);
          }
        }).catch(console.error);
      }
    }
  }, [remixMedia]);

  const handleNext = (templateData: any) => {
    setFinalTemplateData(templateData);
  };

  // Handlers for RemixPanel
  const handleAddClip = () => {
    toast("Use the main interface to generate new clips", { icon: '💡' });
  };

  const handleReplaceClip = async (clipId: string) => {
    const clip = storyboardClips.find(c => c.id === clipId);
    if (clip) {
      setEditingClip(clip);
      setEditingPrompt(clip.preview.templateData?.prompt || "");
      setShowEditPromptModal(true);
    }
  };

  const handleEditClip = (clip: StoryboardClip) => {
    setEditingClip(clip);
    setEditingPrompt(clip.preview.templateData?.prompt || "");
    setShowEditPromptModal(true);
  };

  const handlePreviewClip = (clip: StoryboardClip) => {
    setPreview(clip.preview);
    if (setCurrentPreview) {
      setCurrentPreview(clip.preview);
    }
  };

  const handleRegenerateClip = async () => {
    if (!editingClip || !onGenerateClip) return;
    
    setShowEditPromptModal(false);
    setIsGeneratingPreview(true);
    
    try {
      const newPreview = await onGenerateClip(
        editingPrompt || editingClip.preview.templateData?.prompt || "",
        editingClip.templateData,
        editingClip.id
      );
      
      // Update the clip with the new preview
      setStoryboardClips(clips => clips.map(clip => 
        clip.id === editingClip.id 
          ? { 
              ...clip, 
              preview: newPreview,
              templateData: {
                ...clip.templateData,
                prompt: editingPrompt
              }
            }
          : clip
      ));
      
      toast.success("Clip regenerated successfully!");
    } catch (error) {
      console.error('Error regenerating clip:', error);
      toast.error("Failed to regenerate clip");
    } finally {
      setIsGeneratingPreview(false);
      setEditingClip(null);
      setEditingPrompt("");
    }
  };

  // Handler to copy field values from RemixPanel back to the form
  const handleCopyField = (fieldKey: string, value: any) => {
    switch (fieldKey) {
      case 'prompt':
        // Update the main prompt field
        setPrompt(value);
        break;
      case 'sceneDescription':
      case 'stylePreset':
      case 'subjectReference':
      case 'elevenLabsVoiceId':
      case 'narration':
        // Update the template data
        setFinalTemplateData(prev => ({
          ...prev,
          [fieldKey]: value
        }));
        break;
      default:
        // For any other fields, add them to template data
        setFinalTemplateData(prev => ({
          ...prev,
          [fieldKey]: value
        }));
        break;
    }
  };

  return (
    <div className="w-full">
      <div className="border border-dark-grey/50 rounded-lg bg-black/50 p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-brand-highlight font-medium">
            {isStoryboardPost ? 'Remix Storyboard' : 'Remix this post'}
          </h3>
          <div className="flex items-center gap-2">
            {isStoryboardPost && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setShowRemixPanel(true)}
              >
                View Clips ({storyboardClips.length})
              </Button>
            )}
            <Button
              variant="dark-grey"
              size="xs"
              onClick={onClose}
              className="text-white/60 hover:text-white"
            >
              Close
            </Button>
          </div>
        </div>
        
        {!template ? (
          <div className="text-center py-8">
            <p className="text-white/60 mb-4">
              {isStoryboardPost 
                ? "This storyboard post uses a template that isn't currently available."
                : "This post uses a template that isn't currently available."}
            </p>
            <p className="text-white/40 text-sm">
              Template: {remixMedia.template || 'Unknown'}
            </p>
          </div>
        ) : (
          <CreatePostForm
            template={template}
            selectedSubTemplate={template.templateData?.subTemplates?.find((subTemplate: any) => subTemplate.id === (remixMedia.templateData as any)?.subTemplateId) || undefined}
            finalTemplateData={finalTemplateData}
            preview={preview}
            setPreview={handleSetPreview}
            next={handleNext}
            postContent={postContent}
            setPostContent={setPostContent}
            prompt={prompt}
            setPrompt={setPrompt}
            postImage={postImage}
            setPostImage={setPostImage}
            isGeneratingPreview={isGeneratingPreview}
            postAudio={postAudio}
            setPostAudio={setPostAudio}
            audioStartTime={audioStartTime}
            setAudioStartTime={setAudioStartTime}
            roomId={roomId}
            tooltipDirection="top"
            remixToken={finalTokenData ? {
              address: remixMedia.token.address,
              symbol: finalTokenData.tokenSymbol,
              chain: remixMedia.token.chain
            } : undefined}
            remixPostId={remixMedia.postId}
            remixMediaTemplateData={remixMedia.templateData}
            onClose={onClose}
            storyboardClips={storyboardClips}
            setStoryboardClips={setStoryboardClips}
            storyboardAudio={storyboardAudio}
            setStoryboardAudio={setStoryboardAudio}
            storyboardAudioStartTime={storyboardAudioStartTime}
            setStoryboardAudioStartTime={setStoryboardAudioStartTime}
            creditBalance={creditBalance}
            refetchCredits={() => {}}
            imageUploaderRef={imageUploaderRef}
            generatePreview={(prompt, templateData, image, aspectRatio, nft, audio) => {
              // For remix, we typically don't regenerate previews within the form
              // but this could be implemented if needed
              console.log('Generate preview called in remix form', { prompt, templateData });
            }}
          />
        )}
      </div>

      {/* Remix Panel Modal */}
      <Modal
        open={showRemixPanel}
        onClose={() => setShowRemixPanel(false)}
        setOpen={setShowRemixPanel}
        panelClassnames="!max-w-4xl !max-h-[90vh]"
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Storyboard Clips</h2>
          <RemixPanel
            clips={storyboardClips}
            setClips={setStoryboardClips}
            onAddClip={handleAddClip}
            onReplaceClip={handleReplaceClip}
            onEditClip={handleEditClip}
            onPreviewClip={handlePreviewClip}
            onCopyField={handleCopyField}
            className="max-h-[70vh] overflow-y-auto"
          />
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => setShowRemixPanel(false)}
              variant="primary"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Prompt Modal */}
      <Modal
        open={showEditPromptModal}
        onClose={() => setShowEditPromptModal(false)}
        setOpen={setShowEditPromptModal}
        panelClassnames="!max-w-2xl"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingClip ? 'Edit & Regenerate Clip' : 'Edit Clip'}
          </h3>
          
          {editingClip && (
            <div className="space-y-4">
              {/* Clip Preview */}
              <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                <div className="relative w-24 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                  {editingClip.preview.imagePreview || editingClip.preview.image ? (
                    <img
                      src={editingClip.preview.imagePreview || editingClip.preview.image}
                      alt="Clip preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlayIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white">
                    Clip {storyboardClips.findIndex(c => c.id === editingClip.id) + 1}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Duration: {Math.round(editingClip.endTime - editingClip.startTime)}s
                  </p>
                </div>
              </div>

              {/* Prompt Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Edit Prompt
                </label>
                <textarea
                  value={editingPrompt}
                  onChange={(e) => setEditingPrompt(e.target.value)}
                  className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                  placeholder="Enter the prompt for this clip..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => {
                    setShowEditPromptModal(false);
                    setEditingClip(null);
                    setEditingPrompt("");
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerateClip}
                  variant="primary"
                  disabled={!editingPrompt.trim() || isGeneratingPreview}
                >
                  {isGeneratingPreview ? 'Regenerating...' : 'Regenerate Clip'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}