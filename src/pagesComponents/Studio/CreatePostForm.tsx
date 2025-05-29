import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { z } from "zod";
import imageCompression from "browser-image-compression";
import { AutoFixHigh as MagicWandIcon } from "@mui/icons-material";
import { enhancePrompt } from "@src/services/madfi/studio";
import { resumeSession } from "@src/hooks/useLensLogin";

import { Tooltip } from "@src/components/Tooltip";
import { Button } from "@src/components/Button";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { Tune as TuneIcon } from "@mui/icons-material";
import { Subtitle } from "@src/styles/text";
import { InfoOutlined, ExpandMore, ExpandLess } from "@mui/icons-material";
import { generatePreview, MediaRequirement, Preview, Template, ELEVENLABS_VOICES, type NFTMetadata } from "@src/services/madfi/studio";
import { useVeniceImageOptions, imageModelDescriptions } from "@src/hooks/useVeniceImageOptions";
import SelectDropdown from "@src/components/Select/SelectDropdown";
import { brandFont } from "@src/fonts/fonts";
import type { AspectRatio } from "@src/components/ImageUploader/ImageUploader";
import WhitelistedNFTsSection from '../Dashboard/WhitelistedNFTsSection';
import type { AlchemyNFTMetadata } from "@src/hooks/useGetWhitelistedNFTs";
import { useGetCredits } from "@src/hooks/useGetCredits";
import { useAccount } from "wagmi";
import { useTopUpModal } from "@src/context/TopUpContext";
import { AudioUploader } from "@src/components/AudioUploader/AudioUploader";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";

