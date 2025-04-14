import { useState, useMemo, useEffect } from "react";
import { useWalletClient, useAccount, useSwitchChain } from "wagmi";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { ProfileFragment } from "@lens-protocol/client";
import { useDebounce } from "use-debounce";
import axios from "axios";
import { Disclosure, Transition } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/solid";

import { Tooltip } from "@src/components/Tooltip";
import { UploaderLite } from "@src/components/ImageUploader/UploaderLite";
import useParsedTokenFromURL from "@src/hooks/useParsedTokenFromURL";
import publicationBody from "@src/services/lens/publicationBody";
import { createPostMomoka, createPostOnchain } from "@src/services/lens/createPost";
import { chainIdNumber } from "@src/constants/validChainId";
import { pinFile, pinJson, storjGatewayURL } from "@src/utils/storj";
import { Button } from "@src/components/Button";
import { enableSignless } from "@src/services/lens/profileManagers";
import { getProfileImage } from "@src/services/lens/utils";

type ActionModuleWithInitData = {
  actionModule?: string;
  actionModuleInitData?: any;
}

export type LivestreamConfig = {
  title: string;
  playbackUrl: string;
  startsAt?: string,
  endsAt?: string,
  actionModuleWithInitData?: ActionModuleWithInitData
};

type CreatePostProps = {
  profile: ProfileFragment;
  fetchGatedPosts: () => void;
  authenticatedProfile?: ProfileFragment | null;
  livestreamConfig?: LivestreamConfig
};

