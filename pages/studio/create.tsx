import { NextPage } from "next"
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react"
import { useAccount, useWalletClient } from "wagmi";
import { switchChain } from "@wagmi/core";
import { parseUnits, zeroAddress } from "viem";
import { createSmartMedia, Preview, useResolveSmartMedia, type Template } from "@src/services/madfi/studio";
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
import { EvmAddress, toEvmAddress } from "@lens-protocol/metadata";
import { approveToken, NETWORK_CHAIN_IDS, USDC_CONTRACT_ADDRESS, WGHO_CONTRACT_ADDRESS, registerClubTransaction, DECIMALS, WHITELISTED_UNI_HOOKS, PricingTier, setLensData, getRegisteredClubInfoByAddress } from "@src/services/madfi/moneyClubs";
import { pinFile, storjGatewayURL } from "@src/utils/storj";
import { configureChainsConfig } from "@src/utils/wagmi";
import { parseBase64Image } from "@src/utils/utils";
import AnimatedBonsai from "@src/components/LoadingSpinner/AnimatedBonsai";
import { AnimatedText } from "@src/components/LoadingSpinner/AnimatedText";
import axios from "axios";
import { ChevronLeftIcon } from "@heroicons/react/outline";
import Link from "next/link";
import { ArrowBack } from "@mui/icons-material";

type TokenData = {
  initialSupply: number;
  uniHook?: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  tokenImage: any[];
  selectedNetwork: "lens" | "base";
  totalRegistrationFee?: bigint;
  pricingTier?: PricingTier;
};

