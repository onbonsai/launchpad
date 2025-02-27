import { useState, useMemo, useEffect } from "react";
import { useWalletClient, useAccount, useSwitchChain } from "wagmi";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { Dialog } from "@headlessui/react";
import clsx from "clsx";

import { Tooltip } from "@src/components/Tooltip";
import publicationBody from "@src/services/lens/publicationBody";
import { createPostMomoka, createPostOnchain } from "@src/services/lens/createPost";
import { pinFile, pinJson, storjGatewayURL } from "@src/utils/storj";
import { Button } from "@src/components/Button";
import useLensSignIn from "@src/hooks/useLensSignIn";
import { lens } from "@src/services/madfi/utils";
import { ImageUploader } from "@src/components/ImageUploader/ImageUploader";
import { inter } from "@src/fonts/fonts";
import { Subtitle } from "@src/styles/text";
import { InfoOutlined } from "@mui/icons-material";
import { Template, TemplateCategory, TemplateName } from "@src/services/madfi/studio";
import AdventureTimeForm from "./templates/AdventureTimeForm";

type CreatePostProps = {
  template: Template
};

const CreatePostModal = ({
  template,
}: CreatePostProps) => {
  const { query: { source } } = useRouter();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { chain } = useAccount();
  const { isAuthenticated, authenticatedProfile } = useLensSignIn(walletClient);

  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [templateData, setTemplateData] = useState({});

  const _createPost = async () => {
    if (!isAuthenticated) return; // sanity check

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
      // TODO:

      setPostContent("");
      setPostImage([]);
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong. Please try again later", { id: toastId });
    }

    setIsPosting(false);
  };

  const sharedInputClasses = 'bg-card-light rounded-xl text-white text-[16px] tracking-[-0.02em] leading-5 placeholder:text-secondary/70 border-transparent focus:border-transparent focus:ring-dark-grey sm:text-sm';

  return (
    <div className={clsx("flex flex-col md:w-[448px] w-full")}
    style={{
      fontFamily: inter.style.fontFamily,
    }}>
      <div className="flex items-center justify-between">
        <Dialog.Title as="h2" className="text-2xl leading-7 font-bold">
          {template.label}
        </Dialog.Title>
      </div>
      <form
        className="mt-5 mx-auto md:w-[448px] w-full space-y-4 divide-y divide-dark-grey"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-y-5 gap-x-8">
            {template.name === TemplateName.ADVENTURE_TIME && (
              <AdventureTimeForm
                template={template}
                templateData={templateData}
                setTemplateData={setTemplateData}
                sharedInputClasses={sharedInputClasses}
              />
            )}
          </div>
          <div className="pt-8 flex flex-col gap-4 justify-center items-center">
            <Button size='md' disabled={isPosting} onClick={_createPost} variant="accentBrand" className="w-full hover:bg-bullish">
              Create post
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePostModal;
