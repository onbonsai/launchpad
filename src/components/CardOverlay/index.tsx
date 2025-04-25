import { BookmarkAddOutlined, BookmarkOutlined, BookmarkBorder, MoreHoriz } from "@mui/icons-material";
import { useMemo, useState, useRef } from "react"
import { switchChain } from "@wagmi/core";
import { Account, Post } from "@lens-protocol/client";
import toast from "react-hot-toast";
import { useAccount, useWalletClient } from "wagmi";
import { NewShareIcon } from "../Share/NewShareIcon";
import { Button } from "../Button";
import { LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { configureChainsConfig } from "@src/utils/wagmi";
import { resumeSession } from "@src/hooks/useLensLogin";
import { checkCollectAmount, collectPost } from "@src/services/lens/collect";
import CollectModal from "@src/components/Publication/CollectModal";
import { Subtitle } from "@src/styles/text";
import { Tooltip } from "@src/components/Tooltip";
import { SparkIcon } from "../Icons/SparkIcon";
import DropdownMenu from "../Publication/DropdownMenu";
import { formatEther } from "viem";
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import("../Modal").then(mod => mod.Modal), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-dark-grey/20 rounded-2xl h-[200px] w-full" />
});

const TopUpModal = dynamic(() => import("../Publication/TopUpModal").then(mod => mod.TopUpModal), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-dark-grey/20 rounded-2xl h-[200px] w-full" />
});

interface CardOverlayProps {
  authenticatedProfile?: Account | null;
  bonsaiBalance?: bigint;
  post: Post;
  postData?: { actors: any[] };
  onShare?: () => void;
  onClick?: () => void;
  className?: string;
  showDropdown: boolean;
  setShowDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  showCollectModal: boolean;
  setShowCollectModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const CardOverlay: React.FC<CardOverlayProps> = ({
  authenticatedProfile,
  bonsaiBalance,
  post,
  postData,
  onShare,
  onClick,
  className = "",
  showDropdown,
  setShowDropdown,
  showCollectModal,
  setShowCollectModal
}) => {
  const { isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [collectAmount, setCollectAmount] = useState<string>();
  const [isCollecting, setIsCollecting] = useState(false);
  const [hasCollected, setHasCollected] = useState<boolean>(post.operations?.hasSimpleCollected || false);
  const collectButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const category = post.metadata.attributes?.find(({ key }) => key === "templateCategory");
  const mediaUrl = post.metadata.attributes?.find(({ key }) => key === "apiUrl");
  const isCreator = post.author.address === authenticatedProfile?.address;
  const [amountNeeded, setAmountNeeded] = useState<bigint>(0n);
  const [isOpenTopUpModal, setIsOpenTopUpModal] = useState(false);

  const isCollect = useMemo(() => {
    const { payToCollect } = post?.actions?.find(action => action.__typename === "SimpleCollectAction") || {};

    if (payToCollect) {
      setCollectAmount(payToCollect.amount?.value);
      return payToCollect.amount?.asset.contract.address === PROTOCOL_DEPLOYMENT.lens.Bonsai;
    }

    return false;
  }, [post]);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClick?.();
    }
  };

