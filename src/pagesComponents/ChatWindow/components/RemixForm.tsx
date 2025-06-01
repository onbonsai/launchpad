import { useEffect, useState } from 'react';
import { Button } from '@src/components/Button';
import CreatePostForm from '@src/pagesComponents/Studio/CreatePostForm';
import type { SmartMedia, Template, TokenData, Preview } from '@src/services/madfi/studio';
import { getRegisteredClubInfoByAddress } from '@src/services/madfi/moneyClubs';
import { getPost } from '@src/services/lens/posts';
import { fetchTokenMetadata } from '@src/utils/tokenMetadata';

type RemixFormProps = {
  template: Template;
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
}: RemixFormProps) {
  const [preview, setPreview] = useState<any>();
  const [postContent, setPostContent] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [postImage, setPostImage] = useState<any>();
  const [postAudio, setPostAudio] = useState<File | null>((remixMedia.templateData as any)?.audioData);
  const [audioStartTime, setAudioStartTime] = useState<number>((remixMedia.templateData as any)?.audioStartTime);
  const [finalTemplateData, setFinalTemplateData] = useState(remixMedia.templateData);
  const [finalTokenData, setFinalTokenData] = useState<TokenData>();

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
                tokenImage: [{ preview: _token?.logo }],
                selectedNetwork: remixMedia.token.chain,
                initialSupply: 0,
              });
            })
          } else {
            setFinalTokenData({
              tokenName: token.name,
              tokenSymbol: token.symbol,
              tokenImage: [{ preview: token.image }],
              selectedNetwork: remixMedia.token.chain,
              initialSupply: 0,
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
                setPostImage([file]); // Wrap in array since ImageUploader expects an array
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

  return (
    <div className="w-full">
      <div className="border border-dark-grey/50 rounded-lg bg-black/50 p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-brand-highlight font-medium">Remix this post</h3>
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
          setPreview={handleSetPreview}
          next={handleNext}
          postContent={postContent}
          setPostContent={setPostContent}
          prompt={prompt}
          setPrompt={setPrompt}
          postImage={postImage}
          setPostImage={setPostImage}
          isGeneratingPreview={isGeneratingPreview}
          setIsGeneratingPreview={setIsGeneratingPreview}
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
        />
      </div>
    </div>
  );
}