type CreatePostProps = {
  template: Template;
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
  setIsGeneratingPreview: (b: boolean) => void;
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
  setIsGeneratingPreview,
  roomId,
  postAudio,
  setPostAudio,
  audioStartTime,
  setAudioStartTime,
  tooltipDirection,
  remixToken,
  remixPostId,
}: CreatePostProps) => {
  const { address, isConnected, chain } = useAccount();
  const { data: veniceImageOptions, isLoading: isLoadingVeniceImageOptions } = useVeniceImageOptions();
  const { data: creditBalance, refetch: refetchCredits } = useGetCredits(address as string, isConnected);
  const { openTopUpModal, openSwapToGenerateModal } = useTopUpModal();
  const [templateData, setTemplateData] = useState(finalTemplateData || {});
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>("1:1");
  const [selectedNFT, setSelectedNFT] = useState<AlchemyNFTMetadata | undefined>();
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedText, setEnhancedText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const textareaRef = useAutoGrow(prompt || '');

  useEffect(() => {
    if (finalTemplateData) {
      setTemplateData(finalTemplateData);
    }
  }, [finalTemplateData]);

  const isValid = () => {
    try {
      if (!prompt) template.templateData.form.parse(templateData);
      // if (template.options?.requireContent && !postContent) return false;
      if (template.options?.imageRequirement === MediaRequirement.REQUIRED && !postImage?.length) return false;
      if (template.options?.nftRequirement === MediaRequirement.REQUIRED && !selectedNFT) return false;
      if (template.options?.audioRequirement === MediaRequirement.REQUIRED && !postAudio) return false;
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

  const _generatePreview = async () => {
    const { data: _creditBalance } = await refetchCredits();
    const creditsNeeded = estimatedCost || 0;
    const hasEnoughCredits = (_creditBalance?.creditsRemaining || 0) >= creditsNeeded;

    if (!hasEnoughCredits) {
      // For remix, show the swap modal instead - fix chain.network to chain.name
      const chainIdentifier = chain?.name?.toLowerCase().includes("lens") ? "lens" : "base";
      const _token = remixToken || {
        symbol: "BONSAI",
        address: PROTOCOL_DEPLOYMENT[chainIdentifier].Bonsai,
        chain: chainIdentifier,
      }
      openSwapToGenerateModal({
        token: _token,
        postId: remixPostId,
        creditsNeeded: creditsNeeded,
        onSuccess: () => {
          _generatePreview();
        }
      });
      return;
    }

    const sessionClient = await resumeSession(true);
    if (!sessionClient) return;

    const creds = await sessionClient.getCredentials();

    let idToken;
    if (creds.isOk()) {
      idToken = creds.value?.idToken;
    } else {
      toast.error("Must be logged in");
      return;
    }

    if (template.options?.nftRequirement === MediaRequirement.REQUIRED && !selectedNFT?.image?.croppedBase64) {
      toast.error("Failed to parse NFT image");
      return;
    }

    setIsGeneratingPreview(true);
    let toastId = toast.loading("Generating - this could take a minute...");

    try {
      // Compress the NFT image if it exists
      let compressedNFTImage = selectedNFT?.image?.croppedBase64;
      if (selectedNFT?.image?.croppedBase64) {
        try {
          // Convert base64 to blob
          const base64Response = await fetch(selectedNFT.image.croppedBase64);
          const blob = await base64Response.blob();
          const file = new File([blob], 'nft.png', { type: 'image/png' });

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

      // Fix audio type issue - only pass if it's a File
      const audioParam = template.options?.audioRequirement !== MediaRequirement.NONE && postAudio && postAudio instanceof File ? {
        file: postAudio,
        startTime: audioStartTime || 0
      } : undefined;

      const res = await generatePreview(
        template.apiUrl,
        idToken,
        template,
        templateData,
        prompt,
        template.options?.imageRequirement !== MediaRequirement.NONE && postImage?.length ? postImage[0] : undefined,
        selectedAspectRatio,
        !!selectedNFT ? {
          tokenId: selectedNFT.tokenId,
          contract: {
            address: selectedNFT.contract.address,
            network: selectedNFT.network
          },
          collection: { name: selectedNFT.collection?.name },
          image: compressedNFTImage as string,
          attributes: selectedNFT.raw?.metadata?.attributes
        } : undefined,
        roomId,
        audioParam
      );

      if (!res) throw new Error("No result from generatePreview");
      const { agentId, preview, roomId: newRoomId } = res;

      if (!preview) throw new Error("No preview");

      // Set both the template data and preview
      setPreview({
        ...preview,
        text: preview.text || prompt || postContent,
        agentId,
        roomId: newRoomId,
        templateData,
      } as Preview);

      toast.success("Done", { id: toastId });
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error("Failed to generate preview", { id: toastId });
    } finally {
      setIsGeneratingPreview(false);
    }
  }

  const _enhancePrompt = async () => {
    if (!prompt) {
      toast.error("Please enter a prompt first");
      return;
    }

    const sessionClient = await resumeSession(true);
    if (!sessionClient) return;

    const creds = await sessionClient.getCredentials();
    let idToken;
    if (creds.isOk()) {
      idToken = creds.value?.idToken;
    } else {
      toast.error("Must be logged in");
      return;
    }

    setIsEnhancing(true);
    let toastId = toast.loading("Enhancing your prompt...");

    try {
      const enhanced = await enhancePrompt(template.apiUrl, idToken, template, prompt);
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
    if ((prompt || postContent || (postImage?.length && !preview?.image))) {
      setPreview({
        text: prompt || postContent || "",
        image: postImage?.length ? postImage[0] : preview?.image,
        imagePreview: postImage?.length ? postImage[0].preview : preview?.image,
        video: preview?.video,
        agentId: preview?.agentId
      });
    }
    next(templateData);
  }

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
    template.options?.audioRequirement && template.options?.audioRequirement !== MediaRequirement.NONE,
    ...availableFields
  ].filter(Boolean).length;

  return (
    <form
      className="mx-auto md:w-[2/3] w-full space-y-4"
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <div className="space-y-2">
        {/* Main Prompt Input */}
        <div className="relative">
          <div className="flex flex-col">
            <textarea
              ref={textareaRef}
              placeholder="What do you want to create?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={`${sharedInputClasses} w-full min-h-[50px] p-4 resize-none`}
            />
            <div className="flex self-end -mt-8 mr-2 w-[32px]">
              <Tooltip message="Enhance your prompt with AI" direction={tooltipDirection || "top"}>
                <button
                  type="button"
                  onClick={_enhancePrompt}
                  disabled={isEnhancing || isAnimating || !prompt}
                  className="p-1 text-secondary/70 transition-colors disabled:opacity-50 enabled:hover:text-brand-highlight"
                >
                  <MagicWandIcon sx={{ fontSize: 16 }} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Collapsible Options Drawer */}
        {totalOptions > 0 && (
          <div className="bg-card-light rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-dark-grey/20 transition-colors duration-200 text-left"
            >
              <div className="flex items-center gap-4">
                <Subtitle className="text-white/80">
                  <TuneIcon className="h-4 w-4 mr-4" />
                  Advanced
                </Subtitle>
              </div>
              {isDrawerExpanded ? (
                <ExpandLess className="h-5 w-5 text-white/60" />
              ) : (
                <ExpandMore className="h-5 w-5 text-white/60" />
              )}
            </button>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isDrawerExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 pb-4 pt-4 border-t border-dark-grey/30">
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
                    />
                }
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 flex flex-col gap-2 justify-center items-center">
          {template.options.allowPreview && (
            <Button size='md' disabled={isGeneratingPreview || !isValid()} onClick={_generatePreview} variant={!preview ? "accentBrand" : "dark-grey"} className="w-full hover:bg-bullish">
              {
                (creditBalance?.creditsRemaining || 0) >= (estimatedCost) ? `Generate (~${estimatedCost.toFixed(2)} credits)` : `Swap to Generate`
              }
            </Button>
          )}
          <Button size='md' disabled={isGeneratingPreview || !isValid() || (template.options.allowPreview && !preview)} onClick={handleNext} variant={!template.options.allowPreview || !!preview ? "accentBrand" : "dark-grey"} className="w-full hover:bg-bullish">
            Next
          </Button>
        </div>
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
}) => {
  const { models, stylePresets } = veniceImageOptions || {};
  const removeImageModelOptions = !!postImage?.length && template.options.imageRequirement !== MediaRequirement.REQUIRED;

  // Format options for SelectDropdown
  const modelOptions = useMemo(() => {
    if (!models) return [];
    return [{
      // label: "Image Models",
      options: [
        { value: "", label: "Default" },
        ...models.map(model => ({
          value: model,
          label: `${model}: ${imageModelDescriptions[model] || ''}`,
        }))
      ]
    }];
  }, [models]);

  const styleOptions = useMemo(() => {
    if (!stylePresets) return [];
    return [{
      // label: "Style Presets",
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

  const FieldLabel = ({ label, fieldDescription }) => (
    <div className="flex items-center gap-1">
      <Subtitle className="text-white/70">
        {label}
      </Subtitle>
      {fieldDescription && (
        <div className="text-sm inline-block mt-1">
          <Tooltip message={fieldDescription} direction={tooltipDirection}>
            <InfoOutlined
              className="max-w-4 max-h-4 inline-block text-white/40"
            />
          </Tooltip>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Post content */}
      {template.options?.requireContent && postContent !== undefined && (
        <div className="space-y-2">
          <FieldLabel label={"Post content"} fieldDescription={"Set the starting content. Updates to your post could change it."} />
          <textarea
            placeholder="What is your post about?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className={`${sharedInputClasses} w-full min-h-[100px] p-3`}
          />
        </div>
      )}

      {/* Post image */}
      {template.options?.imageRequirement && template.options?.imageRequirement !== MediaRequirement.NONE && (
        <div className="space-y-2">
          <FieldLabel
            label={"Post image"}
            fieldDescription={
              template.options.imageRequirement === MediaRequirement.REQUIRED
                ? "An image is required for this post."
                : "Optionally add an image to your post. Otherwise, one will be generated."
            }
          />
          <ImageUploader
            files={postImage}
            setFiles={setPostImage}
            maxFiles={1}
            enableCrop
            selectedAspectRatio={selectedAspectRatio}
            onAspectRatioChange={setSelectedAspectRatio}
          />
        </div>
      )}

      {/* NFT */}
      {template.options?.nftRequirement && template.options?.nftRequirement !== MediaRequirement.NONE && (
        <div className="space-y-2">
          <FieldLabel
            label={"NFT"}
            fieldDescription={
              template.options.nftRequirement === MediaRequirement.REQUIRED
                ? "Select one of your NFTs to use for this post"
                : "Optionally include one of your NFTs in this post"
            }
          />
          <WhitelistedNFTsSection
            setSelectedNFT={setSelectedNFT}
            selectedNFT={selectedNFT}
            selectedAspectRatio={selectedAspectRatio}
            onAspectRatioChange={setSelectedAspectRatio}
            loadRemixNFT={loadRemixNFT}
          />
        </div>
      )}

      {/* Audio */}
      {template.options?.audioRequirement && template.options?.audioRequirement !== MediaRequirement.NONE && (
        <div className="space-y-2">
          <FieldLabel
            label={"Audio Clip"}
            fieldDescription={
              template.options.audioRequirement === MediaRequirement.REQUIRED
                ? "Upload an MP3 file to use in your post and select a clip to use"
                : "Optionally add audio to your post and select a clip to use"
            }
          />
          {
            typeof postAudio === 'string' && postAudio.startsWith('http') ?
              <div className="text-secondary/70 bg-card-light rounded-lg p-3">The original audio clip will be used.</div> :
              <AudioUploader
                file={postAudio}
                setFile={setPostAudio}
                startTime={audioStartTime}
                setStartTime={setAudioStartTime}
                audioDuration={template.options?.audioDuration}
              />
          }
        </div>
      )}

      {Object.entries(shape).map(([key, field]) => {
        const label = key.replace('_', ' ').replace(/([A-Z])/g, ' $1').charAt(0).toUpperCase() + key.replace('_', ' ').replace(/([A-Z])/g, ' $1').slice(1)

        if (key === 'modelId' && (!modelOptions?.length || removeImageModelOptions)) return null;
        if (key === 'stylePreset' && (!modelOptions?.length || removeImageModelOptions)) return null;

        const placeholderRegex = /\[placeholder: (.*?)\]/;
        const placeholderMatch = field.description?.match(placeholderRegex);
        const placeholder = placeholderMatch ? placeholderMatch[1] : '';
        const description = field.description?.replace(placeholderRegex, '') || '';

        return (
          <div key={key} className="space-y-2">
            <FieldLabel label={label} fieldDescription={description} />

            {/* Special handling for dropdown fields */}
            {key === 'modelId' && modelOptions?.length > 0 ? (
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
            ) : getBaseZodType(field) instanceof z.ZodString ? (
              (getBaseZodType(field)._def.checks?.some(check => check.kind === 'max')) ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={templateData[key] || ''}
                    onChange={(e) => updateField(key, e.target.value || undefined)}
                    className={`${sharedInputClasses} w-full p-3 !focus:none pr-20`}
                    maxLength={getBaseZodType(field)._def.checks.find(check => check.kind === 'max')?.value}
                  />
                  <div className="absolute bottom-3 right-3 text-sm text-gray-400/70 select-none pointer-events-none">
                    {(templateData[key] || '').length} /{" "}
                    {getBaseZodType(field)._def.checks.find(check => check.kind === 'max')?.value}
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
            ) : getBaseZodType(field) instanceof z.ZodNumber ? (
              <input
                type="number"
                value={templateData[key] || ''}
                onChange={(e) => updateField(key, parseFloat(e.target.value))}
                className={`${sharedInputClasses} w-full p-3`}
              />
            ) : getBaseZodType(field) instanceof z.ZodBoolean ? (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={templateData[key] || false}
                  onChange={(e) => updateField(key, e.target.checked)}
                  className="h-4 w-4 text-brand-highlight rounded border-dark-grey focus:ring-0 focus:outline-none"
                />
                <label className="ml-2 text-sm text-secondary">
                  Enable
                </label>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default CreatePostForm;