const StudioCreatePage: NextPage = () => {
  const router = useRouter();
  const { template: templateName, remix: remixPostId, remixSource: encodedRemixSource } = router.query;
  const { chain, address, isConnected } = useAccount();
  const isMounted = useIsMounted();
  const { data: walletClient } = useWalletClient();
  const [openTab, setOpenTab] = useState<number>(1);
  const [preview, setPreview] = useState<Preview | undefined>();
  const [finalTemplateData, setFinalTemplateData] = useState({});
  const [finalTokenData, setFinalTokenData] = useState<TokenData>();
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<any[]>([]);
  const [addToken, setAddToken] = useState(false);
  const [savedTokenAddress, setSavedTokenAddress] = useState<`0x${string}`>();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: registeredTemplates, isLoading: isLoadingRegisteredTemplates } = useRegisteredTemplates();
  const remixSource = useMemo(() => encodedRemixSource ? decodeURIComponent(encodedRemixSource as string) : undefined, [encodedRemixSource]);
  const { data: remixMedia, isLoading: isLoadingRemixMedia } = useResolveSmartMedia(undefined, remixPostId as string | undefined, false, remixSource);
  const isLoading = isLoadingRegisteredTemplates || isLoadingRemixMedia;

  const template = useMemo(() => {
    if (!isMounted || isLoading) return;

    if (!templateName) router.push('/studio');

    const res = registeredTemplates?.find(({ name }) => name === templateName);

    if (!res) router.push('/studio');

    return res;
  }, [templateName, isMounted, isLoading]);

  const checkReferralStatus = async (address: string) => {
    try {
      const response = await axios.get(`/api/referrals/status?address=${address}`);
      return response.data;
    } catch (error) {
      console.error('Error checking referral status:', error);
      return null;
    }
  };

  // set the default form data to use the remixed version
  useEffect(() => {
    if (!isLoading && !!remixMedia) {
      // @ts-expect-error templateData is unknown
      setFinalTemplateData(remixMedia.templateData);

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
  }, [isLoading, remixMedia]);

  const onCreate = async (collectAmount: number) => {
    let toastId: string | undefined;
    if (!template) {
      toast.error("No template data found");
      return;
    }

    setIsCreating(true);

    // 1. create token (if not remixing)
    let tokenAddress;
    let txHash;
    if (!!savedTokenAddress) {
      tokenAddress = savedTokenAddress;
    } else if (addToken && finalTokenData && !remixMedia?.agentId) {
      toastId = toast.loading(`Creating your token on ${finalTokenData.selectedNetwork.toUpperCase()}`);
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
          await approveToken(token, finalTokenData.totalRegistrationFee, walletClient, toastId, undefined, finalTokenData.selectedNetwork);
        }

        const result = await registerClubTransaction(walletClient, {
          initialSupply: parseUnits((finalTokenData.initialSupply || 0).toString(), DECIMALS).toString(),
          tokenName: finalTokenData.tokenName,
          tokenSymbol: finalTokenData.tokenSymbol,
          tokenImage: storjGatewayURL(await pinFile(finalTokenData.tokenImage[0])),
          hook: finalTokenData.selectedNetwork === 'base' && finalTokenData.uniHook
            ? WHITELISTED_UNI_HOOKS[finalTokenData.uniHook].contractAddress as `0x${string}`
            : zeroAddress,
          // TODO: some sensible defaults
          cliffPercent: 50 * 100, // 50% cliff
          vestingDuration: 3600 * 6, // 6h
          pricingTier: finalTokenData.selectedNetwork === 'lens' ? finalTokenData.pricingTier as PricingTier : undefined,
        }, finalTokenData.selectedNetwork);

        if (!result) throw new Error("No result from registerClubTransaction");

        txHash = result.txHash as string;
        tokenAddress = result.tokenAddress;
        setSavedTokenAddress(tokenAddress); // save our progress
      } catch (error) {
        console.log(error);
        toast.error("Failed to create token", { id: toastId });
        setIsCreating(false);
        return;
      }
    } else if (remixMedia?.token?.address) {
      tokenAddress = remixMedia.token.address;
      setSavedTokenAddress(tokenAddress); // save our progress
    }

    // 2. create lens post with template metadata and ACL; set club db record
    if (LENS_CHAIN_ID !== chain?.id && switchChain) {
      try {
        await switchChain(configureChainsConfig, { chainId: LENS_CHAIN_ID });
      } catch (error) {
        console.log(error);
        toast.error("Please switch networks to create your Lens post");
        setIsCreating(false);
        return;
      }
    }

    const sessionClient = await resumeSession(true);
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

    toastId = toast.loading("Creating your post...", { id: toastId });
    let postId, uri;
    try {
      let image;
      if (postImage && postImage.length > 0) {
        image = (await uploadFile(postImage[0], template?.acl)).image;
      } else if (preview?.image) {
        const { uri: imageUri, type } = await uploadImageBase64(preview.image, template?.acl);
        image = { url: imageUri, type };
      }

      // Check if user was referred
      const referralStatus = await checkReferralStatus(address as string);

      // Prepare collect settings
      let recipients: { address: EvmAddress; percent: number }[] = [];
      if (referralStatus?.hasReferrer && !referralStatus?.firstPostUsed) {
        // Split 80% between creator and referrer (40% each)
        recipients = [
          {
            address: toEvmAddress(address as string),
            percent: 40
          },
          {
            address: toEvmAddress(referralStatus.referrer),
            percent: 40
          },
          {
            address: toEvmAddress(template.protocolFeeRecipient),
            percent: 20,
          }
        ];
      } else {
        // Default split: 80% creator, 20% protocol
        recipients = [
          {
            address: toEvmAddress(address as string),
            percent: 80
          },
          {
            address: toEvmAddress(template.protocolFeeRecipient),
            percent: 20,
          }
        ];
      }

      const result = await createPost(
        sessionClient as SessionClient,
        walletClient,
        {
          text: postContent || preview?.text || template.displayName,
          image,
          template,
          tokenAddress,
          remix: remixMedia?.postId,
          actions: [{
            simpleCollect: {
              payToCollect: {
                amount: {
                  currency: toEvmAddress(PROTOCOL_DEPLOYMENT.lens.Bonsai),
                  value: collectAmount.toString() as BigDecimal
                },
                recipients,
                referralShare: 5,
              }
            }
          }]
        }
      );

      if (!result?.postId) throw new Error("No result from createPost");
      postId = result.postId;
      uri = result.uri;

      // If this was a referred user's first post, mark it as used
      if (referralStatus?.hasReferrer && !referralStatus?.firstPostUsed) {
        try {
          await axios.post('/api/referrals/mark-used', { address: address as string });
        } catch (error) {
          console.error('Error marking referral as used:', error);
          // Don't throw here - the post was still created successfully
        }
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to create post", { id: toastId });
      setIsCreating(false);
      return;
    }

    // 3. create smart media
    toastId = toast.loading("Finalizing...", { id: toastId });
    try {
      if (tokenAddress && !remixMedia?.agentId) { // link the creator handle and post id in our db (if not remixed)
        await setLensData({
          hash: txHash,
          postId,
          handle: authenticatedProfile?.username?.localName ? authenticatedProfile.username.localName : address as string,
          chain: finalTokenData?.selectedNetwork || "lens"
        });
      }

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
        token: (addToken || remixMedia?.agentId) && finalTokenData ? {
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
      if (error instanceof Error && error.message === "not enough credits") {
        toast.error("Not enough credits to create smart media", { id: toastId, duration: 5000 });
      } else {
        toast.error("Failed to create smart media", { id: toastId });
      }
      setIsCreating(false);
      return;
    }
  }

  return (
    <div className="bg-background text-secondary min-h-[90vh]">
      <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 pt-6">
        <section aria-labelledby="studio-heading" className="pt-0 pb-24 max-w-full">
          <div className="flex flex-col md:flex-row gap-y-10 md:gap-x-6 max-w-full">
            <div className="md:w-64 flex-shrink-0">
              <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-grow">
              {/* Header Card */}
              <div className="bg-card rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <Link
                    href="/studio"
                    className="flex items-center justify-center text-secondary/60 hover:text-brand-highlight hover:bg-secondary/10 rounded-full transition-colors w-8 h-8 mt-2 md:mt-0 shrink-0"
                  >
                    <ArrowBack className="h-5 w-5" />
                  </Link>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-secondary">{template?.displayName}</h2>
                    <Subtitle className="items-start text-lg leading-tight mt-2 mr-8">{template?.description}</Subtitle>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="bg-card rounded-lg p-6 mt-6">
                <h3 className="text-sm font-medium text-brand-highlight mb-4">Fill out the details for your smart media post</h3>

                <div className="grid grid-cols-1 gap-x-16 lg:grid-cols-2 max-w-full">
                  <div className="lg:col-span-1">
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
                        isGeneratingPreview={isGeneratingPreview}
                        setIsGeneratingPreview={setIsGeneratingPreview}
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
                        isRemix={!!remixMedia?.agentId}
                      />
                    )}
                  </div>
                  <div className="lg:col-span-1">
                    <div className="flex items-center gap-1 mb-4">
                      <Subtitle className="text-white/70">
                        Post preview
                      </Subtitle>
                    </div>
                    {isGeneratingPreview && (
                      <div className="flex flex-col items-center gap-4 pt-12">
                        <div>
                          <AnimatedBonsai duration={10} />
                        </div>
                        <div className="w-full">
                          <AnimatedText
                            lines={[
                              "Generating preview...",
                              "Sending content prompt to LLM...",
                              "Analyzing context and tone...",
                              "Processing language model response...",
                              "Enhancing semantic structure...",
                              "Refining writing style...",
                              "Optimizing content flow...",
                              "Applying creative improvements...",
                              "Running final quality checks...",
                              "Finalizing your masterpiece..."
                            ]}
                            duration={60}
                            className="text-lg text-white/70"
                          />
                        </div>
                      </div>
                    )}
                    {!isGeneratingPreview && preview?.text && (
                      <Publication
                        key={`preview-${JSON.stringify(preview)}`}
                        publicationData={{
                          author: authenticatedProfile,
                          timestamp: new Date(),
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