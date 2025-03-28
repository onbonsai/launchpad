import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { addPostNotInterested, reportPost } from "@lens-protocol/client/actions";
import { FlagOutlined, RemoveCircle, RefreshOutlined } from "@mui/icons-material";
import { postId as toPostId, PostReportReason, SessionClient } from '@lens-protocol/client';
import { resumeSession } from '@src/hooks/useLensLogin';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { SparkIcon } from '../Icons/SparkIcon';
import { requestPostUpdate } from '@src/services/madfi/studio';

type ViewState = 'initial' | 'report' | 'notInterested' | 'refresh';

export default ({
  showDropdown,
  setShowDropdown,
  anchorEl,
  placement = "bottom-end",
  isCreator,
  postId,
  postSlug,
  mediaUrl
}) => {
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

  const onRefreshMetadata = async () => {
    try {
      let idToken;
      const sessionClient = await resumeSession(true);
      if (!sessionClient) {
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

      const success = await requestPostUpdate(mediaUrl, postSlug, idToken);
      if (!success) throw new Error("Result not successful");

      setShowDropdown(false);
      setCurrentView('initial');
      toast.success("Post update requested");
    } catch (error) {
      console.log(error);
      toast.error("Post update failed to send");
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

  const renderContent = () => {
    if (isCreator) {
      switch (currentView) {
        case 'refresh':
          return (
            <>
              <div className="px-4 py-3 text-center text-sm">
                Generate a post update
              </div>
              <div className="border-t border-white/10">
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-primary"
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

        default:
          return (
            <button
              className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 flex items-center"
              onClick={() => setCurrentView('refresh')}
            >
              <SparkIcon color="#000" height={16} />
              <span className="ml-2">Refresh post</span>
            </button>
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
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-primary"
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
              <RemoveCircle sx={{ fontSize: '1.25rem', marginTop: "-4px", color: "#000" }} />
              <span className="ml-2">Not interested</span>
            </button>
            <button
              className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
              onClick={() => setCurrentView('report')}
            >
              <FlagOutlined sx={{ fontSize: '1.25rem', color: "#000" }} />
              <span className="ml-2">Report</span>
            </button>
          </>
        );
    }
  };

  // nothing for the creator to do if the media api url is not present
  if (isCreator && !mediaUrl) return null;

  return (
    <Popper
      open={showDropdown}
      anchorEl={anchorEl}
      placement={currentView === "report" ? "bottom-end" : placement}
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
          className="w-48 bg-white rounded-xl shadow-lg overflow-clip font-sf-pro-text text-black"
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
            setCurrentView("initial");
          }}
        >
          {renderContent()}
        </div>
      </ClickAwayListener>
    </Popper>
  );
};