import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { z } from "zod";
import imageCompression from "browser-image-compression";
import { AutoFixHigh as MagicWandIcon } from "@mui/icons-material";
import { enhancePrompt, composeStoryboard } from "@src/services/madfi/studio";
import { resumeSession } from "@src/hooks/useLensLogin";
import { useAuth } from "@src/hooks/useAuth";
import { Tooltip } from "@src/components/Tooltip";
import { Button } from "@src/components/Button";
import { ImageUploader, ImageUploaderRef } from "@src/components/ImageUploader/ImageUploader";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { Tune as TuneIcon } from "@mui/icons-material";
import { Subtitle } from "@src/styles/text";
import { InfoOutlined, ExpandMore, ExpandLess } from "@mui/icons-material";
import { MediaRequirement, Preview, Template, ELEVENLABS_VOICES, type NFTMetadata, type StoryboardClip } from "@src/services/madfi/studio";
import { useVeniceImageOptions, imageModelDescriptions } from "@src/hooks/useVeniceImageOptions";
import SelectDropdown from "@src/components/Select/SelectDropdown";
import { brandFont } from "@src/fonts/fonts";
import type { AspectRatio } from "@src/components/ImageUploader/ImageUploader";
import WhitelistedNFTsSection from '../Dashboard/WhitelistedNFTsSection';
import type { AlchemyNFTMetadata } from "@src/hooks/useGetWhitelistedNFTs";
import { useGetCredits } from "@src/hooks/useGetCredits";
import { useAccount } from "wagmi";
import { useTopUpModal } from "@src/context/TopUpContext";
import { useIsMiniApp } from "@src/hooks/useIsMiniApp";
import { AudioUploader } from "@src/components/AudioUploader/AudioUploader";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { SparklesIcon } from "@heroicons/react/outline";
import { SafeImage } from "@src/components/SafeImage/SafeImage";
import { RemixStoryboardWrapper } from '@src/components/RemixPanel';
import StoryboardTimeline from "./StoryboardTimeline";
import { omit } from "lodash/object";

type CreatePostProps = {
  template: Template;
  selectedSubTemplate?: any;
  onSubTemplateChange?: (subTemplate: any) => void;
  preview?: Preview;
  setPreview: (p: Preview) => void;
  next: (templateData: any) => void;
  finalTemplateData?: any;
  postContent?: string;
  setPostContent: (s: string) => void;
  prompt?: string;
  setPrompt: (s: string) => void;
  postImage?: any;
  setPostImage: (i: any) => void;
  isGeneratingPreview: boolean;
  generatePreview: (
    prompt: string,
    templateData: any,
    image?: File,
    aspectRatio?: string,
    nft?: NFTMetadata,
    audio?: { file: File, startTime: number }
  ) => void;
  roomId?: string;
  postAudio?: File | null | string;
  setPostAudio: (i: File | null) => void;
  audioStartTime?: number;
  setAudioStartTime: (t: number) => void;
  tooltipDirection?: "right" | "top" | "left" | "bottom";
  remixToken?: {
    address: string;
    symbol: string;
    chain: string;
  };
  remixPostId?: string;
  remixMediaTemplateData?: any;
  onClose?: () => void;
  storyboardClips: StoryboardClip[];
  setStoryboardClips: React.Dispatch<React.SetStateAction<StoryboardClip[]>>;
  storyboardAudio: File | string | null;
  setStoryboardAudio: React.Dispatch<React.SetStateAction<File | string | null>>;
  storyboardAudioStartTime: number;
  setStoryboardAudioStartTime: React.Dispatch<React.SetStateAction<number>>;
  creditBalance?: number;
  refetchCredits: () => void;
  imageUploaderRef: React.RefObject<ImageUploaderRef | null>;
  onCompositionSuccess?: (preview: Preview) => void;
};

function getBaseZodType(field: any) {
  let current = field;
  while (
    current instanceof z.ZodOptional ||
    current instanceof z.ZodNullable
  ) {
    current = current._def.innerType;
  }
  return current;
}

const useAutoGrow = (value: string) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return textareaRef;
};

