import * as Sentry from "@sentry/nextjs";
import { NextPage } from "next"
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react"
import { useAccount, useBalance, useReadContract, useWalletClient } from "wagmi";
import { switchChain } from "viem/actions";
import { erc20Abi, parseUnits, zeroAddress } from "viem";
import { createSmartMedia, Preview, useResolveSmartMedia, type Template } from "@src/services/madfi/studio";
import CreatePostForm from "@pagesComponents/Studio/CreatePostForm";
import Sidebar from "@pagesComponents/Studio/Sidebar";
import { Subtitle } from "@src/styles/text";
import { Tabs } from "@pagesComponents/Studio/Tabs";
import useIsMounted from "@src/hooks/useIsMounted";
import useIsMobile from "@src/hooks/useIsMobile";
import { useAuthenticatedLensProfile } from "@src/hooks/useLensProfile";
import { CreateTokenForm } from "@pagesComponents/Studio/CreateTokenForm";
import { FinalizePost } from "@pagesComponents/Studio/FinalizePost";
import useRegisteredTemplates from "@src/hooks/useRegisteredTemplates";
import { Action, createPost, uploadFile, uploadImageBase64, uploadVideo } from "@src/services/lens/createPost";
import { resumeSession } from "@src/hooks/useLensLogin";
import toast from "react-hot-toast";
import { BigDecimal, blockchainData, SessionClient } from "@lens-protocol/client";
import { IS_PRODUCTION, LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { EvmAddress, toEvmAddress } from "@lens-protocol/metadata";
import { approveToken, NETWORK_CHAIN_IDS, USDC_CONTRACT_ADDRESS, WGHO_CONTRACT_ADDRESS, registerClubTransaction, DECIMALS, WHITELISTED_UNI_HOOKS, PricingTier, setLensData, getRegisteredClubInfoByAddress, WGHO_ABI, publicClient } from "@src/services/madfi/moneyClubs";
import { cacheImageToStorj, parseBase64Image } from "@src/utils/utils";
import axios from "axios";
import Link from "next/link";
import { ArrowBack } from "@mui/icons-material";
import { encodeAbi } from "@src/utils/viem";
import RewardSwapAbi from "@src/services/madfi/abi/RewardSwap.json";
import PreviewHistory from "@pagesComponents/Studio/PreviewHistory";
import type { TokenData } from "@src/services/madfi/studio";
import { sdk } from '@farcaster/frame-sdk';
import { SITE_URL } from "@src/constants/constants";
import { storageClient } from "@src/services/lens/client";
import TemplateSelector from "@pagesComponents/Studio/TemplateSelector";
import { generateSeededUUID } from "@pagesComponents/ChatWindow/utils";

const StudioCreatePage: NextPage = () => {
  const router = useRouter();
  const { remix: remixPostId, remixSource: encodedRemixSource, remixVersion: remixVersionQuery } = router.query;
  const { chain, address, isConnected } = useAccount();
  const isMounted = useIsMounted();
  const { data: walletClient } = useWalletClient();
  const [openTab, setOpenTab] = useState<number>(1);
  const [currentPreview, setCurrentPreview] = useState<Preview | undefined>();
  const [finalTemplateData, setFinalTemplateData] = useState({});
  const [finalTokenData, setFinalTokenData] = useState<TokenData>();
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [postImage, setPostImage] = useState<any[]>([]);
  const [postAudio, setPostAudio] = useState<File | string | null>(null);
  const [audioStartTime, setAudioStartTime] = useState<number>(0);
  const [addToken, setAddToken] = useState(true);
  const [savedTokenAddress, setSavedTokenAddress] = useState<`0x${string}`>();
  const { data: authenticatedProfile } = useAuthenticatedLensProfile();
  const { data: registeredTemplates, isLoading: isLoadingRegisteredTemplates } = useRegisteredTemplates();
  const [template, setTemplate] = useState<Template>();
  const [selectedSubTemplate, setSelectedSubTemplate] = useState<any>();
  const remixSource = useMemo(() => encodedRemixSource ? decodeURIComponent(encodedRemixSource as string) : undefined, [encodedRemixSource]);
  const { data: remixMedia, isLoading: isLoadingRemixMedia } = useResolveSmartMedia(undefined, remixPostId as string | undefined, false, remixSource);
  const isLoading = isLoadingRegisteredTemplates || isLoadingRemixMedia;
  const [localPreviews, setLocalPreviews] = useState<Array<{
    agentId?: string;
    isAgent: boolean;
    createdAt: string;
    content: {
      text?: string;
      preview?: Preview;
      templateData?: string;
      prompt?: string;
    };
  }>>([]);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const isMobile = useIsMobile();

  // GHO Balance
  const { data: ghoBalance } = useBalance({
    address,
    chainId: LENS_CHAIN_ID,
    query: {
      enabled: finalTokenData?.selectedNetwork === "lens",
      refetchInterval: 10000,
    }
  })

  // stablecoin balance (WGHO on lens, USDC on base)
  const { data: tokenBalance } = useReadContract({
    address: finalTokenData?.selectedNetwork === "base" ? USDC_CONTRACT_ADDRESS : WGHO_CONTRACT_ADDRESS,
    abi: erc20Abi,
    chainId: NETWORK_CHAIN_IDS[finalTokenData?.selectedNetwork as string],
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

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
      // @ts-expect-error templateData is unknown
      if (remixMedia.templateData?.audioData) {
        // @ts-expect-error templateData is unknown
        setPostAudio(remixMedia.templateData.audioData);
        // @ts-expect-error templateData is unknown
        setAudioStartTime(remixMedia.templateData.audioStartTime);
      }
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
  }, [isLoading, remixMedia]);

  useEffect(() => {
    if (!isLoadingRegisteredTemplates && registeredTemplates) {
      setTemplate(registeredTemplates[0]);
    }
  }, [isLoadingRegisteredTemplates]);

  useEffect(() => {
    if (isConnected && address) {
      setRoomId(
        typeof router.query.roomId === 'string'
          ? router.query.roomId
          : generateSeededUUID(`studio-${address.toLowerCase()}`)
      );
    }
  }, [isConnected, address, router.query.roomId]);

  const handleSetPreview = (preview: Preview) => {
    setCurrentPreview(preview);
    if (preview.roomId && preview.roomId !== roomId) {
      setRoomId(preview.roomId);
    }

    // Check if this preview already exists in localPreviews
    const existingPreview = localPreviews.find(lp =>
      lp.agentId === preview.agentId ||
      (lp.content.preview && lp.content.preview.agentId === preview.agentId)
    );

    if (existingPreview) {
      return;
    }

    // Add both template data and preview messages
    const now = new Date().toISOString();

    // First add the template data message
    setLocalPreviews(prev => [...prev, {
      agentId: `templateData-${preview.agentId}`,
      isAgent: false,
      createdAt: now,
      content: {
        templateData: JSON.stringify(preview.templateData || {}),
        text: prompt || "",
        prompt: prompt
      }
    }]);

    // Then add the preview message
    setLocalPreviews(prev => [...prev, {
      agentId: preview.agentId,
      isAgent: true,
      createdAt: new Date(Date.parse(now) + 1).toISOString(), // ensure it comes after the template data
      content: {
        preview: preview,
        text: preview.text,
        prompt: prompt
      }
    }]);
  };

  const handleTemplateSelect = (newTemplate: Template) => {
    if (openTab === 1) {
      setTemplate(newTemplate);
      setSelectedSubTemplate(undefined); // Reset subtemplate when template changes
      setFinalTemplateData({});
    }
  };

  const handleSubTemplateChange = (subTemplate: any) => {
    setSelectedSubTemplate(subTemplate);
  };

  const onCreate = async (collectAmount: number) => {
    let toastId: string | undefined;
    if (!template) {
      toast.error("No template data found");
      return;
    }

    setIsCreating(true);

    // 1. create token (if not remixing and not importing a token)
    let tokenAddress;
    let txHash;
    let _finalTokenData = finalTokenData;
    if (!!savedTokenAddress) {
      tokenAddress = savedTokenAddress;

    } else if (addToken && finalTokenData && finalTokenData.tokenName && finalTokenData.tokenSymbol && finalTokenData.tokenImage && !remixMedia?.agentId) {
      try {
        const targetChainId = NETWORK_CHAIN_IDS[finalTokenData.selectedNetwork];
        if (chain?.id !== targetChainId && walletClient) {
          try {
            console.log(`targetChainId: ${targetChainId}`)
            await switchChain(walletClient, { id: targetChainId });
            // HACK: require lens chain for the whole thing
            setIsCreating(false);
            return;
          } catch (error) {
            console.log(error);
            Sentry.captureException(error);
            toast.error(`Please switch to ${finalTokenData.selectedNetwork}`);
            setIsCreating(false);
            return;
          }
        }
        toastId = toast.loading(`Creating your token on ${finalTokenData.selectedNetwork.toUpperCase()}`);

        if (finalTokenData.totalRegistrationFee && finalTokenData.totalRegistrationFee > 0n) {
          if (finalTokenData.selectedNetwork === "lens") {
            // Calculate how much WGHO we need for the transaction
            const requiredAmount = finalTokenData.totalRegistrationFee;
            const currentWGHOBalance = tokenBalance || 0n;

            // If we don't have enough WGHO
            if (currentWGHOBalance < requiredAmount) {
              // Calculate how much more WGHO we need
              const additionalWGHONeeded = requiredAmount - currentWGHOBalance;

              // Check if user has enough GHO to wrap
              const ghoBalanceInWei = ghoBalance?.value || 0n;
              if (ghoBalanceInWei < additionalWGHONeeded) {
                throw new Error("Insufficient WGHO");
              }

              // Wrap the required amount
              toastId = toast.loading("Wrapping GHO...", { id: toastId });
              // Call the deposit function on the WGHO contract
              const hash = await walletClient!.writeContract({
                address: WGHO_CONTRACT_ADDRESS,
                abi: WGHO_ABI,
                functionName: 'deposit',
                args: [],
                value: additionalWGHONeeded,
              });

              await publicClient("lens").waitForTransactionReceipt({ hash });
            }
          }

          const token = finalTokenData.selectedNetwork === "base" ? USDC_CONTRACT_ADDRESS : WGHO_CONTRACT_ADDRESS;
          await approveToken(token, finalTokenData.totalRegistrationFee, walletClient, toastId, undefined, finalTokenData.selectedNetwork);
        }

        toastId = toast.loading("Registering your token...", { id: toastId });
        const tokenImageUrl = await cacheImageToStorj(
          finalTokenData.tokenImage[0],
          `${finalTokenData.tokenSymbol}-${Date.now()}`,
          'token-images'
        );
        const result = await registerClubTransaction(walletClient, {
          initialSupply: parseUnits((finalTokenData.initialSupply || 0).toString(), DECIMALS).toString(),
          tokenName: finalTokenData.tokenName,
          tokenSymbol: finalTokenData.tokenSymbol,
          tokenImage: tokenImageUrl,
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

        // Approve token for reward pool
        if (finalTokenData.selectedNetwork === "lens") {
          const rewardPoolAmount = Math.floor((finalTokenData.rewardPoolPercentage || 0) * (finalTokenData.initialSupply || 0) / 100).toString();
          if (rewardPoolAmount !== "0") {
            await approveToken(
              tokenAddress,
              parseUnits(rewardPoolAmount, DECIMALS),
              walletClient,
              toastId,
              `Approving ${rewardPoolAmount} ${finalTokenData.tokenSymbol} for reward pool`,
              "lens",
              PROTOCOL_DEPLOYMENT.lens.RewardSwap,
              true
            )
          }
          // always create the reward pool so that clubId will be set on the token
          toastId = toast.loading("Initializing swap action...", { id: toastId });
          const hash = await walletClient!.writeContract({
            address: PROTOCOL_DEPLOYMENT.lens.RewardSwap,
            abi: RewardSwapAbi,
            functionName: "createRewardsPool",
            args: [
              tokenAddress,
              0,
              200,
              (50n * parseUnits(rewardPoolAmount !== "0" ? rewardPoolAmount : "80000000", DECIMALS)) / 100_00n,
              result.clubId,
              zeroAddress,
            ],
          });
          await publicClient("lens").waitForTransactionReceipt({ hash });
          toast.success("Swap action initialized", { id: toastId });
        }
      } catch (error) {
        console.log(error);
        toast.error("Failed to create token", { id: toastId });
        setIsCreating(false);
        return;
      }
    } else if (remixMedia?.token?.address) {
      tokenAddress = remixMedia.token.address;
      setSavedTokenAddress(tokenAddress); // save our progress
    }  else {
      // default to bonsai on the correct chain
      let _chain = chain?.name.toLowerCase() as string;
      if (!IS_PRODUCTION) {
        if (_chain === "base sepolia") {
          _chain = "base";
        } else {
          _chain = "lens";
        }
      } else {
        if (_chain !== "base" && _chain !== "lens") {
          _chain = "lens";
        }
      }
      tokenAddress = PROTOCOL_DEPLOYMENT[_chain].Bonsai;
      _finalTokenData = {
        initialSupply: 0,
        tokenName: "Bonsai",
        tokenSymbol: "BONSAI",
        tokenImage: [{ preview: "https://app.onbons.ai/logo-spaced.png" }],
        selectedNetwork: _chain as "base" | "lens",
      }
    }

    // 2. create lens post with template metadata and ACL; set club db record
    if (LENS_CHAIN_ID !== chain?.id && walletClient) {
      try {
        await switchChain(walletClient, { id: LENS_CHAIN_ID });
        // HACK: require lens chain for the whole thing
          setIsCreating(false);
          return;
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
    let video;
    try {
      let image;

      if (currentPreview?.video && !currentPreview.video.url?.startsWith("https://")) {
        const { uri: videoUri, type } = await uploadVideo(currentPreview.video.blob, currentPreview.video.mimeType, template?.acl);
        video = { url: videoUri, type };
      } else if (currentPreview?.video) {
        const url = typeof currentPreview?.video === "string" ? currentPreview?.video : currentPreview?.video?.url;
        video = { url, type: "video/mp4" };
      }

      if (currentPreview?.image && currentPreview?.image.startsWith("https://")) {
        image = { url: currentPreview?.image, type: "image/png" };
      } else if (currentPreview?.image) {
        const { uri: imageUri, type } = await uploadImageBase64(currentPreview.image, template?.acl);
        image = { url: imageUri, type };
      } else if (postImage && postImage.length > 0) {
        image = (await uploadFile(postImage[0], template?.acl)).image;
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

      let actions: Action[] = [{
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
      if (tokenAddress && _finalTokenData?.selectedNetwork === "lens") {
        actions.push({
          unknown: {
            address: toEvmAddress(PROTOCOL_DEPLOYMENT.lens.RewardSwap),
            params: [{
              raw: {
                // keccak256("lens.param.token")
                key: blockchainData("0xee737c77be2981e91c179485406e6d793521b20aca5e2137b6c497949a74bc94"),
                data: blockchainData(encodeAbi(['address'], [tokenAddress]))
              }
            }],
          }
        })
      }

      const result = await createPost(
        sessionClient as SessionClient,
        walletClient,
        {
          text: postContent || currentPreview?.text || template.displayName,
          image,
          video,
          template,
          tokenAddress,
          remix: remixMedia?.postId ? {
            postId: remixMedia.postId,
            version: remixVersionQuery ? parseInt(remixVersionQuery as string) : remixMedia.versions?.length ?? 0
          } : undefined,
          actions
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
          chain: _finalTokenData?.selectedNetwork || "lens",
          tokenAddress
        });
      }

      const result = await createSmartMedia(template.apiUrl, idToken, JSON.stringify({
        roomId,
        agentId: currentPreview?.agentId,
        postId,
        uri,
        token: (addToken || remixMedia?.agentId || tokenAddress) && _finalTokenData ? {
          chain: _finalTokenData.selectedNetwork,
          address: tokenAddress,
          // save metadata when importing tokens
          metadata: !!savedTokenAddress ? {
            name: _finalTokenData.tokenName,
            symbol: _finalTokenData.tokenSymbol,
            image: _finalTokenData.tokenImage?.length ? _finalTokenData.tokenImage[0].preview : null
          } : undefined
        } : undefined,
        params: {
          templateName: template.name,
          category: template.category,
          templateData: finalTemplateData,
        },
      }));

      if (!result) throw new Error(`failed to send request to ${template.apiUrl}/post/create`);

      if (await sdk.isInMiniApp()) {
        let embeds: string[] = []
        if (video) {
          let resolvedVideoUrl = await storageClient.resolve(video?.url)
          embeds.push(resolvedVideoUrl)
        }
        embeds.push(`${SITE_URL}/post/${postId}`)
        const text = `${postContent || currentPreview?.text || template?.displayName}\n\nvia @onbonsai.eth`
        await sdk.actions.composeCast({
          text,
          embeds: embeds as [string] | [string, string],
        });
      }

      toast.success("Done! Going to post...", { duration: 5000, id: toastId });
      setTimeout(() => router.push(`/post/${postId}`), 2000);
    } catch (error) {
      console.log(error);
      if (error instanceof Error && error.message === "not enough credits") {
        toast.error("Not enough credits to create smart media", { id: toastId, duration: 5000 });
      } else {
        Sentry.captureException(error);
        toast.error("Failed to create smart media", { id: toastId });
      }
      setIsCreating(false);
      return;
    }
  }

  return (
    <div className="bg-background text-secondary min-h-[90vh] w-full overflow-visible">
      <main className="mx-auto max-w-full md:max-w-[100rem] px-4 sm:px-6 pt-6 overflow-visible">
        <section aria-labelledby="studio-heading" className="pt-0 pb-24 max-w-full overflow-visible">
          <div className="flex flex-col lg:flex-row gap-y-6 lg:gap-x-8 max-w-full overflow-visible">
              <div className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
                <Sidebar />
              </div>
              <div className="flex-grow overflow-visible">
                {/* Full-width Template Selector - moved above padding */}
                {template && (
                  <div className={`w-full px-4 sm:px-6 ${openTab === 1 ? 'pt-2 pb-2 flex flex-col shadow-lg' : 'flex items-center gap-4'} overflow-hidden max-w-[1250px]`}>
                    {openTab === 1 && (
                      <Subtitle className="!text-brand-highlight mb-2 text-2xl">What do you want to create?</Subtitle>
                    )}
                    <TemplateSelector
                      selectedTemplate={template}
                      summary={openTab > 1}
                      onTemplateSelect={handleTemplateSelect}
                      selectedSubTemplate={selectedSubTemplate}
                    />
                  </div>
                )}
                <div className="px-4 sm:px-6 pt-0 pb-6 sm:pb-10">
                  <div className="flex flex-col md:flex-row gap-y-8 md:gap-x-8 w-full">
                    {/* Sticky Form Section */}
                    <div className="md:w-1/2 flex-shrink-0">
                      <div className="md:sticky md:top-6 md:z-10 bg-background pb-6">
                        <div className="mb-6">
                          <Tabs openTab={openTab} setOpenTab={setOpenTab} addToken={addToken} />
                        </div>
                        {openTab === 1 && template && (
                          <>
                            <CreatePostForm
                              template={template as Template}
                              preview={currentPreview}
                              selectedSubTemplate={selectedSubTemplate}
                              onSubTemplateChange={handleSubTemplateChange}
                              finalTemplateData={finalTemplateData}
                              setPreview={handleSetPreview}
                              postContent={postContent}
                              setPostContent={setPostContent}
                              prompt={prompt}
                              setPrompt={setPrompt}
                              postImage={postImage}
                              setPostImage={setPostImage}
                              next={(templateData) => {
                                  setFinalTemplateData(templateData);
                                  setOpenTab(addToken ? 2 : 3);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              isGeneratingPreview={isGeneratingPreview}
                              setIsGeneratingPreview={setIsGeneratingPreview}
                              roomId={roomId as string}
                              postAudio={postAudio}
                              setPostAudio={setPostAudio}
                              audioStartTime={audioStartTime}
                              setAudioStartTime={setAudioStartTime}
                            />
                          </>
                        )}
                        {openTab === 2 && (
                          <CreateTokenForm
                            finalTokenData={finalTokenData}
                            postImage={typeof currentPreview?.image === 'string' ? [parseBase64Image(currentPreview.image)] : currentPreview?.image ? [currentPreview.image] : postImage}
                            setSavedTokenAddress={setSavedTokenAddress}
                            savedTokenAddress={savedTokenAddress}
                            setFinalTokenData={setFinalTokenData}
                            back={() => {
                              setOpenTab(1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            next={() => {
                              setOpenTab(3);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          />
                        )}
                        {openTab === 3 && (
                          <FinalizePost
                            authenticatedProfile={authenticatedProfile}
                            finalTokenData={finalTokenData}
                            onCreate={onCreate}
                            back={() => {
                              setOpenTab(addToken ? 2 : 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            isCreating={isCreating}
                            addToken={addToken}
                            onAddToken={() => {
                              setAddToken(true);
                              setOpenTab(2);
                            }}
                            isRemix={!!remixMedia?.agentId}
                            setFinalTokenData={setFinalTokenData}
                            setAddToken={setAddToken}
                            template={template}
                            postContent={postContent}
                            setPostContent={setPostContent}
                            currentPreview={currentPreview}
                            setCurrentPreview={setCurrentPreview}
                          />
                        )}
                      </div>
                    </div>
                    {/* Natural Preview History Section */}
                    <div className="md:w-1/2 flex-shrink-0">
                      <PreviewHistory
                        currentPreview={currentPreview}
                        setCurrentPreview={setCurrentPreview}
                        setSelectedTemplate={setTemplate}
                        isGeneratingPreview={isGeneratingPreview}
                        roomId={roomId}
                        templateUrl={template?.apiUrl}
                        setFinalTemplateData={setFinalTemplateData}
                        setPrompt={setPrompt}
                        postContent={postContent}
                        localPreviews={localPreviews}
                        isFinalize={openTab > 1}
                        postImage={postImage}
                        setPostContent={setPostContent}
                      />
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