const CreatePost = ({
  profile,
  fetchGatedPosts,
  authenticatedProfile,
  livestreamConfig,
}: CreatePostProps) => {
  const { query: { source } } = useRouter();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { chain } = useAccount();

  const [files, setFiles] = useState<any[]>([]);
  const [postContent, setPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [gatedCondition, setGatedCondition] = useState();
  const [actionModuleWithInitData, setActionModuleWithInitData] = useState<ActionModuleWithInitData>({});
  const [isEnablingSignless, setIsEnablingSignless] = useState(false);
  const [bounty, setBounty] = useState<{ cost?: bigint, paymentToken?: string }>({});

  const [debouncedPostContent] = useDebounce(postContent, 500);
  const { parsedToken, clearToken } = useParsedTokenFromURL(debouncedPostContent, setPostContent);

  const _createPost = async () => {
    if (!authenticatedProfile?.id) return; // sanity check

    setIsPosting(true);
    let toastId;

    if (chainIdNumber !== chain?.id && switchChain) {
      toastId = toast.loading("Switching networks...");
      try {
        await switchChain({ chainId: chainIdNumber });
      } catch {
        toast.error("Please switch networks to create your Lens post");
      }
      toast.dismiss(toastId);
      setIsPosting(false);
      return;
    }

    try {
      // upload attachments to ipfs
      let attachments: any[] = [];
      if (files.length > 0) {
        toastId = toast.loading("Uploading content...", { id: toastId });
        const cids = await Promise.all(
          files.map(async (file: any, idx: number) => ({
            item: `ipfs://${await pinFile(file)}`,
            type: file.type,
            altTag: file.name || `attachment_${idx}`,
          })),
        );
        attachments = attachments.concat(cids);
      }

      const publicationMetadata = publicationBody(
        postContent,
        attachments,
        profile.metadata?.displayName || profile.handle!.suggestedFormatted.localName,
        livestreamConfig
      );

      // created a gated lens post, using the lens relayer api
      toastId = toast.loading("Preparing post...", { id: toastId });
      const {
        actionModule,
        actionModuleInitData
      } = actionModuleWithInitData || livestreamConfig?.actionModuleWithInitData || {};

      let broadcastResult;
      if (gatedCondition) {
        // TODO: implement gated condition
      } else if (actionModule && actionModuleInitData) {
        // create a post onchain with our module
        const { data: postIpfsHash } = await pinJson(publicationMetadata);
        broadcastResult = await createPostOnchain(
          walletClient,
          `ipfs://${postIpfsHash}`,
          authenticatedProfile,
          [actionModule],
          [actionModuleInitData],
        );
      } else {
        // creating a post on momoka
        const { data: postIpfsHash } = await pinJson(publicationMetadata);
        broadcastResult = await createPostMomoka(
          walletClient,
          storjGatewayURL(`ipfs://${postIpfsHash}`),
          authenticatedProfile,
        );
      }

      // broadcastResult might be the `pubId` if it was a wallet tx
      if (broadcastResult) {
        // create seo image
        // const pubIdOrTxHash = typeof broadcastResult === "string"
        //   ? broadcastResult
        //   : broadcastResult.id || broadcastResult.txHash || `${authenticatedProfile.id}-${broadcastResult?.toString(16)}`;
        setTimeout(fetchGatedPosts, 6000); // give the api some time
        toast.success("Post created", { id: toastId, duration: 5000 });
        setPostContent("");
        setFiles([]);
        setGatedCondition(undefined);
        clearToken();
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong. Please try again later", { id: toastId });
    }

    setIsPosting(false);
  };

  const onEnableSignless = async () => {
    setIsEnablingSignless(true);

    let toastId;
    try {
      toastId = toast.loading("Approving Lens Profile Manager...");

      await enableSignless(walletClient);
      authenticatedProfile!.signless = true;

      toast.success(`Done! You can now create posts without paying gas or signing`, { duration: 5_000, id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Unable to", { id: toastId });
    }

    setIsEnablingSignless(false);
  };

  return (
    <div className="mt-8 mb-8">
      <Disclosure as="div" defaultOpen={source === "p00ls" || !!livestreamConfig?.playbackUrl}>
        {({ open }) => (
          <>
            <h3 className="text-xl leading-6 text-secondary">
              <Disclosure.Button className="flex w-full items-center justify-between py-3 text-secondary hover:text-secondary/80">
                <div className="flex items-center">
                  <h2 className="text-2xl tracking-wide leading-6">Create a post</h2>
                  <span className="ml-6 flex items-center">
                    {open ? (
                      <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                </div>
              </Disclosure.Button>
            </h3>
            <DisclosurePanelWithTransition>
              <Disclosure.Panel className="pt-2">
                <div className="flex p-6 rounded-[18px] bg-[#1C1D1C]">
                  <div className="flex-shrink-0">
                    <img
                      src={getProfileImage(profile)}
                      alt={profile?.id || "avatar"}
                      className="rounded-full w-12 h-12"
                    />
                  </div>
                  <div className="ml-4 flex-grow mr-4 flex flex-col">
                    <div className="font-bold">{profile.metadata?.displayName || ""}</div>
                    <div className="text-gray-600">
                      {profile.handle?.suggestedFormatted?.localName || profile.handle?.localName}
                    </div>
                    <textarea
                      rows={5}
                      placeholder="Create a post..."
                      className="mt-4 whitespace-pre-line block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                    />
                    {/* Only show the uploader if not promoting an NFT */}
                    {/* Allow 6 attachments when creating a bounty (bountyTotalCost) */}
                    {!parsedToken?.id && <UploaderLite files={files} setFiles={setFiles} maxFiles={bounty?.cost ? 6 : undefined} />}
                    {/* <SelectActionModule
                      setActionModuleWithInitData={setActionModuleWithInitData}
                      activeMadSBT={undefined}
                      openCollectionMintModal={() => setOpenCollectionMintModal(true)}
                      openBountyActionModal={() => setOpenBountyActionModal(true)}
                      openZoraMintModal={() => setOpenZoraMintModal(true)}
                      promotingToken={parsedToken}
                      clearToken={clearToken}
                    /> */}
                    {/* <SelectGatedPostCondition
                      gatedCondition={gatedCondition}
                      setGatedCondition={setGatedCondition}
                      activeMadSBT={undefined}
                    /> */}
                    <div className="flex gap-2 ml-auto">
                      {!authenticatedProfile?.signless && (
                        <Tooltip
                          message="By enabling signless, you're approving the Lens Profile Manager for free + signless posting"
                          direction="top"
                        >
                          <Button
                            variant="secondary"
                            className="mb-2 mt-4 md:mb-0 text-base ml-auto"
                            onClick={onEnableSignless}
                            disabled={isPosting || !postContent || isEnablingSignless}
                          >
                            Enable Signless
                          </Button>
                        </Tooltip>
                      )}
                      {bounty?.cost ? (
                        <Tooltip
                          message="You will first approve the budget to be spent by the contract as you approve bids"
                          direction="top"
                        >
                          <Button
                            variant="accent"
                            className="mb-2 mt-4 md:mb-0 text-base ml-auto"
                            onClick={_createPost}
                            disabled={isPosting || !postContent}
                          >
                            Post Bounty
                          </Button>
                        </Tooltip>
                      ) : (
                        <Button
                          variant="accent"
                          className="mb-2 mt-4 md:mb-0 text-base ml-auto"
                          onClick={_createPost}
                          disabled={isPosting || !postContent}
                        >
                          Post
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Disclosure.Panel>
            </DisclosurePanelWithTransition>
          </>
        )}
      </Disclosure>

      {/* Open Action Config */}
      {/* <Modal
        onClose={() => {
          setOpenCollectionMintModal(false);
          setOpenZoraMintModal(false);
          setOpenBountyActionModal(false);
        }}
        open={openActionConfigModal}
        setOpen={(b: boolean) => {
          setOpenCollectionMintModal(false);
          setOpenZoraMintModal(false);
          setOpenBountyActionModal(false);
        }}
        panelClassnames="bg-background w-screen h-screen md:h-full md:w-[60vw] p-4 text-secondary"
      >

      </Modal> */}
    </div>
  );
};

const DisclosurePanelWithTransition = ({ children }) => {
  return (
    <Transition
      enter="transition ease-in-out duration-200"
      enterFrom="opacity-0 translate-y-1"
      enterTo="opacity-100 translate-y-0"
    >
      {children}
    </Transition>
  )
};

export default CreatePost;