const CreatePostForm = ({
  template,
  selectedSubTemplate,
  onSubTemplateChange,
  preview,
  setPreview,
  next,
  finalTemplateData,
  postContent,
  setPostContent,
  prompt,
  setPrompt,
  postImage,
  setPostImage,
  isGeneratingPreview,
  generatePreview,
  roomId,
  postAudio,
  setPostAudio,
  audioStartTime,
  setAudioStartTime,
  tooltipDirection,
  remixToken,
  remixPostId,
  remixMediaTemplateData,
  onClose,
  storyboardClips,
  setStoryboardClips,
  storyboardAudio,
  setStoryboardAudio,
  storyboardAudioStartTime,
  setStoryboardAudioStartTime,
  creditBalance,
  refetchCredits,
  imageUploaderRef,
  onCompositionSuccess,
}: CreatePostProps) => {
  const { address, isConnected, chain } = useAccount();
  const { data: veniceImageOptions, isLoading: isLoadingVeniceImageOptions } = useVeniceImageOptions();
  const { openTopUpModal, openSwapToGenerateModal } = useTopUpModal();
  const { isMiniApp } = useIsMiniApp();
  const { getAuthHeaders } = useAuth();
  const [templateData, setTemplateData] = useState(finalTemplateData || {});
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>("9:16");
  const [selectedNFT, setSelectedNFT] = useState<AlchemyNFTMetadata | undefined>();
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [enhancedText, setEnhancedText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const textareaRef = useAutoGrow(prompt || '');
  const previousPromptRef = useRef<string | undefined>(prompt);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    if (finalTemplateData) {
      setTemplateData(finalTemplateData);
    }
  }, [finalTemplateData]);

  // Lock aspect ratio to horizontal when subject reference is present, MAX Mode is enabled, or Veo models are selected
  useEffect(() => {
    const isVeoModelSelected = templateData.forceVideoModel?.startsWith('veo-3.0');
    if ((templateData.subjectReference || templateData.enableMaxMode || isVeoModelSelected) && selectedAspectRatio !== "16:9") {
      setSelectedAspectRatio("16:9");
    }
  }, [templateData.subjectReference, templateData.enableMaxMode, templateData.forceVideoModel, selectedAspectRatio, setSelectedAspectRatio]);

  const isValid = () => {
    try {
      // Check specific media requirements first
      if (template.options?.imageRequirement === MediaRequirement.REQUIRED && !postImage?.length) return false;
      if (template.options?.nftRequirement === MediaRequirement.REQUIRED && !selectedNFT) return false;
      if (template.options?.audioRequirement === MediaRequirement.REQUIRED && !postAudio) return false;
      // if (template.options?.requireContent && !postContent) return false;

      // If we have a prompt, it takes priority over template string field requirements
      if (prompt?.trim()) {
        return true;
      }

      // If no prompt, then validate template data form (for string inputs)
      template.templateData.form.parse(templateData);

      return true;
    } catch (error) {
      // console.log(error);
    }

    return false;
  }

  const estimatedCost = useMemo(() => {
    let credits = template.estimatedCost || 0;
    if (!!templateData.enableVideo) {
      credits += 50; // HACK: this depends on the default model we use in the backend
    }

    return credits;
  }, [template.estimatedCost, templateData.enableVideo]);

  const _generatePreview = async (skipCreditCheck?: boolean) => {
    // Collapse advanced options when generating
    setIsDrawerExpanded(false);
    setIsSubmitting(true);

    const creditsNeeded = estimatedCost || 0;
    const hasEnoughCredits = (creditBalance || 0) >= creditsNeeded;

    if (!skipCreditCheck && !hasEnoughCredits) {
      // Check if we're in remix view
      const isRemixView = !!(remixToken || remixPostId);

      if (isRemixView) {
        // For remix, show the swap modal
        const chainIdentifier = chain?.name?.toLowerCase().includes("lens") ? "lens" : "base";
        const _token = remixToken || {
          symbol: "BONSAI",
          address: PROTOCOL_DEPLOYMENT[chainIdentifier].Bonsai,
          chain: chainIdentifier,
        }
        openSwapToGenerateModal({
          token: _token,
          postId: remixPostId,
          creditsNeeded: Math.ceil(creditsNeeded) + 1,
          refetchCredits,
          onSuccess: () => {
            refetchCredits();
            _generatePreview(true); // Skip credit check since we just purchased credits
          }
        });
      } else {
        // For regular view, show the top up modal
        openTopUpModal("api-credits");
      }
      setIsSubmitting(false);
      return;
    }

    if (template.options?.nftRequirement === MediaRequirement.REQUIRED && !selectedNFT?.image?.croppedBase64) {
      toast.error("Failed to parse NFT image");
      setIsSubmitting(false);
      return;
    }

    try {
      // Compress the NFT image if it exists
      let compressedNFTImage = selectedNFT?.image?.croppedBase64;
      if (selectedNFT?.image?.croppedBase64) {
        try {
          // Convert base64 to blob
          const base64Response = await fetch(selectedNFT.image.croppedBase64);
          const blob = await base64Response.blob();
          const file = new File([blob], 'nft.webp', { type: 'image/webp' });

          // Compress the image
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            preserveExif: true,
          };
          const compressedBlob = await imageCompression(file, options);

          // Convert compressed blob back to base64
          const reader = new FileReader();
          compressedNFTImage = await new Promise<string>((resolve) => {
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(compressedBlob);
          });
        } catch (error) {
          console.error("Error compressing NFT image:", error);
          // Continue with original image if compression fails
        }
      }

      // Fix audio type issue
      let audioParam: { file: File; startTime: number } | undefined = undefined;
      if (template.options?.audioRequirement !== MediaRequirement.NONE && postAudio) {
        let audioFile: File | undefined = undefined;
        if (postAudio instanceof File) {
          audioFile = postAudio;
        } else {
          // It's a string URL or a library object with a URL
          const url = typeof postAudio === 'string' ? postAudio : (postAudio as any).url;
          if (url) {
            const response = await fetch(url);
            const blob = await response.blob();
            const name = typeof postAudio === 'string' ? 'audio.mp3' : (postAudio as any).name || 'audio.mp3';
            audioFile = new File([blob], name, { type: blob.type });
          }
        }
        if (audioFile) {
          audioParam = {
            file: audioFile,
            startTime: templateData.audioStartTime || audioStartTime || 0
          };
        }
      }

      // Include subTemplateId in templateData if a subtemplate is selected
      const finalTemplateData = {
        ...templateData,
        ...(selectedSubTemplate?.id && { subTemplateId: selectedSubTemplate.id })
      };

      const nftMetadata = !!selectedNFT ? {
        tokenId: selectedNFT.tokenId,
        contract: {
          address: selectedNFT.contract.address,
          network: selectedNFT.network
        },
        collection: { name: selectedNFT.collection?.name },
        image: compressedNFTImage as string,
        attributes: selectedNFT.raw?.metadata?.attributes
      } : undefined;

      await generatePreview(
        prompt as string,
        finalTemplateData,
        template.options?.imageRequirement !== MediaRequirement.NONE && postImage?.length ? postImage[0] : undefined,
        selectedAspectRatio,
        nftMetadata,
        audioParam
      );

      toast.success("Generation started", { duration: 5000 });

      // Close the form after successful generation
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to start preview generation");
    } finally {
      setIsSubmitting(false);
    }
  }

  const _enhancePrompt = async () => {
    if (!prompt) {
      toast.error("Please enter a prompt first");
      return;
    }

    const authHeaders = await getAuthHeaders({ isWrite: true });
    // For backward compatibility, extract token from headers if needed
    const idToken = authHeaders['Authorization']?.replace('Bearer ', '') || authHeaders['x-farcaster-session'] || '';

    setIsEnhancing(true);
    let toastId = toast.loading("Enhancing your prompt...");

    try {
      const enhanced = await enhancePrompt(template.apiUrl, authHeaders, template, prompt, templateData);
      if (!enhanced) throw new Error("No enhanced prompt returned");

      // Start animation
      setIsAnimating(true);
      setEnhancedText(enhanced);

      // Animate the text word by word
      const words = enhanced.split(' ');
      let currentText = '';

      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? '' : ' ') + words[i];
        setPrompt(currentText);
        await new Promise(resolve => setTimeout(resolve, 50)); // Adjust speed as needed
      }

      toast.success("Prompt enhanced!", { id: toastId });
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      if (error instanceof Error && error.message === "not enough credits") {
        toast.error("Not enough credits to enhance prompt", { id: toastId });
      } else {
        toast.error("Failed to enhance prompt", { id: toastId });
      }
    } finally {
      setIsEnhancing(false);
      setIsAnimating(false);
    }
  };

  const handleNext = () => {
    if (storyboardClips?.length > 0) {
      if (!preview) {
        // If there's no current preview, set the first clip as the preview
        setPreview(storyboardClips[0].preview);
      }
    } else if ((prompt || postContent || postImage?.length || !preview?.image)) {
      setPreview({
        text: prompt || postContent || "",
        image: preview?.image || (postImage?.length ? postImage[0] : undefined),
        imagePreview: preview?.image || (postImage?.length ? postImage[0].preview : undefined),
        video: preview?.video,
        agentId: preview?.agentId,
        templateName: template.name,
      });
    }
    next(templateData);
  }

  const handleCompose = async () => {
    const authHeaders = await getAuthHeaders({ isWrite: true });

    setIsComposing(true);
    let toastId = toast.loading("Composing video... this might take a minute.");

    try {
      const res = await composeStoryboard(
        template.apiUrl,
        omit(authHeaders, 'Content-Type'),
        storyboardClips,
        storyboardAudio as any,
        storyboardAudioStartTime || 0,
        roomId
      );

      if (!res) throw new Error("No result from composeStoryboard");
      const { agentId, preview, roomId: newRoomId } = res;

      if (!preview) throw new Error("No preview");

      const composedPreview = {
        ...preview,
        text: preview.text || postContent || "",
        agentId,
        roomId: newRoomId,
        templateData,
        templateName: template.name,
      };

      if (onCompositionSuccess) {
        // Call the callback to add to local previews in chat
        onCompositionSuccess(composedPreview);
        toast.success("Composed video added to chat! You can now use it to create your post.", { id: toastId, duration: 5000 });
      } else {
        setPreview(composedPreview);
        // Fallback for non-chat usage (studio)
        toast.success("Done", { id: toastId, duration: 2000 });
        next(templateData); // Move to the next step
      }
    } catch (error) {
      console.error("Error composing storyboard:", error);
      toast.error("Failed to compose storyboard", { id: toastId });
    } finally {
      setIsComposing(false);
    }
  };

  const sharedInputClasses = 'bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm';

  // Count how many form fields there are to show in the drawer header
  const shape = template.templateData.form.shape as Record<string, z.ZodTypeAny>;
  const removeImageModelOptions = !!postImage?.length && template.options.imageRequirement !== MediaRequirement.REQUIRED;
  const availableFields = Object.keys(shape).filter(key => {
    if (key === 'modelId' && (!veniceImageOptions?.models?.length || removeImageModelOptions)) return false;
    if (key === 'stylePreset' && (!veniceImageOptions?.models?.length || removeImageModelOptions)) return false;
    return true;
  });

  const totalOptions = [
    template.options?.imageRequirement && template.options?.imageRequirement !== MediaRequirement.NONE,
    template.options?.nftRequirement && template.options?.nftRequirement !== MediaRequirement.NONE,
    !!postImage?.length, // Add aspect ratio options when image uploader is shown
    !!shape.forceVideoModel, // Add video model selection when available
    !!shape.enableMaxMode, // Add MAX Mode toggle when available
    template.options?.audioRequirement && template.options?.audioRequirement !== MediaRequirement.NONE, // Audio moved to advanced
    ...availableFields
  ].filter(Boolean).length;

  // Get subtemplates from the selected template
  const subTemplates = template?.templateData?.subTemplates || [];
  const hasSubTemplates = subTemplates.length > 0 && !remixMediaTemplateData;

  const handleSubTemplateSelect = (subTemplate: any) => {
    if (onSubTemplateChange) {
      onSubTemplateChange(subTemplate);
    }
  };

  const renderCompactSubTemplateOption = (subTemplate: any) => {
    const isSelected = selectedSubTemplate?.id === subTemplate.id;
    return (
      <div
        key={`subtemplate-${subTemplate.id}`}
        className={`relative flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg border transition-colors cursor-pointer ${
          isSelected
            ? "border-brand-highlight bg-brand-highlight/10"
            : "border-dark-grey hover:border-brand-highlight bg-card-light"
        }`}
        onClick={() =>
          isSelected
            ? handleSubTemplateSelect(undefined)
            : handleSubTemplateSelect(subTemplate)
        }
        tabIndex={0}
        role="button"
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            isSelected
              ? handleSubTemplateSelect(undefined)
              : handleSubTemplateSelect(subTemplate);
          }
        }}
        aria-pressed={isSelected}
      >
        <div className="flex items-center gap-1 md:gap-2 flex-1">
          <div className="w-8 h-8 md:w-12 md:h-12 flex-shrink-0">
            {subTemplate.previewImage ? (
              <SafeImage
                src={subTemplate.previewImage}
                alt={subTemplate.name}
                className="rounded-full"
                width={48}
                height={48}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-highlight/20 rounded-full text-sm md:text-base">🎨</div>
            )}
          </div>
          <span className="text-sm md:text-md text-white/90 truncate">{subTemplate.name}</span>
        </div>
        {isSelected && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              handleSubTemplateSelect(undefined);
            }}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            tabIndex={-1}
            aria-label="Unselect subtemplate"
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  const renderDefaultSubTemplateOption = () => {
    const isSelected = !selectedSubTemplate;

    return (
      <button
        type="button"
        onClick={() => handleSubTemplateSelect(undefined)}
        className={`flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg border transition-colors ${
          isSelected
            ? "border-brand-highlight bg-brand-highlight/10"
            : "border-dark-grey hover:border-brand-highlight bg-card-light"
        }`}
      >
        <div className="w-8 h-8 md:w-12 md:h-12 flex-shrink-0 bg-brand-highlight/20 rounded-full flex items-center justify-center text-sm md:text-md">
          ✏️
        </div>
        <span className="text-xs md:text-sm text-white/90">Default</span>
      </button>
    );
  };

  // Get placeholder text based on selected subtemplate
  const getPlaceholderText = () => {
    return remixMediaTemplateData?.prompt ||
      selectedSubTemplate?.helpText ||
      template.placeholderText ||
      "What do you want to create?";
  };

  const showImageUploader = template.options?.imageRequirement &&
    template.options?.imageRequirement !== MediaRequirement.NONE;

  // Function to check if any advanced fields have values
  const hasAdvancedFieldsWithValues = () => {
    if (!template.templateData?.form?.shape) return false;

    const shape = template.templateData.form.shape as Record<string, z.ZodTypeAny>;
    const removeImageModelOptions = !!postImage?.length && template.options.imageRequirement !== MediaRequirement.REQUIRED;

    // Check each field in the advanced section
    for (const [key, field] of Object.entries(shape)) {
      // Skip fields that are already shown in the main form (same logic as DynamicForm)
      if (key === 'modelId' && (!veniceImageOptions?.models?.length || removeImageModelOptions)) continue;
      if (key === 'stylePreset' && (!veniceImageOptions?.models?.length || removeImageModelOptions)) continue;
      if (template.options?.imageRequirement !== MediaRequirement.NONE && key === 'image') continue;
      if (template.options?.audioRequirement !== MediaRequirement.NONE && key === 'audio') continue;
      if (template.options?.nftRequirement !== MediaRequirement.NONE && key === 'nft') continue;
      if (key === "aspectRatio") continue;

      // Check if this field has a non-empty value
      const value = templateData[key];
      if (value !== undefined && value !== null && value !== '' && value !== false) {
        return true;
      }
    }

    // Also check for forceVideoModel specifically
    if (shape.forceVideoModel && templateData.forceVideoModel) {
      return true;
    }

    // Check for autoEnhance
    if (shape.autoEnhance && templateData.autoEnhance) {
      return true;
    }

    // Check for duration
    if (shape.duration && templateData.duration && templateData.duration !== 6) {
      return true;
    }

    return false;
  };



  return (
    <form
      className="mx-auto w-full space-y-4"
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <div className="space-y-4">
        {/* Storyboard Timeline */}
        {storyboardClips?.length > 0 && (
          <StoryboardTimeline
            clips={storyboardClips}
            setClips={setStoryboardClips}
            audio={storyboardAudio}
            setAudio={setStoryboardAudio}
            audioStartTime={storyboardAudioStartTime}
            setAudioStartTime={setStoryboardAudioStartTime}
            isRemixAudio={!!remixMediaTemplateData?.audioData && typeof storyboardAudio === 'string' && storyboardAudio.startsWith('http')}
          />
        )}

        {/* Compact Subtemplate Selector */}
        {/* {hasSubTemplates && (
          <div className="space-y-2">
            <FieldLabel label="Template" classNames="!text-brand-highlight" />
            <div className="flex flex-wrap gap-1 md:gap-2">
              {subTemplates.map((subTemplate: any) => renderCompactSubTemplateOption(subTemplate))}
            </div>
          </div>
        )} */}

        {/* Prompt Label */}
        <div className="flex items-center justify-between">
          <FieldLabel label={"Prompt"} classNames="!text-brand-highlight" />
        </div>

        {/* Inputs Row: Prompt and Image */}
        <div className="flex flex-row justify-between gap-8">
          {/* Main Prompt Input */}
          <div className={`w-full ${showImageUploader ? 'md:w-4/5 lg:w-4/5' : ''}`}>
            <div className="relative">
              <textarea
                ref={textareaRef}
                placeholder={getPlaceholderText()}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className={`${sharedInputClasses} w-full min-h-[60px] p-4 resize-none`}
              />
              <div className="w-fit self-end -mt-10 ml-auto">
                <Tooltip message="Enhance your prompt with AI" direction={tooltipDirection || "top"}>
                  <button
                    type="button"
                    onClick={_enhancePrompt}
                    disabled={isEnhancing || isAnimating || !prompt || (creditBalance || 0) < 0.25}
                    className="p-2 text-secondary/70 transition-colors disabled:opacity-50 enabled:hover:text-brand-highlight"
                  >
                    <SparklesIcon className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Image Uploader */}
          {showImageUploader && (
            <div className="w-1/5 space-y-1 flex justify-center">
              <ImageUploader
                ref={imageUploaderRef}
                files={postImage}
                setFiles={setPostImage}
                maxFiles={1}
                enableCrop
                selectedAspectRatio={selectedAspectRatio}
                onAspectRatioChange={setSelectedAspectRatio}
                compact
              />
            </div>
          )}
        </div>



        {/* NFT Section */}
        {template.options?.nftRequirement && template.options?.nftRequirement !== MediaRequirement.NONE && (
          <div className="w-full space-y-1">
            <FieldLabel
              label={"NFT"}
              fieldDescription={
                template.options.nftRequirement === MediaRequirement.REQUIRED
                  ? "Select one of your NFTs to use for this post"
                  : "Optionally include one of your NFTs in this post"
              }
              tooltipDirection={tooltipDirection}
            />
            <WhitelistedNFTsSection
              setSelectedNFT={setSelectedNFT}
              selectedNFT={selectedNFT}
              selectedAspectRatio={selectedAspectRatio}
              onAspectRatioChange={setSelectedAspectRatio}
              loadRemixNFT={finalTemplateData?.nft}
            />
          </div>
        )}

        {/* Advanced Options Drawer */}
        {totalOptions > 0 && (
          <div className="bg-card-light rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-dark-grey/20 transition-colors duration-200 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center relative">
                  <Subtitle className="text-white/80">
                    <TuneIcon className="h-4 w-4 mr-4" />
                    Advanced
                  </Subtitle>
                  {hasAdvancedFieldsWithValues() && (
                    <div className="absolute -top-1 -right-3 h-3 w-3 bg-bearish rounded-full" />
                  )}
                </div>
              </div>
              {isDrawerExpanded ? (
                <ExpandLess className="h-5 w-5 text-white/60" />
              ) : (
                <ExpandMore className="h-5 w-5 text-white/60" />
              )}
            </button>

            <div
              className={`transition-all duration-300 ease-in-out ${
                isDrawerExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 pb-4 pt-4 border-t border-dark-grey/30 overflow-visible">
                {
                  isLoadingVeniceImageOptions
                    ? <div className="flex justify-center py-4"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>
                    : <DynamicForm
                        template={template}
                        templateData={templateData}
                        setTemplateData={setTemplateData}
                        sharedInputClasses={sharedInputClasses}
                        veniceImageOptions={veniceImageOptions}
                        postContent={postContent}
                        setPostContent={setPostContent}
                        postImage={postImage}
                        setPostImage={setPostImage}
                        selectedAspectRatio={selectedAspectRatio}
                        setSelectedAspectRatio={setSelectedAspectRatio}
                        selectedNFT={selectedNFT}
                        setSelectedNFT={setSelectedNFT}
                        loadRemixNFT={finalTemplateData?.nft}
                        postAudio={postAudio}
                        setPostAudio={setPostAudio}
                        audioStartTime={audioStartTime || 0}
                        setAudioStartTime={setAudioStartTime}
                        tooltipDirection={tooltipDirection}
                        creditBalance={creditBalance}
                        openTopUpModal={openTopUpModal}
                      />
                }
                {/* Aspect Ratio Options */}
                {showImageUploader && (
                  <div className="space-y-2 mt-4">
                    <FieldLabel
                      label="Aspect Ratio"
                      fieldDescription="Choose the aspect ratio for your image"
                      tooltipDirection={tooltipDirection}
                    />
                    <div className="flex gap-2">
                      {[
                        { ratio: "9:16" as const, label: "Vertical" },
                        { ratio: "16:9" as const, label: "Horizontal" }
                      ].map(({ ratio, label }) => {
                        const isVeoModelSelected = templateData.forceVideoModel?.startsWith('veo-3.0');
                        const isDisabled = !!postImage?.length || !!templateData.subjectReference || !!templateData.enableMaxMode || isVeoModelSelected;
                        return (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => !isDisabled && setSelectedAspectRatio(ratio)}
                            disabled={isDisabled}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                              selectedAspectRatio === ratio
                                ? "border-brand-highlight bg-brand-highlight/10"
                                : "border-dark-grey hover:border-brand-highlight bg-card-light"
                            } ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-dark-grey/20"}`}
                          >
                            <div
                              className={`border border-current rounded-sm ${
                                ratio === "9:16" ? "w-[10px] h-[18px]" : "w-[18px] h-[10px]"
                              }`}
                            />
                            <span className="text-sm text-white/90">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {postImage?.length ? (
                      <p className="text-xs text-secondary/70">
                        Aspect ratio is locked to the selection made during image cropping. Remove the image to change it.
                      </p>
                    ) : (() => {
                        const isVeoModelSelected = templateData.forceVideoModel?.startsWith('veo-3.0');
                        const conditions = [
                          templateData.subjectReference && 'a subject reference image',
                          templateData.enableMaxMode && 'MAX Mode',
                          isVeoModelSelected && 'Veo models'
                        ].filter(Boolean);

                        return conditions.length > 0 ? (
                          <p className="text-xs text-secondary/70">
                            Aspect ratio is locked to horizontal when using {conditions.join(' or ')}
                          </p>
                        ) : null;
                      })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex flex-col gap-2 justify-center items-center">
        {template.options.allowPreview && (
          <Button size='md' disabled={isSubmitting || !isValid()} onClick={() => _generatePreview()} variant={!preview && !isGeneratingPreview ? "accentBrand" : "dark-grey"} className="w-full hover:bg-bullish">
            {
              (creditBalance || 0) >= (estimatedCost)
                ? `Generate`
                : (remixToken || remixPostId)
                  ? `Swap to Generate`
                  : `Top up credits`
            }
          </Button>
        )}
        <Button
          size='md'
          disabled={isGeneratingPreview || isComposing || (storyboardClips?.length === 0 && !preview && (!isValid() || template.options.allowPreview))}
          onClick={storyboardClips?.length > 0 ? handleCompose : handleNext}
          variant={!template.options.allowPreview || !!preview ? "accentBrand" : "primary"}
          className="w-full"
        >
          {isComposing ? 'Composing...' : 'Next'}
        </Button>
      </div>
    </form>
  );
};

/**
 * DynamicForm component that renders form fields based on a Zod schema
 *
 * @component
 * @param {Object} props - Component props
 * @param {Template} props.template - The template object containing the form schema and metadata
 * @param {Record<string, any>} props.templateData - Current form data state
 * @param {Function} props.setTemplateData - Function to update form data state
 * @param {string} props.sharedInputClasses - Common CSS classes for form inputs
 * @param {Object} [props.veniceImageOptions] - Optional configuration for Venice image generation
 * @param {string[]} [props.veniceImageOptions.models] - Available AI models for image generation
 * @param {string[]} [props.veniceImageOptions.stylePresets] - Available style presets for image generation
 */
const DynamicForm = ({
  template,
  templateData,
  setTemplateData,
  sharedInputClasses,
  veniceImageOptions,
  postContent,
  setPostContent,
  postImage,
  setPostImage,
  selectedAspectRatio,
  setSelectedAspectRatio,
  selectedNFT,
  setSelectedNFT,
  loadRemixNFT,
  postAudio,
  setPostAudio,
  audioStartTime,
  setAudioStartTime,
  tooltipDirection,
  creditBalance,
  openTopUpModal,
}: {
  template: Template;
  templateData: Record<string, any>;
  setTemplateData: (data: Record<string, any>) => void;
  sharedInputClasses: string;
  veniceImageOptions?: { models?: string[]; stylePresets?: string[] };
  postContent?: string;
  setPostContent: (s: string) => void;
  postImage?: any;
  setPostImage: (i: any) => void;
  selectedAspectRatio: AspectRatio;
  setSelectedAspectRatio: (ratio: AspectRatio) => void;
  selectedNFT?: AlchemyNFTMetadata;
  setSelectedNFT: (s: AlchemyNFTMetadata) => void;
  loadRemixNFT?: NFTMetadata;
  postAudio?: string | File | null;
  setPostAudio: (i: File | null) => void;
  audioStartTime: number;
  setAudioStartTime: (t: number) => void;
  tooltipDirection?: "right" | "top" | "left" | "bottom";
  creditBalance?: number;
  openTopUpModal: (type?: any, requiredAmount?: any, customHeader?: string, customSubheader?: string) => void;
}) => {
  const { models, stylePresets } = veniceImageOptions || {};
  const removeImageModelOptions = !!postImage?.length && template.options.imageRequirement !== MediaRequirement.REQUIRED;

  // Format options for SelectDropdown
  const modelOptions = useMemo(() => {
    if (!models) return [];
    return [{
      options: [
        { value: "", label: "Default" },
        ...(models.map(model => ({
          value: model,
          label: `${model}: ${imageModelDescriptions[model] || ''}`,
        })).filter(({ label }) => label))
      ]
    }];
  }, [models]);

  const styleOptions = useMemo(() => {
    if (!stylePresets) return [];
    return [{
      options: [
        { value: "", label: "Default" },
        ...stylePresets.map(style => ({
          value: style,
          label: style,
        }))
      ]
    }];
  }, [stylePresets]);

  const updateField = (key: string, value: any) => {
    setTemplateData({
      ...templateData,
      [key]: value
    });
  };

  // Get the shape of the zod object
  const shape = template.templateData.form.shape as Record<string, z.ZodTypeAny>;

  // Skip fields that are already shown in the main form
  const shouldSkipField = (key: string) => {
    if (key === 'modelId' && (!modelOptions?.length || removeImageModelOptions)) return true;
    if (key === 'stylePreset' && (!modelOptions?.length || removeImageModelOptions)) return true;
    if (template.options?.imageRequirement !== MediaRequirement.NONE && key === 'image') return true;
    if (template.options?.nftRequirement !== MediaRequirement.NONE && key === 'nft') return true;
    if (key === 'forceVideoModel') return true; // Skip forceVideoModel as it's rendered with custom UI
    if (key === 'autoEnhance') return true; // Skip autoEnhance as it's rendered with custom UI
    if (key === 'duration') return true; // Skip duration as it's rendered with custom UI
    return false;
  };

  // Helper function to render video model options
  const renderVideoModelOption = (modelValue: string, modelLabel: string) => {
    const isSelected = templateData.forceVideoModel === modelValue;

    const handleModelToggle = () => {
      if (isSelected) {
        updateField('forceVideoModel', undefined);
        // Reset aspect ratio to vertical when deselecting a Veo model if no other constraints
        if (modelValue.startsWith('veo-3.0') && !templateData.subjectReference && !templateData.enableMaxMode && !postImage?.length) {
          setSelectedAspectRatio("9:16");
        }
      } else {
        updateField('forceVideoModel', modelValue);
      }
    };

    return (
      <div
        key={`video-model-${modelValue}`}
        className={`relative flex items-center gap-1 md:gap-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg border transition-colors cursor-pointer ${
          isSelected
            ? "border-brand-highlight bg-brand-highlight/10"
            : "border-dark-grey hover:border-brand-highlight bg-card-light"
        }`}
        onClick={handleModelToggle}
        tabIndex={0}
        role="button"
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleModelToggle();
          }
        }}
        aria-pressed={isSelected}
      >
        <div className="flex items-center gap-1 md:gap-2 flex-1 px-4">
          <span className="text-sm md:text-md text-white/90 truncate">{modelLabel}</span>
        </div>
        {isSelected && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              updateField('forceVideoModel', undefined);
              // Reset aspect ratio to vertical when deselecting a Veo model if no other constraints
              if (modelValue.startsWith('veo-3.0') && !templateData.subjectReference && !templateData.enableMaxMode && !postImage?.length) {
                setSelectedAspectRatio("9:16");
              }
            }}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            tabIndex={-1}
            aria-label="Clear video model selection"
          >
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {Object.entries(shape).map(([key, field]) => {
        if (shouldSkipField(key)) return null;

        const label = key.replace('_', ' ').replace(/([A-Z])/g, ' $1').charAt(0).toUpperCase() + key.replace('_', ' ').replace(/([A-Z])/g, ' $1').slice(1)
        const placeholderRegex = /\[placeholder: (.*?)\]/;
        const placeholderMatch = field.description?.match(placeholderRegex);
        const placeholder = placeholderMatch ? placeholderMatch[1] : '';
        let description = field.description?.replace(placeholderRegex, '') || '';

        const zodType = getBaseZodType(field);
        const isSmallerInput = ["modelId", "stylePreset", "elevenLabsVoiceId"].includes(key) ||
          zodType instanceof z.ZodBoolean ||
          zodType instanceof z.ZodNumber;

        return (
          <div key={key} className="space-y-2">
            <FieldLabel label={label} fieldDescription={description} tooltipDirection={tooltipDirection} />

            {/* Special handling for subject reference image upload */}
            {key === 'subjectReference' ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {templateData[key] && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-card-light">
                      <img
                        src={templateData[key]}
                        alt="Subject reference"
                        className="w-full h-full object-cover"
                      />
                                             <button
                         type="button"
                         onClick={() => {
                           updateField(key, undefined);
                           // Allow aspect ratio selection again when subject reference is removed
                           // Reset to default vertical if no other constraints
                           const isVeoModelSelected = templateData.forceVideoModel?.startsWith('veo-3.0');
                           if (!postImage?.length && !templateData.enableMaxMode && !isVeoModelSelected) {
                             setSelectedAspectRatio("9:16");
                           }
                         }}
                         className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                       >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                                         <input
                       type="file"
                       accept="image/*"
                       onChange={async (e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           // Compress the image before converting to base64
                           try {
                             const options = {
                               maxSizeMB: 1,
                               maxWidthOrHeight: 1024,
                               useWebWorker: true,
                             };
                             const compressedFile = await imageCompression(file, options);

                             const reader = new FileReader();
                             reader.onloadend = () => {
                               updateField(key, reader.result as string);
                               // Lock aspect ratio to horizontal when subject reference is added
                               setSelectedAspectRatio("16:9");
                             };
                             reader.readAsDataURL(compressedFile);
                           } catch (error) {
                             console.error("Error compressing image:", error);
                             // Fallback to original file if compression fails
                             const reader = new FileReader();
                             reader.onloadend = () => {
                               updateField(key, reader.result as string);
                               // Lock aspect ratio to horizontal when subject reference is added
                               setSelectedAspectRatio("16:9");
                             };
                             reader.readAsDataURL(file);
                           }
                         }
                       }}
                      className={`${sharedInputClasses} w-full p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-black hover:file:bg-secondary/80 cursor-pointer`}
                    />
                  </div>
                </div>
              </div>
            ) : /* Special handling for dropdown fields */
            key === 'modelId' && modelOptions?.length > 0 ? (
              <SelectDropdown
                options={modelOptions}
                onChange={(option) => updateField(key, option.value)}
                value={modelOptions[0].options.find(opt => opt.value === templateData[key]) || modelOptions[0].options[0]}
                isMulti={false}
                zIndex={1001}
              />
            ) : key === 'stylePreset' && styleOptions?.length > 0 ? (
              <SelectDropdown
                options={styleOptions}
                onChange={(option) => updateField(key, option.value)}
                value={styleOptions[0].options.find(opt => opt.value === templateData[key]) || styleOptions[0].options[0]}
                isMulti={false}
                zIndex={1001}
              />
            ) : key === 'elevenLabsVoiceId' ? (
              <SelectDropdown
                options={[{ label: 'Voices', options: ELEVENLABS_VOICES }]}
                onChange={(option) => updateField(key, option.value)}
                value={ELEVENLABS_VOICES.find(opt => opt.value === templateData[key]) || ELEVENLABS_VOICES[0]}
                isMulti={false}
                zIndex={1001}
              />
            ) : zodType instanceof z.ZodString ? (
              (zodType._def.checks?.some(check => check.kind === 'max')) ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={templateData[key] || ''}
                    onChange={(e) => updateField(key, e.target.value || undefined)}
                    className={`${sharedInputClasses} w-full p-3 !focus:none pr-20`}
                    maxLength={zodType._def.checks.find(check => check.kind === 'max')?.value}
                  />
                  <div className="absolute bottom-3 right-3 text-sm text-gray-400/70 select-none pointer-events-none">
                    {(templateData[key] || '').length} /{" "}
                    {zodType._def.checks.find(check => check.kind === 'max')?.value}
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder={placeholder}
                  value={templateData[key] || ''}
                  onChange={(e) => updateField(key, e.target.value || undefined)}
                  className={`${sharedInputClasses} w-full p-3`}
                />
              )
            ) : zodType instanceof z.ZodNumber ? (
              <div className="relative">
                <input
                  type="number"
                  value={templateData[key] || ''}
                  onChange={(e) => updateField(key, parseFloat(e.target.value))}
                  className={`${sharedInputClasses} w-full p-3`}
                  placeholder={placeholder}
                />
              </div>
            ) : zodType instanceof z.ZodBoolean ? (
              <div className="relative">
                <div className="flex items-center bg-card-light rounded-lg p-3">
                  <input
                    type="checkbox"
                    checked={templateData[key] || false}
                    onChange={(e) => updateField(key, e.target.checked)}
                    className="h-4 w-4 text-brand-highlight rounded border-dark-grey focus:ring-0 focus:outline-none cursor-pointer"
                  />
                  <label className="ml-2 text-sm text-white/70 cursor-pointer">
                    Enable
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {/* MAX Mode Toggle */}
      {shape.enableMaxMode && (
        <div className="space-y-2">
          <FieldLabel
            label="MAX Mode"
            fieldDescription="Enable MAX Mode for Veo 3 generation with multiple scenes"
            tooltipDirection={tooltipDirection}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const hasEnoughCredits = (creditBalance || 0) >= 3000;

                if (!hasEnoughCredits) {
                  // Show custom top up modal
                  openTopUpModal(
                    "api-credits",
                    undefined,
                    "Unlock MAX Mode",
                    "MAX Mode enables video generation with Veo 3. You need at least 3,000 credits."
                  );
                  return;
                }

                // User has enough credits, toggle MAX mode
                const newMaxModeValue = !templateData.enableMaxMode;
                updateField('enableMaxMode', newMaxModeValue);

                // Reset aspect ratio to vertical when disabling MAX mode if no other constraints
                if (!newMaxModeValue && !templateData.subjectReference && !templateData.forceVideoModel?.startsWith('veo-3.0') && !postImage?.length) {
                  setSelectedAspectRatio("9:16");
                }
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-brand-highlight ${
                templateData.enableMaxMode ? 'bg-brand-highlight/90' : 'bg-dark-grey'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  templateData.enableMaxMode ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Audio Section */}
      {template.options?.audioRequirement && template.options?.audioRequirement !== MediaRequirement.NONE && (
        <div className="space-y-2">
          <FieldLabel
            label="Audio"
            fieldDescription={
              template.options.audioRequirement === MediaRequirement.REQUIRED
                ? "Upload an MP3 file to use in your post and select a clip to use"
                : "Optionally add audio to your post and select a clip to use"
            }
            tooltipDirection={tooltipDirection}
          />
          {typeof postAudio === 'string' && postAudio.startsWith('http') ? (
            <div className="text-secondary/70 bg-card-light rounded-lg p-2 text-sm">The original audio clip will be used.</div>
          ) : (
            <AudioUploader
              file={postAudio}
              setFile={setPostAudio}
              startTime={audioStartTime || 0}
              setStartTime={setAudioStartTime}
              audioDuration={template.options?.audioDuration}
              compact
            />
          )}
        </div>
      )}

      {/* Video Model Selection */}
      {shape.forceVideoModel && !postImage && !templateData.subjectReference && (
        <div className="space-y-2">
          <FieldLabel
            label="Video Model"
            fieldDescription="Use a specific video model for generation"
            tooltipDirection={tooltipDirection}
          />
          <div className="flex flex-wrap gap-1 md:gap-2">
             {renderVideoModelOption('veo-3.0-generate-preview', 'Veo 3')}
             {renderVideoModelOption('veo-3.0-fast-generate-preview', 'Veo 3 Fast')}
             {renderVideoModelOption('MiniMax-Hailuo-02', 'Hailuai')}
           </div>
        </div>
      )}

      {/* Auto Enhance Toggle */}
      {shape.autoEnhance && (
        <div className="space-y-2">
          <FieldLabel
            label="Auto Enhance"
            fieldDescription="Automatically enhance your prompt with AI, finetuned for video generation"
            tooltipDirection={tooltipDirection}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateField('autoEnhance', !templateData.autoEnhance)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-brand-highlight ${
                templateData.autoEnhance ? 'bg-brand-highlight/90' : 'bg-dark-grey'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  templateData.autoEnhance ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Duration Selection (only for Hailuai model) */}
      {shape.duration && templateData.forceVideoModel === 'MiniMax-Hailuo-02' && (
        <div className="space-y-2">
          <FieldLabel
            label="Duration"
            fieldDescription="Select the duration for video generation"
            tooltipDirection={tooltipDirection}
          />
          <div className="flex gap-2">
            {[
              { value: 6, label: "6 seconds" },
              { value: 10, label: "10 seconds" }
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateField('duration', value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  (templateData.duration || 6) === value
                    ? "border-brand-highlight bg-brand-highlight/10"
                    : "border-dark-grey hover:border-brand-highlight bg-card-light"
                } hover:bg-dark-grey/20`}
              >
                <span className="text-sm text-white/90">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface FieldLabelProps {
  label: string;
  fieldDescription?: string;
  tooltipDirection?: "top" | "bottom" | "right" | "left";
  classNames?: string;
  open?: boolean;
}
const FieldLabel = ({ label, fieldDescription, tooltipDirection, classNames, open }: FieldLabelProps) => (
  <div className="flex items-center gap-1">
    <Subtitle className={`text-white/70 ${classNames || ""}`}>
      {label}
    </Subtitle>
    {fieldDescription && (
      <div className="text-sm inline-block mt-1">
        <Tooltip message={fieldDescription} direction={tooltipDirection} open={open}>
          <InfoOutlined
            className="max-w-4 max-h-4 inline-block text-white/40"
          />
        </Tooltip>
      </div>
    )}
  </div>
);

export default CreatePostForm;
