import { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import { z } from "zod";

import { Tooltip } from "@src/components/Tooltip";
import { Button } from "@src/components/Button";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { Subtitle } from "@src/styles/text";
import { InfoOutlined } from "@mui/icons-material";
import { generatePreview, ImageRequirement, Preview, Template, ELEVENLABS_VOICES } from "@src/services/madfi/studio";
import { useVeniceImageOptions, imageModelDescriptions } from "@src/hooks/useVeniceImageOptions";
import SelectDropdown from "@src/components/Select/SelectDropdown";
import { resumeSession } from "@src/hooks/useLensLogin";
import { brandFont } from "@src/fonts/fonts";

type CreatePostProps = {
  template: Template;
  preview?: Preview;
  setPreview: (p: Preview) => void;
  next: (templateData: any) => void;
  finalTemplateData?: any;
  postContent?: string;
  setPostContent: (s: string) => void;
  postImage?: any;
  setPostImage: (i: any) => void;
  isGeneratingPreview: boolean;
  setIsGeneratingPreview: (b: boolean) => void;
};

const CreatePostForm = ({
  template,
  preview,
  setPreview,
  next,
  finalTemplateData,
  postContent,
  setPostContent,
  postImage,
  setPostImage,
  isGeneratingPreview,
  setIsGeneratingPreview,
}: CreatePostProps) => {
  const { data: veniceImageOptions, isLoading: isLoadingVeniceImageOptions } = useVeniceImageOptions();
  const [templateData, setTemplateData] = useState(finalTemplateData || {});

  useEffect(() => {
    if (finalTemplateData) {
      setTemplateData(finalTemplateData);
    }
  }, [finalTemplateData]);

  const isValid = () => {
    try {
      template.templateData.form.parse(templateData);
      if (template.options?.requireContent && !postContent) return false;
      if (template.options?.imageRequirement === ImageRequirement.REQUIRED && !postImage?.length) return false;
      return true;
    } catch (error) {
      // console.log(error);
    }

    return false;
  }

  const _generatePreview = async () => {
    const sessionClient = await resumeSession(true);
    if (!sessionClient) return;

    const creds = await sessionClient.getCredentials();

    let idToken;
    if (creds.isOk()) {
      idToken = creds.value?.idToken;
    } else {
      toast.error("Must be logged in");
    }

    setIsGeneratingPreview(true);
    let toastId = toast.loading("Generating preview...");

    try {
      const res = await generatePreview(
        template.apiUrl,
        idToken,
        template,
        templateData,
        template.options?.imageRequirement !== ImageRequirement.NONE && postImage?.length ? postImage[0] : undefined
      );
      if (!res) throw new Error();
      const { agentId, preview } = res;

      if (!preview) throw new Error("No preview");
      console.log("setting preview", preview)
      setPreview({
        ...preview,
        text: preview.text || postContent,
        agentId,
      } as Preview);

      toast.success("Done", { id: toastId });
    } catch (error) {
      if (error instanceof Error && error.message === "not enough credits") {
        toast.error("Not enough credits to generate preview", { id: toastId, duration: 5000 });
      } else if (error instanceof Error && error.message === "max free previews") {
        toast.error("Reached limit on free previews for the hour", { id: toastId, duration: 5000 });
      } else {
        toast.error("Failed to generate preview", { id: toastId });
      }
    }

    setIsGeneratingPreview(false);
  }

  const handleNext = () => {
    if ((postContent || (postImage?.length && !preview?.image))) {
      setPreview({
        text: postContent || "",
        image: postImage?.length ? postImage[0] : undefined,
        imagePreview: postImage?.length ? postImage[0].preview : undefined,
        video: preview?.video,
        agentId: preview?.agentId
      });
    }
    next(templateData);
  }

  const sharedInputClasses = 'bg-card-light rounded-lg text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm';

  return (
    <form
      className="mt-5 mx-auto md:w-[2/3] w-full space-y-4 divide-y divide-dark-grey"
      style={{
        fontFamily: brandFont.style.fontFamily,
      }}
    >
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-y-5 gap-x-8">
          {
            isLoadingVeniceImageOptions
              ? <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#5be39d" /></div>
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
              />
          }
        </div>
        <div className="pt-4 flex flex-col gap-2 justify-center items-center">
          {template.options.allowPreview && (
            <Button size='md' disabled={isGeneratingPreview || !isValid()} onClick={_generatePreview} variant={!preview ? "accentBrand" : "dark-grey"} className="w-full hover:bg-bullish">
              Generate Preview
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
}) => {
  const { models, stylePresets } = veniceImageOptions || {};
  const removeImageModelOptions = !!postImage?.length;

  // Format options for SelectDropdown
  const modelOptions = useMemo(() => {
    if (!models) return [];
    return [{
      // label: "Image Models",
      options: [
        { value: "", label: "Default" },
        ...models.map(model => ({
          value: model,
          label: `${model}: ${imageModelDescriptions[model]}`,
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
          <Tooltip message={fieldDescription} direction="right">
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
      {template.options?.requireContent && (
        <div className="space-y-2">
          <FieldLabel label={"Post content"} fieldDescription={"Set the starting content. Updates to your post could change it."} />
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className={`${sharedInputClasses} w-full min-h-[100px] p-3`}
          />
        </div>
      )}

      {/* Post image */}
      {template.options?.imageRequirement !== ImageRequirement.NONE && (
        <div className="space-y-2">
          <FieldLabel
            label={"Post image"}
            fieldDescription={
              template.options.imageRequirement === ImageRequirement.REQUIRED
                ? "An image is required for this post."
                : "Optionally add an image to your post."
            }
          />
          <ImageUploader files={postImage} setFiles={setPostImage} maxFiles={1} />
        </div>
      )}

      {Object.entries(shape).map(([key, field]) => {
        // normalize snakecase and camelcase
        const label = key.replace('_', ' ').replace(/([A-Z])/g, ' $1').charAt(0).toUpperCase() + key.replace('_', ' ').replace(/([A-Z])/g, ' $1').slice(1)
        const isRequired = !field.isOptional();

        if (key === 'modelId' && (!modelOptions?.length || removeImageModelOptions)) return null;
        if (key === 'stylePreset' && (!modelOptions?.length || removeImageModelOptions)) return null;

        return (
          <div key={key} className="space-y-2">
            <FieldLabel label={label} fieldDescription={field.description} />

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
            ) : field instanceof z.ZodString || (field instanceof z.ZodOptional && field._def.innerType instanceof z.ZodNullable && field._def.innerType._def.innerType instanceof z.ZodString) ? (
              (field instanceof z.ZodString ? field : field._def.innerType._def.innerType)._def.checks?.some(check => check.kind === 'max') ? (
                <textarea
                  value={templateData[key] || ''}
                  onChange={(e) => updateField(key, e.target.value || undefined)}
                  className={`${sharedInputClasses} w-full min-h-[100px] p-3`}
                  maxLength={(field instanceof z.ZodString ? field : field._def.innerType._def.innerType)._def.checks.find(check => check.kind === 'max')?.value}
                />
              ) : (
                <input
                  type="text"
                  value={templateData[key] || ''}
                  onChange={(e) => updateField(key, e.target.value || undefined)}
                  className={`${sharedInputClasses} w-full p-3`}
                />
              )
            ) : field instanceof z.ZodNumber && (
              <input
                type="number"
                value={templateData[key] || ''}
                onChange={(e) => updateField(key, parseFloat(e.target.value))}
                className={`${sharedInputClasses} w-full p-3`}
              />
            )}

            {field instanceof z.ZodBoolean && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={templateData[key] || false}
                  onChange={(e) => updateField(key, e.target.checked)}
                  className="h-4 w-4 text-brand-highlight rounded border-dark-grey focus:ring-brand-highlight"
                />
                <label className="ml-2 text-sm text-secondary">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CreatePostForm;
