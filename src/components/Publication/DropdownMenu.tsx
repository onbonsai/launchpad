import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { addPostNotInterested, reportPost } from "@lens-protocol/client/actions";
import { FlagOutlined, RemoveCircle, RefreshOutlined, Block } from "@mui/icons-material";
import { postId as toPostId, PostReportReason, SessionClient } from '@lens-protocol/client';
import { resumeSession } from '@src/hooks/useLensLogin';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { SparkIcon } from '../Icons/SparkIcon';
import { requestPostUpdate, requestPostDisable, SmartMedia, SmartMediaStatus } from '@src/services/madfi/studio';

type ViewState = 'initial' | 'report' | 'notInterested' | 'refresh' | 'disable';

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
}: DropdownMenuProps) => {
  const [currentView, setCurrentView] = useState<ViewState>('initial');

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

      const success = await requestPostUpdate(mediaUrl, postSlug, idToken);
      if (!success) throw new Error("Result not successful");

      setShowDropdown(false);
      setCurrentView('initial');
      toast.success("Update requested, please wait up to 60 seconds", { duration: 5000 });
    } catch (error) {
      console.log(error);
      toast.error("Update failed to send");
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
                Request a post update
              </div>
              <div className="border-t border-white/10">
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={(e) => handleButtonClick(e, onRefreshMetadata)}
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
        case 'disable':
          return (
            <>
              <div className="px-4 py-3 text-center text-sm">
                Disable post updates
              </div>
              <div className="border-t border-white/10">
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-brand-highlight"
                  onClick={(e) => handleButtonClick(e, onDisableMetadata)}
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
        default:
          return (
            <>
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 flex items-center"
                onClick={() => setCurrentView('refresh')}
              >
                <div className="w-4 flex items-center justify-center">
                  <SparkIcon color="rgba(255,255,255,0.8)" height={16} />
                </div>
                <span className="ml-2">
                  Update Post
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

      default:
        return (
          <>
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
          className="w-48 bg-dark-grey rounded-xl shadow-lg overflow-clip font-sf-pro-text text-white/80"
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