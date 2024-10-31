import Popper from "@mui/material/Popper";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import { addPostNotInterested, deletePost, reportPost } from "@lens-protocol/client/actions";
import { FlagOutlined, RemoveCircle, Download } from "@mui/icons-material";
import { postId as toPostId, PostReportReason } from "@lens-protocol/client";
import { resumeSession } from "@src/hooks/useLensLogin";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { SmartMedia, ELIZA_API_URL } from "@src/services/madfi/studio";
import { useAccount, useWalletClient } from "wagmi";
import { handleOperationWith } from "@lens-protocol/client/viem";

type ViewState =
  | "initial"
  | "report"
  | "notInterested"
  | "refresh"
  | "disable"
  | "delete"
  | "rewards"
  | "topup"
  | "feature";

interface DropdownMenuProps {
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  anchorEl: HTMLElement | null;
  placement?: "bottom-end" | "top-end";
  isCreator: boolean;
  postId: string;
  postSlug: string;
  mediaUrl?: string;
  videoUrl?: string;
  media?: SmartMedia;
  token?: {
    address: `0x${string}`;
    ticker: string;
  };
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
  videoUrl,
  media,
  token,
}: DropdownMenuProps) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [currentView, setCurrentView] = useState<ViewState>("initial");
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);

  const handleButtonClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
  };

  const handleClickAway = () => {
    setShowDropdown(false);
    setCurrentView("initial");
  };

  const onHide = async () => {
    try {
      const sessionClient = await resumeSession(true);
      if (!sessionClient) {
        toast.error("Not authenticated");
        return;
      }

      const result = await addPostNotInterested(sessionClient, {
        post: toPostId(postId),
      });
      if (result.isErr()) throw new Error("Result failed");

      setShowDropdown(false);
      setCurrentView("initial");
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
      setCurrentView("initial");
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
      setCurrentView("initial");
      toast("Post deleted", { id: toastId });
    } catch (error) {
      console.log(error);
      toast.error("Failed");
    }
  };

  const handleVideoDownload = async () => {
    if (!videoUrl || isDownloadingVideo) return;

    setIsDownloadingVideo(true);
    let toastId = toast.loading("Downloading video...");

    try {
      const response = await fetch(ELIZA_API_URL + "/video/add-outro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl,
          filename: `bonsai-video-${Date.now()}.mp4`,
          isBlob: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Failed to process video");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bonsai-video-${postSlug}-${Date.now()}.mp4`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Video downloaded!", { id: toastId });
      setShowDropdown(false);
    } catch (error) {
      console.error("Video download failed:", error);
      toast.error("Video download failed", { id: toastId, duration: 3000 });
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  useEffect(() => {
    if (!showDropdown) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDropdown(false);
        setCurrentView("initial");
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
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
    .filter((reason) => !excludedReasons.includes(reason))
    .map((reason) => ({
      value: reason,
      label: reason
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" "),
    }));

  const renderContent = () => {
    if (isCreator) {
      switch (currentView) {
        case "delete":
          return (
            <>
              <div className="px-4 py-3 text-center text-sm">Delete this post?</div>
              <div className="border-t border-white/10">
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-bearish"
                  onClick={(e) => handleButtonClick(e, handleDelete)}
                >
                  Delete
                </button>
                <button
                  className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                  onClick={() => setCurrentView("initial")}
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
                onClick={() => setCurrentView("delete")}
              >
                <div className="w-4 flex items-center justify-center">
                  <RemoveCircle sx={{ fontSize: "1rem", color: "currentColor" }} />
                </div>
                <span className="ml-2">Delete Post</span>
              </button>
              {videoUrl && (
                <button
                  className={`w-full py-3 px-4 text-left flex items-center ${
                    isDownloadingVideo ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-black/10"
                  }`}
                  onClick={(e) => handleButtonClick(e, handleVideoDownload)}
                  disabled={isDownloadingVideo}
                >
                  <div className="w-4 flex items-center justify-center">
                    <Download sx={{ fontSize: "1rem", color: "rgba(255,255,255,0.8)" }} />
                  </div>
                  <span className="ml-2">{isDownloadingVideo ? "Downloading..." : "Download video"}</span>
                </button>
              )}
            </>
          );
      }
    }

    switch (currentView) {
      case "notInterested":
        return (
          <>
            <div className="px-4 py-3 text-center text-sm">Mark as not interested</div>
            <div className="border-t border-white/10">
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-brand-highlight"
                onClick={(e) => handleButtonClick(e, onHide)}
              >
                Confirm
              </button>
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                onClick={() => setCurrentView("initial")}
              >
                Cancel
              </button>
            </div>
          </>
        );

      case "report":
        return (
          <>
            <div className="px-4 py-3 text-center text-sm">Choose a reason</div>
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
                onClick={() => setCurrentView("initial")}
              >
                Cancel
              </button>
            </div>
          </>
        );

      case "delete":
        return (
          <>
            <div className="px-4 py-3 text-center text-sm">Delete this post?</div>
            <div className="border-t border-white/10">
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10 text-red-500"
                onClick={(e) => handleButtonClick(e, handleDelete)}
              >
                Delete
              </button>
              <button
                className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
                onClick={() => setCurrentView("initial")}
              >
                Cancel
              </button>
            </div>
          </>
        );

      default:
        return (
          <>
            {videoUrl && (
              <button
                className={`w-full py-3 px-4 text-left flex items-center ${
                  isDownloadingVideo ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-black/10"
                }`}
                onClick={(e) => handleButtonClick(e, handleVideoDownload)}
                disabled={isDownloadingVideo}
              >
                <div className="w-4 flex items-center justify-center">
                  <Download sx={{ fontSize: "1rem", color: "rgba(255,255,255,0.8)" }} />
                </div>
                <span className="ml-2">{isDownloadingVideo ? "Downloading..." : "Download video"}</span>
              </button>
            )}
            <button
              className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
              onClick={() => setCurrentView("notInterested")}
            >
              <RemoveCircle sx={{ fontSize: "1rem", marginTop: "-4px", color: "rgba(255,255,255,0.8)" }} />
              <span className="ml-2">Not interested</span>
            </button>
            <button
              className="w-full py-3 px-4 text-left cursor-pointer hover:bg-black/10"
              onClick={() => setCurrentView("report")}
            >
              <FlagOutlined sx={{ fontSize: "1rem", color: "rgba(255,255,255,0.8)" }} />
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
      placement={currentView === "report" ? "bottom-end" : (placement as any)}
      className="z-50 pt-2 pb-2"
      modifiers={[
        {
          name: "eventListeners",
          options: {
            scroll: false,
            resize: true,
          },
        },
      ]}
    >
      <ClickAwayListener onClickAway={handleClickAway} mouseEvent="onMouseDown" touchEvent="onTouchStart">
        <div
          className="w-48 bg-dark-grey rounded-lg shadow-lg overflow-clip font-sf-pro-text text-white/80"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={(e) => {
            e.stopPropagation();
            const parentGroup = anchorEl?.closest(".group");
            if (parentGroup) {
              parentGroup.classList.add("hover");
            }
          }}
          onMouseLeave={(e) => {
            if (!showDropdown) {
              const parentGroup = anchorEl?.closest(".group");
              if (parentGroup) {
                parentGroup.classList.remove("hover");
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
