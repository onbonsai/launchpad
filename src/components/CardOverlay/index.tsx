import { BookmarkAddOutlined, BookmarkOutlined, BookmarkBorder, MoreHoriz } from "@mui/icons-material";
import { useEffect, useMemo, useState, useRef } from "react"
import { switchChain } from "@wagmi/core";
import { Account, Post } from "@lens-protocol/client";
import toast from "react-hot-toast";
import { useAccount, useWalletClient } from "wagmi";
import { NewShareIcon } from "../Share/NewShareIcon";
import { Button } from "../Button";
import { LENS_CHAIN_ID, PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";
import { configureChainsConfig } from "@src/utils/wagmi";
import { resumeSession } from "@src/hooks/useLensLogin";
import { collectPost } from "@src/services/lens/collect";
import CollectModal from "@src/components/Publication/CollectModal";
import { Subtitle } from "@src/styles/text";
import { Tooltip } from "@src/components/Tooltip";

interface CardOverlayProps {
  authenticatedProfile?: Account | null;
  bonsaiBalance?: bigint;
  post: Post;
  postData?: { actors: any[] };
  onShare?: () => void;
  onHide?: () => void;
  onReport?: () => void;
  onClick?: () => void;
  className?: string;
}

export const CardOverlay: React.FC<CardOverlayProps> = ({
  authenticatedProfile,
  bonsaiBalance,
  post,
  postData,
  onShare,
  onHide,
  onReport,
  onClick,
  className = "",
}) => {
  const { isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [collectAmount, setCollectAmount] = useState<string>();
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasCollected, setHasCollected] = useState<boolean>(post.operations?.hasSimpleCollected || false);
  const collectButtonRef = useRef<HTMLButtonElement>(null);

  const isCollect = useMemo(() => {
    const simpleCollect = post?.actions?.find(action => action.__typename === "SimpleCollectAction");

    if (simpleCollect) {
      setCollectAmount(simpleCollect.amount?.value);
      return simpleCollect.amount?.asset.contract.address === PROTOCOL_DEPLOYMENT.lens.Bonsai;
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

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (showDropdown && event.key === 'Escape') {
        setShowDropdown(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showDropdown]);

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
      return postData.actors.map(actor => `@${actor.account.username.localName}`).join(', ') + ` ${word} joined`;
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
        className="absolute inset-0 bg-black/80 cursor-pointer rounded-3xl"
        onClick={handleBackgroundClick}
      />

      {/* Top overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-30">
        <div></div>
        {/* TODO: do we show the author profile here instead of in the root post? */}
        {/* <button
          className="flex items-center bg-black/50 text-white hover:bg-black/60 rounded-full px-4 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          {post.author.username}
        </button> */}

        {isCollect && (
          <div className="relative">
            <Button
              variant="accentBrand"
              ref={collectButtonRef}
              size="md"
              className={`text-base font-bold rounded-xl gap-x-1 md:px-2 py-[10px] ${hasCollected ? 'cursor-default bg-dark-grey text-white hover:bg-dark-grey' : ''}`}
              onClick={(e) => handleButtonClick(e, () => { if (!hasCollected) setShowCollectModal(true)})}
            >
              {!hasCollected ? (
                <>
                  <BookmarkAddOutlined />
                  Collect
                </>
              ): (
                <>
                  <BookmarkOutlined />
                  Joined
                </>
              )}
            </Button>
            {showCollectModal && (
              <CollectModal
                onCollect={onCollect}
                bonsaiBalance={bonsaiBalance}
                collectAmount={collectAmount}
                anchorEl={collectButtonRef.current}
                onClose={() => setShowCollectModal(false)}
                isCollecting={isCollecting}
                isMedia
                account={authenticatedProfile?.address}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom overlay LEFT */}
      <div className="absolute bottom-4 left-4 flex space-x-2 z-30">
        <div className={`rounded-full bg-white h-10 flex items-center ${!!postData?.actors?.length ? "pr-1" : ""}`}>
          <div className="min-w-[2.5rem] px-3 flex items-center justify-center gap-1">
            {hasCollected ? <BookmarkOutlined sx={{ color: '#000', fontSize: '1rem' }} /> : <BookmarkBorder sx={{ color: '#000', fontSize: '1rem' }}/>}
            {post.stats.collects > 0 ? <Subtitle className="text-base text-black">{post.stats.collects}</Subtitle> : null}
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

        <div className="relative">
          <button
            className="rounded-full bg-white hover:bg-gray-200 h-10 w-10 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
          >
            <MoreHoriz sx={{ color: '#000' }} />
          </button>

          {showDropdown && (
            <div
              className="absolute bottom-12 right-0 w-48 bg-dark-grey rounded-xl shadow-lg overflow-clip"
              onClick={(e) => e.stopPropagation()}
            >
              {/* <div className="py-2 px-4 text-center border-b border-gray-100">
                <p className="text-sm text-gray-700">This Pin was inspired by your recent activity</p>
              </div> */}
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-white/10"
                onClick={(e) => handleButtonClick(e, onHide)}
              >
                Not Interested
              </button>
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-white/10"
                onClick={(e) => handleButtonClick(e, onReport)}
              >
                Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}