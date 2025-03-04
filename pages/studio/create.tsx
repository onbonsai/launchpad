import { NextPage } from "next"
import { useRouter } from "next/router";
import { useMemo, useState } from "react"
import { Preview, TEMPLATES, type Template} from "@src/services/madfi/studio";
import CreatePostForm from "@pagesComponents/Studio/CreatePostForm";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import { BodySemiBold, Subtitle } from "@src/styles/text";
import { Tabs } from "@pagesComponents/Studio/Tabs";
import useIsMounted from "@src/hooks/useIsMounted";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { Publication, Theme } from "@madfi/widgets-react";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides } from "@src/components/Publication/PublicationStyleOverrides";
import { CreateTokenForm } from "@pagesComponents/Studio/CreateTokenForm";
import { FinalizePost } from "@pagesComponents/Studio/FinalizePost";

const StudioCreatePage: NextPage = () => {
  const router = useRouter();
  const { template } = router.query;
  const isMounted = useIsMounted();
  const [openTab, setOpenTab] = useState<number>(1);
  const [preview, setPreview] = useState<Preview | undefined>();
  const [finalTemplateData, setFinalTemplateData] = useState({});
  const [finalTokenData, setFinalTokenData] = useState({});
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();

  const selectedTemplate = useMemo(() => {
    if (!isMounted) return;

    if (!template) router.push('/studio');

    const res = TEMPLATES.find(({ name }) => name === template);

    if (!res) router.push('/studio');

    return res;
  }, [template, isMounted]);

  const onCreate = (collectAmount: number) => {
    // 1. create lens post with metadata and ACL

    // 2. create token + db record
    // 3. create smart media
  }

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 lg:px-8 pt-6">
        <section aria-labelledby="studio-heading" className="pt-0 pb-24 max-w-full">
          <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-10 max-w-full">
            <div className="lg:col-span-2">
              <Sidebar />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8">
              <div className="bg-card rounded-xl p-6">
                <h2 className="text-2xl font-semibold mb-2 text-secondary">{selectedTemplate?.label}</h2>
                <Subtitle className="items-start text-lg leading-tight">{selectedTemplate?.description}</Subtitle>
                <Subtitle className="items-start mt-2">Fill out the details for the media and token of your post.</Subtitle>

                <div className="grid grid-cols-1 gap-x-16 lg:grid-cols-2 max-w-full">
                  <div className="lg:col-span-1 mt-8">
                    <div className="md:col-span-1 max-h-[95vh] mb-[100px] md:mb-0 relative w-full">
                      <div className="mb-4">
                        <Tabs openTab={openTab} setOpenTab={setOpenTab} />
                      </div>
                    </div>
                    {openTab === 1 && selectedTemplate && (
                      <CreatePostForm
                        template={selectedTemplate as Template}
                        preview={preview}
                        finalTemplateData={finalTemplateData}
                        setPreview={setPreview}
                        next={(templateData) => {
                          setFinalTemplateData(templateData);
                          setOpenTab(2);
                        }}
                      />
                    )}
                    {openTab === 2 && (
                      <CreateTokenForm
                        finalTokenData={finalTokenData}
                        setFinalTokenData={setFinalTokenData}
                        back={() => setOpenTab(1)}
                        next={() => setOpenTab(3)}
                      />
                    )}
                    {openTab === 3 && (
                      <FinalizePost
                        authenticatedProfile={authenticatedProfile}
                        finalTokenData={finalTokenData}
                        onCreate={onCreate}
                        back={() => setOpenTab(2)}
                      />
                    )}
                  </div>
                  <div className="lg:col-span-1 mt-8">
                    <div className="flex items-center gap-1 mb-4">
                      <Subtitle className="text-white/70">
                        Post preview
                      </Subtitle>
                    </div>
                    {preview?.text && (
                      <Publication
                        publicationData={{
                          author: authenticatedProfile,
                          timestamp: new Date().toISOString(),
                          metadata: {
                            __typename: preview.image
                              ? "ImageMetadata"
                              : (preview.video ? "VideoMetadata" : "TextOnlyMetadata"),
                            content: preview.text,
                            image: preview.image
                              ? { item: preview.image }
                              : undefined,
                            video: preview.video
                              ? { item: preview.video }
                              : undefined
                          }
                        }}
                        theme={Theme.dark}
                        followButtonDisabled={true}
                        environment={LENS_ENVIRONMENT}
                        profilePictureStyleOverride={publicationProfilePictureStyle}
                        containerBorderRadius={'24px'}
                        containerPadding={'12px'}
                        profilePadding={'0 0 0 0'}
                        textContainerStyleOverride={textContainerStyleOverrides}
                        backgroundColorOverride={'rgba(255,255,255, 0.08)'}
                        mediaImageStyleOverride={mediaImageStyleOverride}
                        imageContainerStyleOverride={imageContainerStyleOverride}
                        reactionsContainerStyleOverride={reactionsContainerStyleOverride}
                        reactionContainerStyleOverride={reactionContainerStyleOverride}
                        shareContainerStyleOverride={shareContainerStyleOverride}
                        markdownStyleBottomMargin={'0'}
                        heartIconOverride={true}
                        messageIconOverride={true}
                        shareIconOverride={true}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default StudioCreatePage;