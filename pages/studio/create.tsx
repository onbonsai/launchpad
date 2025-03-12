import { NextPage } from "next"
import { useRouter } from "next/router";
import { useMemo, useState } from "react"
import { useAccount, useWalletClient } from "wagmi";
import { switchChain } from "@wagmi/core";
import { parseUnits, zeroAddress } from "viem";
import { createSmartMedia, Preview, type Template} from "@src/services/madfi/studio";
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
import { FinalizePost } from "@pagesComponents/Studio/FinalizePost";
import useRegisteredTemplates from "@src/hooks/useRegisteredTemplates";
import { createPost, uploadFile, uploadImageBase64 } from "@src/services/lens/createPost";
import { resumeSession } from "@src/hooks/useLensLogin";
import toast from "react-hot-toast";
import { BigDecimal, SessionClient } from "@lens-protocol/client";
import { LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { toEvmAddress } from "@lens-protocol/metadata";
import { approveToken, NETWORK_CHAIN_IDS, USDC_CONTRACT_ADDRESS, WGHO_CONTRACT_ADDRESS, registerClubTransaction, DECIMALS, WHITELISTED_UNI_HOOKS, PricingTier, setLensData } from "@src/services/madfi/moneyClubs";
import { pinFile, storjGatewayURL } from "@src/utils/storj";
import { configureChainsConfig } from "@src/utils/wagmi";
import { parseBase64Image } from "@src/utils/utils";

type TokenData = {
  initialSupply: number;
  uniHook: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  tokenImage: any[];
  selectedNetwork: "lens" | "base";
  totalRegistrationFee?: bigint;
  pricingTier?: PricingTier;
};

const StudioCreatePage: NextPage = () => {
  const router = useRouter();
  const { template: templateName } = router.query;
  const { chain, address, isConnected } = useAccount();
  const isMounted = useIsMounted();
  const { data: walletClient } = useWalletClient();
  const [openTab, setOpenTab] = useState<number>(1);
  const [preview, setPreview] = useState<Preview | undefined>();
  const [finalTemplateData, setFinalTemplateData] = useState({});
  const [finalTokenData, setFinalTokenData] = useState<TokenData>();
  const [isCreating, setIsCreating] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<any[]>([]);
  const [addToken, setAddToken] = useState(false);
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: registeredTemplates, isLoading } = useRegisteredTemplates();

  const template = useMemo(() => {
    if (!isMounted || isLoading) return;

    if (!templateName) router.push('/studio');

    const res = registeredTemplates?.find(({ name }) => name === templateName);

    if (!res) router.push('/studio');

    return res;
  }, [templateName, isMounted, isLoading]);

  const onCreate = async (collectAmount: number) => {
    let toastId: string | undefined;
    if (!template) {
      toast.error("No template data found");
      return;
    }

    // 1. create lens post with template metadata and ACL
    if (LENS_CHAIN_ID !== chain?.id && switchChain) {
      try {
        await switchChain(configureChainsConfig, { chainId: LENS_CHAIN_ID });
      } catch {
        toast.error("Please switch networks to create your Lens post");
        return;
      }
    }

    const sessionClient = await resumeSession();
    let idToken;
    if (!sessionClient && !authenticatedProfile) {
      toast.error("Not authenticated");
      return;
    } else {
      const creds = await (sessionClient as SessionClient).getCredentials();
      if (creds.isOk()) {
        idToken = creds.value?.idToken;
      } else {
        toast.error("Failed to get credentials");
        return;
      }
    }

    setIsCreating(true);
    toastId = toast.loading("Creating post...");
    let postId, uri;
    try {
      let image;
      if (postImage && postImage.length > 0) {
        image = (await uploadFile(postImage[0], template?.acl)).image;
      } else if (preview?.image) {
        const { uri: imageUri, type } = await uploadImageBase64(preview.image, template?.acl);
        image = { url: imageUri, type };
      }
      const result = await createPost(
        sessionClient as SessionClient,
        walletClient,
        {
          text: postContent || preview?.text || template.displayName,
          image,
          template,
          actions: [{
            simpleCollect: {
              amount: {
                currency: toEvmAddress(PROTOCOL_DEPLOYMENT.lens.Bonsai),
                value: collectAmount.toString() as BigDecimal
              },
              recipients: [
                {
                  address: toEvmAddress(address as string),
                  percent: 80
                },
                {
                  address: toEvmAddress(template.protocolFeeRecipient),
                  percent: 20,
                }
              ],
              referralShare: 5,
            }
          }]
        }
      )
      if (!result?.postId) throw new Error("No result from createPost");

      postId = result.postId;
      uri = result.uri;
    } catch (error) {
      console.log(error);
      toast.error("Failed to create post", { id: toastId });
      setIsCreating(false);
      return;
    }

    // 2. create token + set club db record
    let tokenAddress;
    if (addToken && finalTokenData) {
      toastId = toast.loading("Creating token...", { id: toastId });
      try {
        const targetChainId = NETWORK_CHAIN_IDS[finalTokenData.selectedNetwork];
        if (chain?.id !== targetChainId) {
          try {
            await switchChain(configureChainsConfig, { chainId: targetChainId });
          } catch {
            toast.error(`Please switch to ${finalTokenData.selectedNetwork}`);
            setIsCreating(false);
            return;
          }
        }

        if (finalTokenData.totalRegistrationFee && finalTokenData.totalRegistrationFee > 0n) {
          const token = finalTokenData.selectedNetwork === "base" ? USDC_CONTRACT_ADDRESS : WGHO_CONTRACT_ADDRESS;
          await approveToken(token, finalTokenData.totalRegistrationFee, walletClient, toastId);
        }

        const result = await registerClubTransaction(walletClient, {
          initialSupply: parseUnits((finalTokenData.initialSupply || 0).toString(), DECIMALS).toString(),
          tokenName: finalTokenData.tokenName,
          tokenSymbol: finalTokenData.tokenSymbol,
          tokenImage: storjGatewayURL(await pinFile(finalTokenData.tokenImage[0])),
          hook: finalTokenData.selectedNetwork === 'base'
            ? WHITELISTED_UNI_HOOKS[finalTokenData.uniHook].contractAddress as `0x${string}`
            : zeroAddress,
          // TODO: some sensible defaults
          cliffPercent: 50 * 100, // 50% cliff
          vestingDuration: 3600 * 6, // 6h
          pricingTier: finalTokenData.selectedNetwork === 'lens' ? finalTokenData.pricingTier as PricingTier : undefined,
        }, finalTokenData.selectedNetwork);

        if (!result) throw new Error("No result from registerClubTransaction");
        // link the creator handle and post id
        await setLensData({
          hash: result.txHash as string,
          postId,
          handle: authenticatedProfile?.username?.localName ? authenticatedProfile.username.localName : address as string,
          chain: finalTokenData.selectedNetwork
        });

        tokenAddress = result.tokenAddress;
      } catch (error) {
        console.log(error);
        toast.error("Failed to create token", { id: toastId });
        setIsCreating(false);
        return;
      }
    }

    // 3. create smart media
    toastId = toast.loading("Finalizing...", { id: toastId });
    try {
      let params;
      if (!preview?.agentId) {
        params = {
          templateName: template.name,
          category: template.category,
          templateData: finalTemplateData,
        };
      }
      const result = await createSmartMedia(template.apiUrl, idToken, JSON.stringify({
        agentId: preview?.agentId,
        postId,
        uri,
        token: addToken && finalTokenData ? {
          chain: finalTokenData.selectedNetwork,
          address: tokenAddress
        } : undefined,
        params
      }));

      if (!result) throw new Error(`failed to send request to ${template.apiUrl}/post/create`);

      toast.success("Done! Going to post...", { duration: 5000, id: toastId });
      setTimeout(() => router.push(`/post/${postId}`), 2000);
    } catch (error) {
      console.log(error);
      toast.error("Failed to create smart media", { id: toastId });
      setIsCreating(false);
      return;
    }
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
                <h2 className="text-2xl font-semibold mb-2 text-secondary">{template?.displayName}</h2>
                <Subtitle className="items-start text-lg leading-tight">{template?.description}</Subtitle>
                <Subtitle className="items-start mt-2">Fill out the details for the media and token of your post.</Subtitle>

                {/* TODO: handle isConnected */}

                <div className="grid grid-cols-1 gap-x-16 lg:grid-cols-2 max-w-full">
                  <div className="lg:col-span-1 mt-8">
                    <div className="md:col-span-1 max-h-[95vh] mb-[100px] md:mb-0 relative w-full">
                      <div className="mb-4">
                        <Tabs openTab={openTab} setOpenTab={setOpenTab} addToken={addToken} />
                      </div>
                    </div>
                    {openTab === 1 && template && (
                      <CreatePostForm
                        template={template as Template}
                        preview={preview}
                        finalTemplateData={finalTemplateData}
                        setPreview={setPreview}
                        postContent={postContent}
                        setPostContent={setPostContent}
                        postImage={postImage}
                        setPostImage={setPostImage}
                        next={(templateData) => {
                          setFinalTemplateData(templateData);
                          setOpenTab(addToken ? 2 : 3);
                        }}
                      />
                    )}
                    {openTab === 2 && (
                      <CreateTokenForm
                        finalTokenData={finalTokenData}
                        postImage={typeof preview?.image === 'string' ? [parseBase64Image(preview.image)] : preview?.image ? [preview.image] : postImage}
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
                        back={() => setOpenTab(addToken ? 2 : 1)}
                        isCreating={isCreating}
                        addToken={addToken}
                        onAddToken={() => {
                          setAddToken(true);
                          setOpenTab(2);
                        }}
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
                        key={`preview-${JSON.stringify(preview)}`}
                        publicationData={{
                          author: authenticatedProfile,
                          timestamp: new Date().toISOString(),
                          metadata: {
                            __typename: !!preview?.image
                              ? "ImageMetadata"
                              : (preview.video ? "VideoMetadata" : "TextOnlyMetadata"),
                            content: preview.text,
                            image: preview.image
                              ? { item: typeof preview.image === 'string' ? preview.image : preview.imagePreview }
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