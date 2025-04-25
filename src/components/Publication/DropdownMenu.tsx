import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { addPostNotInterested, deletePost, reportPost } from "@lens-protocol/client/actions";
import { FlagOutlined, RemoveCircle, Block, AccountBalanceWallet, Star, StarBorderOutlined, StarOutline} from "@mui/icons-material";
import { postId as toPostId, PostReportReason, SessionClient } from '@lens-protocol/client';
import { resumeSession } from '@src/hooks/useLensLogin';
import toast from 'react-hot-toast';
import { useEffect, useMemo, useState } from 'react';
import { SparkIcon } from '../Icons/SparkIcon';
import { requestPostUpdate, requestPostDisable, SmartMedia, SmartMediaStatus, SET_FEATURED_ADMINS, setFeatured } from '@src/services/madfi/studio';
import { CreditBalance, useGetCredits } from '@src/hooks/useGetCredits';
import { useAccount, useBalance, useWalletClient } from 'wagmi';
import { handleOperationWith } from "@lens-protocol/client/viem";
import { useGetRewardPool } from '@src/hooks/useMoneyClubs';
import { kFormatter } from '@src/utils/utils';
import { formatEther, parseEther } from 'viem';
import { approveToken, topUpRewards, withdrawRewards } from '@src/services/madfi/moneyClubs';
import { PROTOCOL_DEPLOYMENT } from '@src/services/madfi/utils';

type ViewState = 'initial' | 'report' | 'notInterested' | 'refresh' | 'disable' | 'delete' | 'rewards' | 'topup' | 'feature';

interface DropdownMenuProps {
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  anchorEl: HTMLElement | null;
  placement?: "bottom-end" | "top-end";
  isCreator: boolean;
  postId: string;
  postSlug: string;
  mediaUrl?: string;
  media?: SmartMedia;
  token?: {
    address: `0x${string}`;
    ticker: string;
  }
  onRequestGeneration: () => void;
  creditBalance?: CreditBalance;
  insufficientCredits?: boolean;
}

