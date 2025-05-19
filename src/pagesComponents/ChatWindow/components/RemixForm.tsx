import { useEffect, useState } from 'react';
import { Button } from '@src/components/Button';
import CreatePostForm from '@src/pagesComponents/Studio/CreatePostForm';
import type { SmartMedia, Template, TokenData } from '@src/services/madfi/studio';
import { getRegisteredClubInfoByAddress } from '@src/services/madfi/moneyClubs';

type RemixFormProps = {
  template: Template;
  remixMedia: SmartMedia;
  onClose: () => void;
};

export default function RemixForm({ remixMedia, onClose, template }: RemixFormProps) {
  const [preview, setPreview] = useState<any>();
  const [postContent, setPostContent] = useState<string>('');
  const [postImage, setPostImage] = useState<any>();
  const [postAudio, setPostAudio] = useState<File | null>(remixMedia.templateData?.audioData);
  const [audioStartTime, setAudioStartTime] = useState<number>(remixMedia.templateData?.audioStartTime);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [finalTemplateData, setFinalTemplateData] = useState(remixMedia.templateData);
  const [finalTokenData, setFinalTokenData] = useState<TokenData>();

  // set the default form data to use the remixed version
  useEffect(() => {
    if (!!remixMedia) {
      if (remixMedia.token?.address) {
        getRegisteredClubInfoByAddress(remixMedia.token.address, remixMedia.token.chain).then((token) => {
          setFinalTokenData({
            tokenName: token.name,
            tokenSymbol: token.symbol,
            tokenImage: [{ preview: token.image }],
            selectedNetwork: remixMedia.token.chain,
            initialSupply: 0,
          });
        });
      }
    }
  }, [remixMedia]);

  // TODO:
  const handleNext = (templateData: any) => {
    setFinalTemplateData(templateData);
  };

  return (
    <div className="w-full px-[10px] mb-2">
      <div className="border border-dark-grey/50 rounded-lg bg-black/50 p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-medium">Remix this post</h3>
          <Button
            variant="dark-grey"
            size="xs"
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            Close
          </Button>
        </div>
        <CreatePostForm
          template={template}
          finalTemplateData={finalTemplateData}
          preview={preview}
          setPreview={setPreview}
          next={handleNext}
          postContent={postContent}
          setPostContent={setPostContent}
          postImage={postImage}
          setPostImage={setPostImage}
          isGeneratingPreview={isGeneratingPreview}
          setIsGeneratingPreview={setIsGeneratingPreview}
          postAudio={postAudio}
          setPostAudio={setPostAudio}
          audioStartTime={audioStartTime}
          setAudioStartTime={setAudioStartTime}
        />
      </div>
    </div>
  );
}