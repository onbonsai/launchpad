import { More, MoreHoriz, Share } from "@mui/icons-material";
import { useState } from "react"
import { ShareIcon } from "../Share/ShareIcon";

interface CardOverlayProps {
  profileName?: string;
  onSave?: () => void;
  onShare?: () => void;
  onHide?: () => void;
  onDownload?: () => void;
  onReport?: () => void;
  onClick?: () => void;
  className?: string;
}

export const CardOverlay: React.FC<CardOverlayProps> = ({
  profileName = "Profile",
  onSave,
  onShare,
  onHide,
  onDownload,
  onReport,
  onClick,
  className = "",
}) => {
  const [showDropdown, setShowDropdown] = useState(false)

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClick?.();
    }
  };

  const handleButtonClick = (e: React.MouseEvent, callback?: () => void) => {
    e.stopPropagation();
    callback?.();
  };

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
        <button
          className="flex items-center bg-black/50 text-white hover:bg-black/60 rounded-full px-4 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          {profileName}
        </button>

        <button
          className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 py-2"
          onClick={(e) => handleButtonClick(e, onSave)}
        >
          Collect
        </button>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-4 right-4 flex space-x-2 z-30">
        <button
          className="rounded-full bg-white hover:bg-gray-100 h-10 w-10 flex items-center justify-center"
          onClick={(e) => handleButtonClick(e, onShare)}
        >
          <ShareIcon color="#000" height={16} />
        </button>

        <div className="relative">
          <button
            className="rounded-full bg-white hover:bg-gray-100 h-10 w-10 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
          >
            <MoreHoriz sx={{ color: '#000' }} />
          </button>

          {showDropdown && (
            <div
              className="absolute bottom-12 right-0 w-56 bg-white rounded-xl shadow-lg text-black overflow-clip"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-2 px-4 text-center border-b border-gray-100">
                <p className="text-sm text-gray-700">This Pin was inspired by your recent activity</p>
              </div>
              <button
                className="w-full py-3 px-4 text-left hover:bg-gray-50 cursor-pointer"
                onClick={(e) => handleButtonClick(e, onHide)}
              >
                Hide Pin
              </button>
              <button
                className="w-full py-3 px-4 text-left hover:bg-gray-50 cursor-pointer"
                onClick={(e) => handleButtonClick(e, onDownload)}
              >
                Download image
              </button>
              <button
                className="w-full py-3 px-4 text-left hover:bg-gray-50 cursor-pointer"
                onClick={(e) => handleButtonClick(e, onReport)}
              >
                Report Pin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}