export default ({
  showDropdown,
  setShowDropdown,
  anchorEl,
  placement = "bottom-end",
  isCreator,
  postId,
  postSlug,
  mediaUrl,
  media,
  token,
  onRequestGeneration,
  creditBalance,
  insufficientCredits,
}: DropdownMenuProps) => {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: rewardPoolData, isLoading: isLoadingRewards } = useGetRewardPool(token?.address as `0x${string}`);
  const { data: balance } = useBalance({
    address: address,
    token: token?.address,
  });
  const [topUpAmount, setTopUpAmount] = useState('');
  const [currentView, setCurrentView] = useState<ViewState>('initial');
  const [isFeatured, setIsFeatured] = useState(media?.featured || false);
  const showFeaturedToggle = useMemo(() => address && SET_FEATURED_ADMINS.includes(address?.toLowerCase()) && mediaUrl?.includes("onbons.ai"), [mediaUrl, address]);

  const handleButtonClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
  };

  const handleClickAway = () => {
    setShowDropdown(false);
    setCurrentView('initial');
  };

  const onHide = async () => {
    try {
      const sessionClient = await resumeSession(true);
      if (!sessionClient) {
        toast.error("Not authenticated");
        return;
      }

      const result = await addPostNotInterested(sessionClient, {
        post: toPostId(postId)
      });
      if (result.isErr()) throw new Error("Result failed");

      setShowDropdown(false);
      setCurrentView('initial');
      toast("Post marked not interested");
    } catch (error) {
      console.log(error);
      toast.error("Failed");
    }
  };

  const handleReport = async (reason: PostReportReason) => {
    try {
      const sessionClient = await resumeSession(true);
      if (!sessionClient) {
        toast.error("Not authenticated");
        return;
      }

      const result = await reportPost(sessionClient, {
        reason,
        post: toPostId(postId),
      });
      if (result.isErr()) throw new Error("Result failed");

      setShowDropdown(false);
      setCurrentView('initial');
      toast("Post reported");
    } catch (error) {
      console.log(error);
      toast.error("Failed");
    }
  };

  const handleDelete = async () => {
    let toastId;
    try {
      const sessionClient = await resumeSession(true);
      if (!sessionClient) {
        toast.error("Not authenticated");
        return;
      }

      toastId = toast.loading("Deleting post...");

      const result = await deletePost(sessionClient, {
        post: toPostId(postId),
      }).andThen(handleOperationWith(walletClient));
      if (result.isErr()) throw new Error("Result failed");

      setShowDropdown(false);
      setCurrentView('initial');
      toast("Post deleted", { id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed");
    }
  };

  const getIdToken = async (sessionClient: SessionClient): Promise<string | undefined> => {
    const creds = await sessionClient.getCredentials();
    if (creds.isOk()) {
      return creds.value?.idToken;
    } else {
      toast.error("Failed to get credentials");
      return undefined;
    }
  };

  const onRefreshMetadata = async () => {
    try {
      let idToken;
      const sessionClient = await resumeSession(true);
      if (!sessionClient) {
        toast.error("Not authenticated");
        return;
      }
      idToken = await getIdToken(sessionClient as SessionClient);
      if (!idToken) return;

      await requestPostUpdate(mediaUrl as string, postSlug, idToken);
      onRequestGeneration();

      setShowDropdown(false);
      setCurrentView('initial');
      toast.success("Update requested, please wait up to 60 seconds", { duration: 5000 });
    } catch (error) {
      console.log(error);
      if (error instanceof Error && error.message === "not enough credits") {
        toast.error("Not enough credits to update post", { duration: 5000 });
      } else {
        toast.error("Update failed to send");
      }
    }
  };

  const onDisableMetadata = async () => {
    try {
      let idToken;
      const sessionClient = await resumeSession(true);
      if (!sessionClient) {
        toast.error("Not authenticated");
        return;
      }
      idToken = await getIdToken(sessionClient as SessionClient);
      if (!idToken) return;

      const success = await requestPostDisable(mediaUrl, postSlug, idToken);
      if (!success) throw new Error("Result not successful");

      setShowDropdown(false);
      setCurrentView('initial');
      toast.success("Post disabled");
    } catch (error) {
      console.log(error);
      toast.error("Failed to disable post");
    }
  };

  const handleWithdrawRewards = async () => {
    let toastId = toast.loading("Withdrawing rewards...");
    try {
      await withdrawRewards(walletClient, token?.address as `0x${string}`);
      toast.success("Rewards withdrawn", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to withdraw rewards", { id: toastId });
    }
  };

  const handleTopUpRewards = async () => {
    if (!topUpAmount || isNaN(Number(topUpAmount)) || Number(topUpAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amount = parseEther(topUpAmount);
    if (amount > (balance?.value || 0n)) {
      toast.error("Insufficient balance");
      return;
    }

    let toastId = toast.loading("Topping up rewards...");
    try {
      await approveToken(token?.address as `0x${string}`, amount, walletClient, toastId, "Approving token", "lens", PROTOCOL_DEPLOYMENT.lens.RewardSwap, true);
      await topUpRewards(walletClient, token?.address as `0x${string}`, amount);
      toast.success("Rewards topped up", { id: toastId });
      setTopUpAmount('');
      setCurrentView('rewards');
    } catch (error) {
      toast.error("Failed to top up rewards", { id: toastId });
    }
  };

  const handleFeatured = async () => {
    if (!showFeaturedToggle) {
      toast.error("Not admin or not a bonsai media");
      return;
    }

    const sessionClient = await resumeSession(true);
    if (!sessionClient) return;

    const creds = await sessionClient.getCredentials();

    let idToken;
    if (creds.isOk()) {
      idToken = creds.value?.idToken;
    } else {
      toast.error("Must be logged in");
    }

    let toastId = toast.loading(!!media?.featured ? `Setting post as ${isFeatured ? 'not featured' : 'featured'}` : 'Toggling featured');
    try {
      const res = await setFeatured(idToken, postSlug, media?.featured);
      if (res) {
        toast.success("Success", { id: toastId });
        setIsFeatured(!isFeatured);
      } else toast.error("Failed to featured", { id: toastId });
    } catch (error) {
      toast.error("Failed to set featured", { id: toastId });
    }
  }

  useEffect(() => {
    if (!showDropdown) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
        setCurrentView('initial');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [setShowDropdown, showDropdown]);

  const excludedReasons = [
    PostReportReason.AnimalAbuse,
    PostReportReason.UnauthorizedSale,
    PostReportReason.SelfHarm,
    PostReportReason.Repetitive,
    PostReportReason.Impersonation,
    PostReportReason.Misleading,
    PostReportReason.MisuseHashtags,
    PostReportReason.Unrelated,
    PostReportReason.ManipulationAlgo,
    PostReportReason.FakeEngagement,
  ];

  const reportReasons = Object.values(PostReportReason)
    .filter(reason => !excludedReasons.includes(reason))
    .map(reason => ({
      value: reason,
      label: reason.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    }));

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const renderContent = () => {
    if (isCreator) {
      switch (currentView) {
        case 'refresh':
          return (
            <>
              <div className="px-4 py-3 text-center text-sm">
                Request a generation?
                {media?.estimatedCost && <span className="ml-1"><br />~ {media.estimatedCost.toFixed(2)} credits</span>}
              </div>
              <div className="border-t border-white/10">
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-brand-highlight"
                  onClick={(e) => handleButtonClick(e, onRefreshMetadata)}
                >
                  Generate
                </button>
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={() => setCurrentView('initial')}
                >
                  Cancel
                </button>
              </div>
            </>
          );
        case 'disable':
          return (
            <>
              <div className="px-4 py-3 text-center text-sm">
                Disable post updates?
              </div>
              <div className="border-t border-white/10">
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-bearish"
                  onClick={(e) => handleButtonClick(e, onDisableMetadata)}
                >
                  Disable
                </button>
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={() => setCurrentView('initial')}
                >
                  Cancel
                </button>
              </div>
            </>
          );
        case 'delete':
          return (
            <>
              <div className="px-4 py-3 text-center text-sm">
                Delete this post?
              </div>
              <div className="border-t border-white/10">
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-bearish"
                  onClick={(e) => handleButtonClick(e, () => handleDelete(PostReportReason.Spam))}
                >
                  Delete
                </button>
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={() => setCurrentView('initial')}
                >
                  Cancel
                </button>
              </div>
            </>
          );
        case 'topup':
          return (
            <>
              <div className="px-4 py-3 text-center text-sm">
                Top Up Rewards
              </div>
              <div className="border-t border-white/10">
                <div className="px-4 py-3 text-sm">
                  <div className="text-gray-400">Your Balance</div>
                  <div className="text-lg font-semibold">
                    {balance ? `${kFormatter(Number(formatEther(balance.value)), true)} ${token?.ticker}` : 'Loading...'}
                  </div>
                </div>
                <div className="px-4 py-2">
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder={`Amount in ${token?.ticker}`}
                    className="w-full px-3 py-2 bg-black/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-highlight"
                    min="0"
                    step="0.000000000000000001"
                  />
                </div>
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-brand-highlight"
                  onClick={(e) => handleButtonClick(e, handleTopUpRewards)}
                >
                  Confirm Top Up
                </button>
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={() => setCurrentView('rewards')}
                >
                  Cancel
                </button>
              </div>
            </>
          );
        case 'rewards':
          return (
            <>
              <div className="px-4 py-3 text-center text-sm">
                Manage Trading Rewards
              </div>
              <div className="border-t border-white/10">
                <div className="px-4 py-3 text-sm">
                  <div className="text-gray-400">Current Balance</div>
                  <div className="text-lg font-semibold">
                    {isLoadingRewards ? 'Loading...' : `${kFormatter(Number(formatEther(rewardPoolData?.rewardsAmount || 0n)), true)} ${token?.ticker}`}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Total Paid: {isLoadingRewards ? 'Loading...' : `${kFormatter(Number(formatEther(rewardPoolData?.totalRewardsPaid || 0n)), true)} ${token?.ticker}`}
                  </div>
                </div>
                {(rewardPoolData?.rewardsAmount || 0n) > 0n && (
                  <button
                    className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-brand-highlight"
                    onClick={(e) => handleButtonClick(e, handleWithdrawRewards)}
                  >
                    Withdraw Rewards
                  </button>
                )}
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={() => setCurrentView('topup')}
                >
                  Top Up Rewards
                </button>
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={() => setCurrentView('initial')}
                >
                  Cancel
                </button>
              </div>
            </>
          );
        default:
          return (
            <>
              {showFeaturedToggle && (
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={handleFeatured}
                >
                  {!isFeatured
                    ? <Star sx={{ fontSize: '1rem', marginTop: "-4px", color: "rgba(255,255,255,0.8)" }} />
                    : <StarOutline sx={{ fontSize: '1rem', marginTop: "-4px", color: "rgba(255,255,255,0.8)" }} />
                  }
                  <span className="ml-2">{media?.featured ? (!isFeatured ? "Feature" : "Remove Feature") : 'Toggle featured'}</span>
                </button>
              )}
              <button
                className={`w-full py-3 px-4 text-left flex items-center ${!insufficientCredits ? 'cursor-pointer hover:bg-black/10' : 'cursor-not-allowed opacity-50'}`}
                onClick={() => !insufficientCredits && setCurrentView('refresh')}
              >
                <div className="w-4 flex items-center justify-center">
                  <SparkIcon color="rgba(255,255,255,0.8)" height={16} />
                </div>
                <span className="ml-2">
                  {!insufficientCredits ? 'Post generation' : 'Insufficient credits to update'}
                </span>
              </button>
              {media?.status === SmartMediaStatus.ACTIVE && (
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 flex items-center"
                  onClick={() => setCurrentView('disable')}
                >
                  <div className="w-4 flex items-center justify-center">
                    <Block sx={{ fontSize: '1rem', color: "rgba(255,255,255,0.8)" }} />
                  </div>
                  <span className="ml-2">Disable Updates</span>
                </button>
              )}
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 flex items-center"
                onClick={() => setCurrentView('delete')}
              >
                <div className="w-4 flex items-center justify-center">
                  <RemoveCircle sx={{ fontSize: '1rem', color: "currentColor" }} />
                </div>
                <span className="ml-2">Delete Post</span>
              </button>
              {token?.address && (
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 flex items-center"
                  onClick={() => setCurrentView('rewards')}
                >
                  <div className="w-4 flex items-center justify-center">
                    <AccountBalanceWallet sx={{ fontSize: '1rem', color: "rgba(255,255,255,0.8)" }} />
                  </div>
                  <span className="ml-2">Manage Rewards</span>
                </button>
              )}
              {media && (
                <div className="px-4 py-2 flex items-center justify-end border-t border-white/10">
                  <div className="relative flex items-center justify-center w-3 h-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(media.status)}`} />
                    {media.status?.toLowerCase() !== 'disabled' && (
                      <div
                        className={`absolute w-3 h-3 rounded-full ${getStatusColor(media.status)}`}
                        style={{
                          animation: 'ripple 1.5s linear infinite',
                          opacity: '0.5'
                        }}
                      />
                    )}
                    <style jsx>{`
                      @keyframes ripple {
                        0% {
                          transform: scale(0.8);
                          opacity: 0.5;
                        }
                        100% {
                          transform: scale(1);
                          opacity: 0;
                        }
                      }
                    `}</style>
                  </div>
                  <span className="ml-1.5 text-xs capitalize">{media.status || 'Status Unknown'}</span>
                </div>
              )}
            </>
          );
      }
    }

    switch (currentView) {
      case 'notInterested':
        return (
          <>
            <div className="px-4 py-3 text-center text-sm">
              Mark as not interested
            </div>
            <div className="border-t border-white/10">
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-brand-highlight"
                onClick={(e) => handleButtonClick(e, onHide)}
              >
                Confirm
              </button>
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                onClick={() => setCurrentView('initial')}
              >
                Cancel
              </button>
            </div>
          </>
        );

      case 'report':
        return (
          <>
            <div className="px-4 py-3 text-center text-sm">
              Choose a reason
            </div>
            <div className="border-t border-white/10">
              {reportReasons.map(({ value, label }) => (
                <button
                  key={value}
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={(e) => handleButtonClick(e, () => handleReport(value))}
                >
                  {label}
                </button>
              ))}
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 border-t border-white/10"
                onClick={() => setCurrentView('initial')}
              >
                Cancel
              </button>
            </div>
          </>
        );

      case 'delete':
        return (
          <>
            <div className="px-4 py-3 text-center text-sm">
              Delete this post?
            </div>
            <div className="border-t border-white/10">
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-red-500"
                onClick={(e) => handleButtonClick(e, () => handleDelete(PostReportReason.Spam))}
              >
                Delete
              </button>
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                onClick={() => setCurrentView('initial')}
              >
                Cancel
              </button>
            </div>
          </>
        );

      default:
        return (
          <>
            {showFeaturedToggle && (
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                onClick={handleFeatured}
              >
                {!isFeatured
                  ? <Star sx={{ fontSize: '1rem', marginTop: "-4px", color: "rgba(255,255,255,0.8)" }} />
                  : <StarOutline sx={{ fontSize: '1rem', marginTop: "-4px", color: "rgba(255,255,255,0.8)" }} />
                }
                <span className="ml-2">{media?.featured ? (!isFeatured ? "Feature" : "Remove Feature") : 'Toggle featured'}</span>
              </button>
            )}
            <button
              className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
              onClick={() => setCurrentView('notInterested')}
            >
              <RemoveCircle sx={{ fontSize: '1rem', marginTop: "-4px", color: "rgba(255,255,255,0.8)" }} />
              <span className="ml-2">Not interested</span>
            </button>
            <button
              className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
              onClick={() => setCurrentView('report')}
            >
              <FlagOutlined sx={{ fontSize: '1rem', color: "rgba(255,255,255,0.8)" }} />
              <span className="ml-2">Report</span>
            </button>
          </>
        );
    }
  };

  if (isCreator && !mediaUrl) return null;

  return (
    <Popper
      open={showDropdown}
      anchorEl={anchorEl}
      placement={currentView === "report" ? "bottom-end" : placement as any}
      className="z-50 pt-2 pb-2"
      modifiers={[
        {
          name: 'eventListeners',
          options: {
            scroll: false,
            resize: true,
          },
        },
      ]}
    >
      <ClickAwayListener
        onClickAway={handleClickAway}
        mouseEvent="onMouseDown"
        touchEvent="onTouchStart"
      >
        <div
          className="w-48 bg-dark-grey rounded-lg shadow-lg overflow-clip font-sf-pro-text text-white/80"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => {
            e.stopPropagation();
            const parentGroup = anchorEl?.closest('.group');
            if (parentGroup) {
              parentGroup.classList.add('hover');
            }
          }}
          onMouseLeave={(e) => {
            if (!showDropdown) {
              const parentGroup = anchorEl?.closest('.group');
              if (parentGroup) {
                parentGroup.classList.remove('hover');
              }
            }
          }}
        >
          {renderContent()}
        </div>
      </ClickAwayListener>
    </Popper>
  );
};