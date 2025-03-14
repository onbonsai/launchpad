import { useState } from "react"
// import { ChevronDown, MoreHorizontal, Share } from "lucide-react"

interface CardOverlayProps {
  profileName?: string;
  onSave?: () => void;
  onShare?: () => void;
  onHide?: () => void;
  onDownload?: () => void;
  onReport?: () => void;
}

export const CardOverlay: React.FC<CardOverlayProps> = ({
  profileName = "Profile",
  onSave,
  onShare,
  onHide,
  onDownload,
  onReport,
}) => {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <>
      {/* Top overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-30">
        <button className="flex items-center bg-black/50 text-white hover:bg-black/60 rounded-full px-4 py-2">
          {profileName}
        </button>

        <button
          className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 py-2"
          onClick={onSave}
        >
          Collect
        </button>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-4 right-4 flex space-x-2 z-30">
        <button
          className="rounded-full bg-white hover:bg-gray-100 h-10 w-10 flex items-center justify-center"
          onClick={onShare}
        >
          Share
        </button>

        <div className="relative">
          <button
            className="rounded-full bg-white hover:bg-gray-100 h-10 w-10 flex items-center justify-center"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            •••
          </button>

          {showDropdown && (
            <div className="absolute bottom-12 right-0 w-56 bg-white rounded-xl shadow-lg">
              <div className="py-2 px-4 text-center border-b border-gray-100">
                <p className="text-sm text-gray-700">This Pin was inspired by your recent activity</p>
              </div>
              <button
                className="w-full py-3 px-4 text-left hover:bg-gray-50 cursor-pointer"
                onClick={onHide}
              >
                Hide Pin
              </button>
              <button
                className="w-full py-3 px-4 text-left hover:bg-gray-50 cursor-pointer"
                onClick={onDownload}
              >
                Download image
              </button>
              <button
                className="w-full py-3 px-4 text-left hover:bg-gray-50 cursor-pointer"
                onClick={onReport}
              >
                Report Pin
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}