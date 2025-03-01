import { NextPage } from "next"
import { useRouter } from "next/router";
import { useMemo, useState } from "react"
import { Preview, TEMPLATES, type Template} from "@src/services/madfi/studio";
import CreatePostForm from "@pagesComponents/Studio/CreatePostForm";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import { Subtitle } from "@src/styles/text";
import { Tabs } from "@pagesComponents/Studio/Tabs";
import useIsMounted from "@src/hooks/useIsMounted";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { Publication, Theme } from "@madfi/widgets-react";
import { LENS_ENVIRONMENT } from "@src/services/lens/client";
import { shareContainerStyleOverride, imageContainerStyleOverride, mediaImageStyleOverride, publicationProfilePictureStyle, reactionContainerStyleOverride, reactionsContainerStyleOverride, textContainerStyleOverrides } from "@src/components/Publication/PublicationStyleOverrides";
import { CreateTokenForm } from "@pagesComponents/Studio/CreateTokenForm";

const StudioCreatePage: NextPage = () => {
  const router = useRouter();
  const { template } = router.query;
  const isMounted = useIsMounted();
  const [openTab, setOpenTab] = useState<number>(1);
  const [preview, setPreview] = useState<Preview | undefined>();
  const [finalTemplateData, setFinalTemplateData] = useState({});
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();

  const selectedTemplate = useMemo(() => {
    if (!isMounted) return;

    if (!template) router.push('/studio');

    const res = TEMPLATES.find(({ name }) => name === template);

    if (!res) router.push('/studio');

    return res;
  }, [template, isMounted]);

  const onCreateToken = () => {

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
                <Subtitle className="items-start">{selectedTemplate?.description}</Subtitle>

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
                        onCreateToken={onCreateToken}
                        back={() => setOpenTab(1)}
                      />
                    )}
                  </div>
                  <div className="lg:col-span-1 mt-8">
                    {preview?.text && (
                      <Publication
                        publicationData={{
                          // author: authenticatedProfile,
                          author: {
                            metadata: {
                              name: "carlos"
                            }
                          },
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