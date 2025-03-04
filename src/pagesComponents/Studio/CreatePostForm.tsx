import { useState, useMemo, useEffect } from "react";
import { useWalletClient, useAccount, useSwitchChain } from "wagmi";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { z } from "zod";

import { Tooltip } from "@src/components/Tooltip";
import { Button } from "@src/components/Button";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { lens } from "@src/services/madfi/utils";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import Spinner from "@src/components/LoadingSpinner/LoadingSpinner";
import { Subtitle } from "@src/styles/text";
import { InfoOutlined } from "@mui/icons-material";
import { generatePreview, Preview, Template } from "@src/services/madfi/studio";
import { useVeniceImageOptions, imageModelDescriptions} from "@src/hooks/useVeniceImageOptions";
import SelectDropdown from "@src/components/Select/SelectDropdown";
import { resumeSession } from "@src/hooks/useLensLogin";
import { AclTemplate } from "@lens-chain/storage-client/import";
import { inter } from "@src/fonts/fonts";

type CreatePostProps = {
  template: Template;
  preview?: Preview;
  setPreview: (p: Preview) => void;
  next: (templateData: any) => void;
  finalTemplateData?: any;
};

const CreatePostForm = ({
  template,
  preview,
  setPreview,
  next,
  finalTemplateData,
}: CreatePostProps) => {
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { chain } = useAccount();
  const { isAuthenticated, authenticatedProfile } = useLensSignIn(walletClient);
  const { data: veniceImageOptions, isLoading: isLoadingVeniceImageOptions } = useVeniceImageOptions();

  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [templateData, setTemplateData] = useState(finalTemplateData || {});
  const [previewId, setPreviewId] = useState<string | undefined>();
  const [postAcl, setPostAcl] = useState<AclTemplate | undefined>();

  const _createPost = async () => {
    if (!isAuthenticated) return;

    setIsPosting(true);
    let toastId;

    if (lens.id !== chain?.id && switchChain) {
      toastId = toast.loading("Switching networks...");
      try {
        await switchChain({ chainId: lens.id });
      } catch {
        toast.error("Please switch networks to create your Lens post");
      }
      toast.dismiss(toastId);
      setIsPosting(false);
      return;
    }

    try {
      // Validate the form data against the schema
      const validatedData = template.templateData.form.parse(templateData);

      // TODO: Handle post creation with validated data

      setPostContent("");
      setPostImage([]);

    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Please fill in all required fields correctly");
      } else {
        console.log(error);
        toast.error("Something went wrong. Please try again later", { id: toastId });
      }
    }

    setIsPosting(false);
  };

  const isValid = () => {
    try {
      template.templateData.form.parse(templateData);
      return true;
    } catch {}

    return false;
  }

  // TODO: lens id token: https://dev-preview.lens.xyz/docs/protocol/authentication#advanced-topics-authentication-tokens-id-token
  const _generatePreview = async () => {
    // const sessionClient = await resumeSession();
    // if (!sessionClient) return;

    // const creds = await sessionClient.getCredentials();
    // console.log(creds);

    // if (creds.isOk()) {
    //   const data = creds.safeUnwrap();
    //   console.log(data);
    // } else {
    //   toast.error("Must be logged in");
    // }

    setIsGeneratingPreview(true);
    let toastId = toast.loading("Generating preview...");

    try {
      const res = await generatePreview("", template, templateData);
      if (!res) throw new Error();
      const { agentId, preview, acl } = res;

      console.log(`preview`, preview);
      setPreview(preview as Preview);
      setPreviewId(agentId);
      setPostAcl(acl);

      toast.success("Done", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate preview", { id: toastId });
    }

    setIsGeneratingPreview(false);
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
                />
          }
        </div>
        <div className="pt-4 flex flex-col gap-2 justify-center items-center">
          {template.options.allowPreview && (
            <Button size='md' disabled={isGeneratingPreview || isPosting || !isValid()} onClick={_generatePreview} variant={!preview ? "accentBrand" : "dark-grey"} className="w-full hover:bg-bullish">
              Generate Preview
            </Button>
          )}
          <Button size='md' disabled={isGeneratingPreview || isPosting || !isValid()} onClick={() => next(templateData)} variant={!template.options.allowPreview || !!preview ? "accentBrand" : "dark-grey"} className="w-full hover:bg-bullish">
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
}: {
  template: Template;
  templateData: Record<string, any>;
  setTemplateData: (data: Record<string, any>) => void;
  sharedInputClasses: string;
  veniceImageOptions?: { models?: string[]; stylePresets?: string[] };
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

  return (
    <div className="space-y-4">
      {Object.entries(shape).map(([key, field]) => {
        // normalize snakecase and camelcase
        const label = key.replace('_', ' ').replace(/([A-Z])/g, ' $1').charAt(0).toUpperCase() + key.replace('_', ' ').replace(/([A-Z])/g, ' $1').slice(1)
        const fieldDescription = field.description;
        const isRequired = !field.isOptional();

        const FieldLabel = () => (
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
          <div key={key} className="space-y-2">
            <FieldLabel />

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
                  onChange={(e) => updateField(key, e.target.value)}
                  className={`${sharedInputClasses} w-full min-h-[100px] p-3`}
                  maxLength={field._def.maxLength?.value}
                />
              ) : (
                <input
                  type="text"
                  value={templateData[key] || ''}
                  onChange={(e) => updateField(key, e.target.value)}
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