  const handleButtonClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
  };

  const handleMouseLeave = () => {
    setShowCollectModal(false);
    setShowDropdown(false);
  };

  const onCollect = async () => {
    if (hasCollected) return;
    let toastId;
    try {
      toastId = toast.loading("Collecting post...");

      if (LENS_CHAIN_ID !== chain?.id && switchChain) {
        try {
          await switchChain(configureChainsConfig, { chainId: LENS_CHAIN_ID });
        } catch {
          toast.error("Please switch networks to collect", { id: toastId });
          return;
        }
      }
      const sessionClient = await resumeSession();
      if (!sessionClient) throw new Error("Not authenticated");

      const amountNeeded = await checkCollectAmount(
        walletClient,
        collectAmount || "0",
        authenticatedProfile?.address as `0x${string}`,
        bonsaiBalance || BigInt(0)
      );
      setAmountNeeded(amountNeeded);

      if (amountNeeded > 0n) {
        setIsOpenTopUpModal(true);
        toast("Add BONSAI to your Lens account wallet to collect", { id: toastId });
        setIsCollecting(false);
        return;
      }

      const collected = await collectPost(
        sessionClient,
        walletClient,
        post.id
      );

      if (!collected) throw new Error("Failed to collect");
      toast.success("Added to collection", { id: toastId });
      setHasCollected(true);
    } catch (error) {
      console.log(error);
      toast.error("Failed to collect", { id: toastId });
    }

    setIsCollecting(false);
  }

  const collectorsText = useMemo(() => {
    if (!!postData?.actors?.length) {
      const word = postData.actors.length === 1 ? "has" : "have";
      return postData.actors.map(actor => `@${actor.account.username?.localName}`).join(', ') + ` ${word} joined`;
    }
    return ""
  }, [postData?.actors]);

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{ willChange: "opacity" }}
      onClick={handleBackgroundClick}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dark background overlay */}
      <div
        className="absolute inset-0 bg-black/50 cursor-pointer rounded-3xl"
        onClick={handleBackgroundClick}
      />

      {/* Top overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-30">
        <div className="space-y-2">
          {category && (
            <div className="rounded-full bg-dark-grey text-white h-10 flex items-center px-3 w-fit pointer-events-none select-none">
              <span className="-ml-2 pointer-events-none">
                <SparkIcon color="#fff" height={14} />
              </span>
              <span className="pointer-events-none text-sm ml-1">
                {category.value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
              </span>
            </div>
          )}
        </div>

        <div className="self-start">
          {isCollect && (
            <Button
              variant={hasCollected ? "dark-grey" : "accentBrand"}
              ref={collectButtonRef}
              size="md"
              className={`text-base font-bold rounded-lg gap-x-1 md:px-2 py-[5px] focus:outline-none focus:ring-0 ${hasCollected ? 'cursor-default': ''}`}
              onClick={(e) => handleButtonClick(e, () => { if (!hasCollected) setShowCollectModal(true) })}
            >
              {!hasCollected ? (
                <>
                  <BookmarkAddOutlined />
                  Collect
                </>
              ) : (
                <>
                  <BookmarkOutlined />
                </>
              )}
            </Button>
          )}
          <CollectModal
            showCollectModal={showCollectModal}
            onCollect={onCollect}
            bonsaiBalance={bonsaiBalance}
            collectAmount={collectAmount}
            anchorEl={collectButtonRef.current}
            setShowCollectModal={setShowCollectModal}
            isCollecting={isCollecting}
            isMedia
            account={authenticatedProfile?.address}
          />

          <DropdownMenu
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            anchorEl={dropdownButtonRef.current}
            placement="top-end"
            postId={post.id}
            postSlug={post.slug}
            isCreator={isCreator}
            mediaUrl={mediaUrl?.value}
          />
        </div>
      </div>

      {/* Bottom overlay LEFT */}
      <div className="absolute bottom-4 left-4 flex space-x-2 z-30">
        <div className={`rounded-full bg-dark-grey text-white h-10 flex items-center ${!!postData?.actors?.length ? "pr-1" : ""}`}>
          <div className="min-w-[2.5rem] px-3 flex items-center justify-center gap-1 pointer-events-none">
            {hasCollected ? <BookmarkOutlined sx={{ color: '#fff', fontSize: '1rem' }} /> : <BookmarkBorder sx={{ color: '#fff', fontSize: '1rem' }} />}
            {post.stats.collects > 0 ? <Subtitle className="text-base">{post.stats.collects || 0}</Subtitle> : null}
          </div>
          {!!postData?.actors?.length && (
            <Tooltip message={collectorsText} direction="top" classNames="z-100">
              <div className="flex -space-x-2">
                {postData?.actors?.map(({ account }, index: number) => (
                  <img
                    key={index}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-dark-grey"
                    src={account.metadata?.picture || "/default.png"}
                    alt="avatar"
                  />
                ))}
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-4 right-4 flex space-x-2 z-30">
        <button
          className="rounded-full bg-white hover:bg-gray-200 h-10 w-10 flex items-center justify-center"
          onClick={(e) => handleButtonClick(e, onShare)}
        >
          <NewShareIcon color="#000" height={16} />
        </button>

        {/* Not showing media mutations for creators here, we need the full object on the post page */}
        {!isCreator && (
          <div className="relative">
            <button
              ref={dropdownButtonRef}
              className="rounded-full bg-white hover:bg-gray-200 h-10 w-10 flex items-center justify-center outline-none"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
            >
              <MoreHoriz sx={{ color: '#000' }} />
            </button>
          </div>
        )}
      </div>

      {/* Top Up Modal */}
      <Modal
        onClose={() => setIsOpenTopUpModal(false)}
        open={isOpenTopUpModal}
        setOpen={setIsOpenTopUpModal}
        panelClassnames="w-screen h-screen md-plus:h-full p-4 text-secondary"
        static
      >
        <TopUpModal switchNetwork={() => {}} onClose={() => setIsOpenTopUpModal(false)} requiredAmount={Number(formatEther(amountNeeded))} />
      </Modal>
    </div>
  )
}