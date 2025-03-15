import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { z } from "zod";

import { Tooltip } from "@src/components/Tooltip";
import { Button } from "@src/components/Button";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { Subtitle } from "@src/styles/text";
import { InfoOutlined } from "@mui/icons-material";
import { generatePreview, Preview, Template } from "@src/services/madfi/studio";
import { useVeniceImageOptions, imageModelDescriptions} from "@src/hooks/useVeniceImageOptions";
import SelectDropdown from "@src/components/Select/SelectDropdown";
import { resumeSession } from "@src/hooks/useLensLogin";
import { inter } from "@src/fonts/fonts";

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
}: CreatePostProps) => {
  const { data: veniceImageOptions, isLoading: isLoadingVeniceImageOptions } = useVeniceImageOptions();
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [templateData, setTemplateData] = useState(finalTemplateData || {});

  const isValid = () => {
    try {
      template.templateData.form.parse(templateData);
      if (template.options?.requireContent && !postContent) return false;
      if (template.options?.requireImage && !postImage?.length) return false;
      return true;
    } catch (error) {
      // console.log(error);
    }

    return false;
  }

  const _generatePreview = async () => {
    const sessionClient = await resumeSession();
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
      const res = await generatePreview(template.apiUrl, idToken, template, templateData);
      if (!res) throw new Error();
      const { agentId, preview } = res;

      if (!preview) throw new Error("No preview");
      console.log("setting preview", preview)
      setPreview({
        ...preview,
        agentId,
      } as Preview);

      toast.success("Done", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate preview", { id: toastId });
    }

    setIsGeneratingPreview(false);
  }

  const handleNext = () => {
    if ((postContent || postImage?.length)) {
      setPreview({
        text: postContent || "",
        image: postImage?.length ? postImage[0] : undefined,
        imagePreview: postImage[0].preview
      });
    }
    next(templateData);
  }

  const sharedInputClasses = 'bg-card-light rounded-xl text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm';

  return (
    <form
      className="mt-5 mx-auto md:w-[2/3] w-full space-y-4 divide-y divide-dark-grey"
      style={{
        fontFamily: inter.style.fontFamily,
      }}
    >
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-y-5 gap-x-8">
          {
            isLoadingVeniceImageOptions
              ? <div className="flex justify-center"><Spinner customClasses="h-6 w-6" color="#E42101" /></div>
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
          <Button size='md' disabled={isGeneratingPreview || !isValid()} onClick={handleNext} variant={!template.options.allowPreview || !!preview ? "accentBrand" : "dark-grey"} className="w-full hover:bg-bullish">
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
  const shape = template.templateData.form.shape;

  const FieldLabel = ({ label, fieldDescription }) => (
    <div className="flex items-center gap-1">
      <Subtitle className="text-white/70">
        {label}
      </Subtitle>
      {fieldDescription && (
        <div className="text-sm inline-block">
          <Tooltip message={fieldDescription} direction="right">
            <InfoOutlined
              className="max-w-4 max-h-4 -mt-[2px] inline-block text-white/40"
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
      {template.options?.requireImage && (
        <div className="space-y-2">
          <FieldLabel label={"Post image"} fieldDescription={"Set the starting image. Updates to your post could change it."} />
          <ImageUploader files={postImage} setFiles={setPostImage} maxFiles={1} />
        </div>
      )}

      {Object.entries(shape).map(([key, field]) => {
        // normalize snakecase and camelcase
        const label = key.replace('_', ' ').replace(/([A-Z])/g, ' $1').charAt(0).toUpperCase() + key.replace('_', ' ').replace(/([A-Z])/g, ' $1').slice(1)
        const isRequired = !field.isOptional();

        return (
          <div key={key} className="space-y-2">
            <FieldLabel label={label} fieldDescription={field.description} />

            {/* Special handling for modelId and stylePreset using SelectDropdown */}
            {key === 'modelId' && models ? (
              <SelectDropdown
                options={modelOptions}
                onChange={(option) => updateField(key, option.value)}
                value={modelOptions[0].options.find(opt => opt.value === templateData[key]) || modelOptions[0].options[0]}
                isMulti={false}
                zIndex={1001}
              />
            ) : key === 'stylePreset' && stylePresets ? (
              <SelectDropdown
                options={styleOptions}
                onChange={(option) => updateField(key, option.value)}
                value={styleOptions[0].options.find(opt => opt.value === templateData[key]) || styleOptions[0].options[0]}
                isMulti={false}
                zIndex={1001}
              />
            ) : field instanceof z.ZodString && (
              field._def.maxLength ? (
                <textarea
                  value={templateData[key] || ''}
                  onChange={(e) => updateField(key, e.target.value || undefined)}
                  className={`${sharedInputClasses} w-full min-h-[100px] p-3`}
                  maxLength={field._def.maxLength?.value}
                />
              ) : (
                <input
                  type="text"
                  value={templateData[key] || ''}
                  onChange={(e) => updateField(key, e.target.value || undefined)}
                  className={`${sharedInputClasses} w-full p-3`}
                />
              )
            )}

            {field instanceof z.ZodNumber && (
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
                  className="h-4 w-4 text-primary rounded border-dark-grey focus:ring-primary"
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
