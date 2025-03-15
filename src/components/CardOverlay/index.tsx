import { BookmarkAddOutlined, BookmarkOutlined, MoreHoriz } from "@mui/icons-material";
import { useEffect, useMemo, useState } from "react"
import { NewShareIcon } from "../Share/NewShareIcon";
import { Button } from "../Button";
import { Post } from "@lens-protocol/client";
import { PROTOCOL_DEPLOYMENT } from "@src/services/madfi/utils";

interface CardOverlayProps {
  profileName?: string;
  post: Post;
  onCollect: (postId: string) => void;
  onShare?: () => void;
  onHide?: () => void;
  onReport?: () => void;
  onClick?: () => void;
  className?: string;
}

export const CardOverlay: React.FC<CardOverlayProps> = ({
  profileName,
  post,
  onCollect,
  onShare,
  onHide,
  onReport,
  onClick,
  className = "",
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const hasCollected = post?.operations?.hasSimpleCollected;

  const isCollect = useMemo(() => {
    const simpleCollect = post?.actions?.find(action => action.__typename === "SimpleCollectAction");

    if (simpleCollect) {
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

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{ willChange: "opacity" }}
      onClick={handleBackgroundClick}
    >
      {/* Dark background overlay */}
      <div
        className="absolute inset-0 bg-black/80 cursor-pointer rounded-3xl"
        onClick={handleBackgroundClick}
      />

      {/* Top overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-30">
        <div></div>
        {/* <button
          className="flex items-center bg-black/50 text-white hover:bg-black/60 rounded-full px-4 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          {profileName}
        </button> */}

        {isCollect && (
          <Button
            variant="accentBrand"
            size="md"
            className={`text-base font-bold rounded-xl gap-x-1 md:px-2 py-[10px] ${hasCollected ? 'cursor-default bg-dark-grey text-white hover:bg-dark-grey' : ''}`}
            onClick={(e) => handleButtonClick(e, () => onCollect(post.id))}
          >
            {!hasCollected ? (
              <>
                <BookmarkAddOutlined />
                Collect
              </>
            ): (
              <>
                <BookmarkOutlined />
                Collected
              </>
            )}
          </Button>
        )}
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